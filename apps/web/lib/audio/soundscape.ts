/**
 * Haptic & Spatial Web Audio Soundscape Engine
 * Spec: docs/Drape/features/FEAT-011.md
 * Issue: #64
 *
 * Procedural Web Audio API sound generator evoking a luxury cutting salon atmosphere:
 * - Velocity-modulated cloth friction / rustle synthesizer synchronized with WebGPU drag gestures (<20ms latency)
 * - Tactile scissor snip audio cue triggered when passing yardage cut increments
 * - Persistent mute toggle state stored in localStorage; honors system prefers-reduced-motion: reduce
 * - Autoplay policy compliance: AudioContext starts suspended until first deliberate user canvas gesture
 * - Spatial stereo panning and zero-allocation hot path
 */

import {
  AudioEngineState,
  FabricAudioProfile,
  FrictionParams,
  ScissorSnipParams,
  SoundscapeOptions,
} from './types';
import {
  createWhiteNoiseBuffer,
  createPinkNoiseBuffer,
  createBrownianNoiseBuffer,
} from './noise';

export const STORAGE_KEY_MUTED = 'drape_soundscape_muted';

/**
 * Built-in acoustic fabric profiles calibrated for physical drape & friction characteristics.
 * Cited in FEAT-011 (raw silk, chiffon, wool crepe, linen, velvet, brocade, satin).
 */
export const FABRIC_AUDIO_PROFILES: Record<string, FabricAudioProfile> = {
  silk: {
    id: 'silk',
    name: 'Raw Silk',
    baseFilterFreq: 1800,
    maxFilterFreq: 5200,
    filterQ: 3.2,
    noiseType: 'white',
    gainScale: 0.85,
    frictionDecay: 0.12,
  },
  'silk-chiffon': {
    id: 'silk-chiffon',
    name: 'Silk Chiffon',
    baseFilterFreq: 2200,
    maxFilterFreq: 6400,
    filterQ: 3.8,
    noiseType: 'white',
    gainScale: 0.75,
    frictionDecay: 0.1,
  },
  'silk-jacquard': {
    id: 'silk-jacquard',
    name: 'Silk Jacquard',
    baseFilterFreq: 1500,
    maxFilterFreq: 4800,
    filterQ: 2.8,
    noiseType: 'white',
    gainScale: 0.9,
    frictionDecay: 0.14,
  },
  wool: {
    id: 'wool',
    name: 'Wool Crepe',
    baseFilterFreq: 320,
    maxFilterFreq: 1400,
    filterQ: 1.5,
    noiseType: 'pink',
    gainScale: 1.15,
    frictionDecay: 0.18,
  },
  'charcoal-wool': {
    id: 'charcoal-wool',
    name: 'Charcoal Wool Twill',
    baseFilterFreq: 350,
    maxFilterFreq: 1500,
    filterQ: 1.6,
    noiseType: 'pink',
    gainScale: 1.1,
    frictionDecay: 0.17,
  },
  'camel-cashmere': {
    id: 'camel-cashmere',
    name: 'Camel Cashmere',
    baseFilterFreq: 280,
    maxFilterFreq: 1200,
    filterQ: 1.4,
    noiseType: 'pink',
    gainScale: 1.05,
    frictionDecay: 0.2,
  },
  linen: {
    id: 'linen',
    name: 'Raw Linen',
    baseFilterFreq: 750,
    maxFilterFreq: 2900,
    filterQ: 2.2,
    noiseType: 'pink',
    gainScale: 0.95,
    frictionDecay: 0.14,
  },
  'raw-linen': {
    id: 'raw-linen',
    name: 'Belgian Raw Linen',
    baseFilterFreq: 800,
    maxFilterFreq: 3100,
    filterQ: 2.3,
    noiseType: 'pink',
    gainScale: 1.0,
    frictionDecay: 0.15,
  },
  'heritage-linen': {
    id: 'heritage-linen',
    name: 'Heritage Spun Linen',
    baseFilterFreq: 780,
    maxFilterFreq: 3000,
    filterQ: 2.1,
    noiseType: 'pink',
    gainScale: 0.98,
    frictionDecay: 0.15,
  },
  velvet: {
    id: 'velvet',
    name: 'Obsidian Velvet',
    baseFilterFreq: 450,
    maxFilterFreq: 1800,
    filterQ: 2.0,
    noiseType: 'pink',
    gainScale: 1.0,
    frictionDecay: 0.22,
    harmonicOvertoneFreq: 380,
  },
  'obsidian-velvet': {
    id: 'obsidian-velvet',
    name: 'Obsidian Cotton Velvet',
    baseFilterFreq: 450,
    maxFilterFreq: 1800,
    filterQ: 2.0,
    noiseType: 'pink',
    gainScale: 1.0,
    frictionDecay: 0.22,
    harmonicOvertoneFreq: 380,
  },
  brocade: {
    id: 'brocade',
    name: 'Gold Brocade',
    baseFilterFreq: 1200,
    maxFilterFreq: 4600,
    filterQ: 2.9,
    noiseType: 'white',
    gainScale: 0.9,
    frictionDecay: 0.15,
  },
  'gold-brocade': {
    id: 'gold-brocade',
    name: 'Venetian Gold Brocade',
    baseFilterFreq: 1200,
    maxFilterFreq: 4600,
    filterQ: 2.9,
    noiseType: 'white',
    gainScale: 0.9,
    frictionDecay: 0.15,
  },
  'ivory-satin': {
    id: 'ivory-satin',
    name: 'Ivory Duchess Satin',
    baseFilterFreq: 1400,
    maxFilterFreq: 4200,
    filterQ: 2.6,
    noiseType: 'white',
    gainScale: 0.8,
    frictionDecay: 0.11,
  },
  'champagne-cupro': {
    id: 'champagne-cupro',
    name: 'Champagne Cupro Twill',
    baseFilterFreq: 1300,
    maxFilterFreq: 3900,
    filterQ: 2.4,
    noiseType: 'white',
    gainScale: 0.82,
    frictionDecay: 0.12,
  },
  default: {
    id: 'default',
    name: 'Atelier Textile Default',
    baseFilterFreq: 800,
    maxFilterFreq: 3000,
    filterQ: 2.0,
    noiseType: 'pink',
    gainScale: 0.9,
    frictionDecay: 0.15,
  },
};

export class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private isMutedState: boolean = true;
  private isUnlockedState: boolean = false;
  private currentFabricId: string = 'silk';
  private currentProfile: FabricAudioProfile = FABRIC_AUDIO_PROFILES['silk'];

  private masterVolume: number = 0.7;
  private ambientVolume: number = 0.12;
  private isAmbientActive: boolean = false;

  // Master Graph
  private masterGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;

  // Ambient Room Tone Graph
  private ambientGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private ambientOscA: OscillatorNode | null = null;
  private ambientOscB: OscillatorNode | null = null;
  private ambientOscGain: GainNode | null = null;

  // Friction Synthesizer Nodes (Zero-Allocation Hot-Path)
  private frictionWhiteSource: AudioBufferSourceNode | null = null;
  private frictionPinkSource: AudioBufferSourceNode | null = null;
  private frictionWhiteGain: GainNode | null = null;
  private frictionPinkGain: GainNode | null = null;
  private frictionFilter: BiquadFilterNode | null = null;
  private frictionGain: GainNode | null = null;
  private frictionPanner: StereoPannerNode | PannerNode | null = null;

  // Reduced motion media query listener
  private reducedMotionMediaQuery: MediaQueryList | null = null;
  private handleReducedMotionChange: ((e: MediaQueryListEvent | MediaQueryList) => void) | null = null;

  // Event subscribers
  private subscribers: Set<(state: AudioEngineState) => void> = new Set();

  constructor(options?: SoundscapeOptions) {
    if (options?.masterVolume !== undefined) {
      this.masterVolume = Math.max(0, Math.min(1, options.masterVolume));
    }
    if (options?.ambientVolume !== undefined) {
      this.ambientVolume = Math.max(0, Math.min(1, options.ambientVolume));
    }

    this.init(options?.audioContext, options?.ambientEnabled ?? true);
  }

  /**
   * Initializes audio graph, restores stored mute preference,
   * inspects system reduced-motion, and honors browser autoplay policy.
   */
  private init(customContext?: AudioContext, ambientEnabled: boolean = true): void {
    // 1. Accessibility & Persistence Inspection
    let storedMute: boolean | null = null;
    let reducedMotionMatches = false;

    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(STORAGE_KEY_MUTED);
        if (item !== null) {
          storedMute = item === 'true';
        }
      } catch {
        // Ignore localStorage access failures (e.g. private browsing sandbox)
      }

      if (window.matchMedia) {
        try {
          this.reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
          reducedMotionMatches = this.reducedMotionMediaQuery.matches;

          this.handleReducedMotionChange = (e: MediaQueryListEvent | MediaQueryList) => {
            if (e.matches) {
              this.setMuted(true);
            }
          };

          if (this.reducedMotionMediaQuery.addEventListener) {
            this.reducedMotionMediaQuery.addEventListener('change', this.handleReducedMotionChange);
          } else if ((this.reducedMotionMediaQuery as unknown as { addListener: (cb: (e: MediaQueryList) => void) => void }).addListener) {
            (this.reducedMotionMediaQuery as unknown as { addListener: (cb: (e: MediaQueryList) => void) => void }).addListener(this.handleReducedMotionChange);
          }
        } catch {
          // Ignore matchMedia errors in unsupported environments
        }
      }
    }

    // Default to muted if user previously muted, or if reduced-motion is requested.
    // Otherwise, default to unmuted (ready to play when unmuted or user unlocks).
    if (storedMute !== null) {
      this.isMutedState = storedMute;
    } else if (reducedMotionMatches) {
      this.isMutedState = true;
    } else {
      // Default initial state: unmuted in settings, waiting for user gesture unlock
      this.isMutedState = false;
    }

    // 2. AudioContext Instantiation & Autoplay Compliance
    try {
      if (customContext) {
        this.ctx = customContext;
      } else if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
    } catch {
      this.ctx = null;
    }

    if (!this.ctx) {
      return; // Graceful degradation: silent fallback (NFR-012)
    }

    // Ensure AudioContext starts in suspended state until user interaction
    if (this.ctx.state === 'running') {
      try {
        this.ctx.suspend().catch(() => {});
      } catch {
        // Ignore suspend rejection
      }
      this.isUnlockedState = false;
    } else {
      this.isUnlockedState = false;
    }

    this.buildGraph(ambientEnabled);
  }

  /**
   * Constructs Web Audio node topology.
   */
  private buildGraph(ambientEnabled: boolean): void {
    if (!this.ctx) return;

    try {
      // Master Limiter / Compressor (eliminates digital clipping and adds warm analog sheen)
      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.masterCompressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.masterCompressor.release.setValueAtTime(0.15, this.ctx.currentTime);
      this.masterCompressor.connect(this.ctx.destination);

      // Master Gain
      this.masterGain = this.ctx.createGain();
      const initialGain = this.isMutedState ? 0 : this.masterVolume;
      this.masterGain.gain.setValueAtTime(initialGain, this.ctx.currentTime);
      this.masterGain.connect(this.masterCompressor);

      // ── Cloth Friction Synthesizer Subsystem (Zero-Allocation Loopers) ──
      const whiteBuffer = createWhiteNoiseBuffer(this.ctx, 2.0);
      const pinkBuffer = createPinkNoiseBuffer(this.ctx, 2.0);

      this.frictionWhiteSource = this.ctx.createBufferSource();
      this.frictionWhiteSource.buffer = whiteBuffer;
      this.frictionWhiteSource.loop = true;

      this.frictionPinkSource = this.ctx.createBufferSource();
      this.frictionPinkSource.buffer = pinkBuffer;
      this.frictionPinkSource.loop = true;

      this.frictionWhiteGain = this.ctx.createGain();
      this.frictionWhiteGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.frictionPinkGain = this.ctx.createGain();
      this.frictionPinkGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.frictionFilter = this.ctx.createBiquadFilter();
      this.frictionFilter.type = 'bandpass';
      this.frictionFilter.frequency.setValueAtTime(this.currentProfile.baseFilterFreq, this.ctx.currentTime);
      this.frictionFilter.Q.setValueAtTime(this.currentProfile.filterQ, this.ctx.currentTime);

      this.frictionGain = this.ctx.createGain();
      this.frictionGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      // Spatial Stereo Panner
      if (typeof this.ctx.createStereoPanner === 'function') {
        this.frictionPanner = this.ctx.createStereoPanner();
        (this.frictionPanner as StereoPannerNode).pan.setValueAtTime(0.0, this.ctx.currentTime);
      } else {
        // Fallback for Safari without StereoPannerNode
        this.frictionPanner = this.ctx.createPanner();
        (this.frictionPanner as PannerNode).panningModel = 'equalpower';
      }

      this.frictionWhiteSource.connect(this.frictionWhiteGain);
      this.frictionPinkSource.connect(this.frictionPinkGain);
      this.frictionWhiteGain.connect(this.frictionFilter);
      this.frictionPinkGain.connect(this.frictionFilter);
      this.frictionFilter.connect(this.frictionGain);
      this.frictionGain.connect(this.frictionPanner);
      this.frictionPanner.connect(this.masterGain);

      // Start looping noise sources
      this.frictionWhiteSource.start(0);
      this.frictionPinkSource.start(0);

      // ── Ambient Salon Room Tone Subsystem ──
      if (ambientEnabled) {
        this.buildAmbientGraph();
      }
    } catch {
      // Audio graph setup error fallback
    }
  }

  /**
   * Constructs procedural ambient salon room tone graph.
   * Evokes a calm, hushed Parisian atelier cutting salon.
   */
  private buildAmbientGraph(): void {
    if (!this.ctx || !this.masterGain) return;

    try {
      const brownianBuffer = createBrownianNoiseBuffer(this.ctx, 3.0);
      this.ambientNoiseSource = this.ctx.createBufferSource();
      this.ambientNoiseSource.buffer = brownianBuffer;
      this.ambientNoiseSource.loop = true;

      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
      this.ambientFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.ambientVolume, this.ctx.currentTime);

      this.ambientNoiseSource.connect(this.ambientFilter);
      this.ambientFilter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      // Subtle harmonic undertones (A1 55Hz & A2 110Hz warm room resonance)
      this.ambientOscA = this.ctx.createOscillator();
      this.ambientOscA.type = 'sine';
      this.ambientOscA.frequency.setValueAtTime(55, this.ctx.currentTime);

      this.ambientOscB = this.ctx.createOscillator();
      this.ambientOscB.type = 'sine';
      this.ambientOscB.frequency.setValueAtTime(110.2, this.ctx.currentTime); // 0.2Hz detune produces gentle acoustic warmth

      this.ambientOscGain = this.ctx.createGain();
      this.ambientOscGain.gain.setValueAtTime(0.015, this.ctx.currentTime); // ultra subtle

      this.ambientOscA.connect(this.ambientOscGain);
      this.ambientOscB.connect(this.ambientOscGain);
      this.ambientOscGain.connect(this.ambientFilter);

      this.ambientNoiseSource.start(0);
      this.ambientOscA.start(0);
      this.ambientOscB.start(0);
      this.isAmbientActive = true;
    } catch {
      // Silent degradation
    }
  }

  /**
   * Resumes AudioContext on deliberate user canvas gesture.
   * Satisfies browser autoplay compliance and FEAT-011 acceptance criteria.
   */
  public async unlock(): Promise<boolean> {
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
        this.isUnlockedState = true;
        this.notifySubscribers();
        return true;
      } catch {
        return false;
      }
    }

    this.isUnlockedState = true;
    this.notifySubscribers();
    return true;
  }

  /**
   * Checks whether the audio context is unlocked and active.
   */
  public isUnlocked(): boolean {
    return this.isUnlockedState && this.ctx?.state === 'running';
  }

  /**
   * Velocity-modulated cloth friction / rustle synthesizer synchronized with WebGPU drag gestures.
   * Latency target: <20ms latency.
   *
   * @param params.velocity Normalized drag velocity (0.0 to 1.0) or pixel velocity in px/s
   * @param params.fabricType Optional fabric ID to switch resonance (silk, wool, linen, velvet, etc.)
   * @param params.pan Optional stereo panning (-1.0 to 1.0)
   */
  public modulateFriction(params: FrictionParams): void {
    if (!this.ctx || this.isMutedState || !this.frictionGain || !this.frictionFilter) {
      return;
    }

    if (params.fabricType && params.fabricType !== this.currentFabricId) {
      this.setFabric(params.fabricType);
    }

    const profile = this.currentProfile;
    const now = this.ctx.currentTime;

    // Normalize velocity to [0, 1]
    const v = Math.max(0, Math.min(1.0, params.velocity > 1.0 ? params.velocity / 1200 : params.velocity));

    if (v <= 0.005) {
      // Near-zero velocity: smooth ramp to silence within <15ms
      this.frictionGain.gain.cancelScheduledValues(now);
      this.frictionGain.gain.setTargetAtTime(0.0, now, 0.012);
      return;
    }

    // Perceptual frequency scaling: higher velocity opens up upper harmonics of the cloth weave
    // f(v) = baseFreq + (maxFreq - baseFreq) * v^0.75
    const targetFreq = profile.baseFilterFreq + (profile.maxFilterFreq - profile.baseFilterFreq) * Math.pow(v, 0.75);

    // Target gain modulated by velocity and fabric scale
    const targetGain = Math.min(1.0, Math.pow(v, 0.7) * profile.gainScale);

    // Schedule parameter automations directly onto the AudioParams with zero heap allocations
    // Time constant of 0.012s (12ms) guarantees responsive feel under 20ms without clicks
    this.frictionFilter.frequency.cancelScheduledValues(now);
    this.frictionFilter.frequency.setTargetAtTime(targetFreq, now, 0.012);

    this.frictionGain.gain.cancelScheduledValues(now);
    this.frictionGain.gain.setTargetAtTime(targetGain, now, 0.012);

    // Spatial panning update
    if (params.pan !== undefined && this.frictionPanner) {
      const clampedPan = Math.max(-1.0, Math.min(1.0, params.pan));
      if ('pan' in this.frictionPanner) {
        this.frictionPanner.pan.cancelScheduledValues(now);
        this.frictionPanner.pan.setTargetAtTime(clampedPan, now, 0.015);
      } else {
        (this.frictionPanner as PannerNode).positionX.setValueAtTime(clampedPan, now);
      }
    }
  }

  /**
   * Immediately stops friction rustle synthesis.
   */
  public stopFriction(): void {
    if (!this.ctx || !this.frictionGain) return;
    const now = this.ctx.currentTime;
    this.frictionGain.gain.cancelScheduledValues(now);
    this.frictionGain.gain.setTargetAtTime(0.0, now, 0.01);
  }

  /**
   * Tactile scissor snip audio cue triggered when passing yardage cut increments.
   * Accurately models the crisp physical shearing of heavy brass tailor shears.
   *
   * @param params Optional parameters including intensity and panning
   */
  public triggerScissorSnip(params?: ScissorSnipParams): void {
    if (!this.ctx || this.isMutedState || !this.masterGain || this.ctx.state !== 'running') {
      return;
    }

    const intensity = Math.max(0.1, Math.min(1.0, params?.intensity ?? 0.85));
    const now = this.ctx.currentTime;

    try {
      // 1. Transient shearing friction burst (high-passed noise)
      const snipNoiseBuffer = createWhiteNoiseBuffer(this.ctx, 0.05);
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = snipNoiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(4200, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      // Sharp 2ms attack, 30ms decay
      noiseGain.gain.exponentialRampToValueAtTime(0.7 * intensity, now + 0.002);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);

      // 2. Brass blade metallic harmonic ring (dual peaking filters at 2800Hz and 5400Hz)
      const ringOsc = this.ctx.createOscillator();
      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(2800, now);
      ringOsc.frequency.exponentialRampToValueAtTime(2400, now + 0.04);

      const ringGain = this.ctx.createGain();
      ringGain.gain.setValueAtTime(0.001, now);
      ringGain.gain.exponentialRampToValueAtTime(0.4 * intensity, now + 0.001);
      ringGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      ringOsc.connect(ringGain);

      // 3. Blade mechanical stop / haptic click (deep 180Hz transient)
      const thudOsc = this.ctx.createOscillator();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(220, now);
      thudOsc.frequency.exponentialRampToValueAtTime(65, now + 0.02);

      const thudGain = this.ctx.createGain();
      thudGain.gain.setValueAtTime(0.001, now);
      thudGain.gain.exponentialRampToValueAtTime(0.6 * intensity, now + 0.001);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      thudOsc.connect(thudGain);

      // Ephemeral Scissor Bus & Spatial Panning
      const scissorBus = this.ctx.createGain();
      scissorBus.gain.setValueAtTime(0.9, now);

      let scissorPanner: StereoPannerNode | null = null;
      if (params?.pan !== undefined && typeof this.ctx.createStereoPanner === 'function') {
        scissorPanner = this.ctx.createStereoPanner();
        scissorPanner.pan.setValueAtTime(Math.max(-1, Math.min(1, params.pan)), now);
      }

      noiseGain.connect(scissorBus);
      ringGain.connect(scissorBus);
      thudGain.connect(scissorBus);

      if (scissorPanner) {
        scissorBus.connect(scissorPanner);
        scissorPanner.connect(this.masterGain);
      } else {
        scissorBus.connect(this.masterGain);
      }

      // Start all cues
      noiseSource.start(now);
      ringOsc.start(now);
      thudOsc.start(now);

      // Stop and clean up after 50ms
      noiseSource.stop(now + 0.05);
      ringOsc.stop(now + 0.05);
      thudOsc.stop(now + 0.05);

      setTimeout(() => {
        try {
          noiseSource.disconnect();
          noiseFilter.disconnect();
          noiseGain.disconnect();
          ringOsc.disconnect();
          ringGain.disconnect();
          thudOsc.disconnect();
          thudGain.disconnect();
          scissorBus.disconnect();
          if (scissorPanner) scissorPanner.disconnect();
        } catch {
          // Ignore disconnection cleanup errors
        }
      }, 70);
    } catch {
      // Silent error recovery
    }
  }

  /**
   * Calibrates the soundscape to a specific fabric acoustic profile.
   *
   * @param fabricId Key matching FABRIC_AUDIO_PROFILES or fabric catalog id
   */
  public setFabric(fabricId: string): void {
    const profile = FABRIC_AUDIO_PROFILES[fabricId] || FABRIC_AUDIO_PROFILES['default'];
    this.currentFabricId = fabricId;
    this.currentProfile = profile;

    if (!this.ctx || !this.frictionFilter || !this.frictionWhiteGain || !this.frictionPinkGain) {
      return;
    }

    const now = this.ctx.currentTime;
    this.frictionFilter.frequency.setTargetAtTime(profile.baseFilterFreq, now, 0.02);
    this.frictionFilter.Q.setTargetAtTime(profile.filterQ, now, 0.02);

    // Crossfade noise generator sources
    if (profile.noiseType === 'white') {
      this.frictionWhiteGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.frictionPinkGain.gain.setTargetAtTime(0.0, now, 0.02);
    } else {
      this.frictionWhiteGain.gain.setTargetAtTime(0.0, now, 0.02);
      this.frictionPinkGain.gain.setTargetAtTime(1.0, now, 0.02);
    }

    this.notifySubscribers();
  }

  /**
   * Mute toggle controller with persistent state in localStorage.
   */
  public setMuted(muted: boolean): void {
    this.isMutedState = muted;

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      if (muted) {
        // Instant stop
        this.masterGain.gain.setValueAtTime(0, now);
      } else {
        // Smooth ramp to master volume
        this.masterGain.gain.setTargetAtTime(this.masterVolume, now, 0.02);
        // Auto-resume if needed
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      }
    }

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY_MUTED, muted ? 'true' : 'false');
      } catch {
        // Sandbox fallback
      }
    }

    this.notifySubscribers();
  }

  /**
   * Toggles mute state and persists choice.
   */
  public toggleMute(): boolean {
    const nextState = !this.isMutedState;
    this.setMuted(nextState);
    return nextState;
  }

  /**
   * Query current mute state.
   */
  public isMuted(): boolean {
    return this.isMutedState;
  }

  /**
   * Returns complete engine telemetry and accessibility state.
   */
  public getState(): AudioEngineState {
    return {
      isMuted: this.isMutedState,
      isSuspended: this.ctx ? this.ctx.state === 'suspended' : true,
      isUnlocked: this.isUnlockedState,
      ambientActive: this.isAmbientActive,
      currentFabric: this.currentFabricId,
      reducedMotionActive: this.reducedMotionMediaQuery?.matches ?? false,
    };
  }

  /**
   * Subscribes to engine state changes (mute toggle, unlock, fabric change).
   */
  public subscribe(callback: (state: AudioEngineState) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getState());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    const state = this.getState();
    for (const callback of this.subscribers) {
      try {
        callback(state);
      } catch {
        // Ignore subscriber exceptions
      }
    }
  }

  /**
   * Full teardown of audio nodes, context, and event listeners.
   */
  public dispose(): void {
    if (this.reducedMotionMediaQuery && this.handleReducedMotionChange) {
      if (this.reducedMotionMediaQuery.removeEventListener) {
        this.reducedMotionMediaQuery.removeEventListener('change', this.handleReducedMotionChange);
      } else if ((this.reducedMotionMediaQuery as unknown as { removeListener: (cb: (e: MediaQueryList) => void) => void }).removeListener) {
        (this.reducedMotionMediaQuery as unknown as { removeListener: (cb: (e: MediaQueryList) => void) => void }).removeListener(this.handleReducedMotionChange);
      }
    }

    try {
      this.frictionWhiteSource?.stop();
      this.frictionPinkSource?.stop();
      this.ambientNoiseSource?.stop();
      this.ambientOscA?.stop();
      this.ambientOscB?.stop();

      this.masterGain?.disconnect();
      this.masterCompressor?.disconnect();
      this.frictionGain?.disconnect();
      this.frictionFilter?.disconnect();
      this.ambientGain?.disconnect();

      if (this.ctx && this.ctx.state !== 'closed') {
        this.ctx.close().catch(() => {});
      }
    } catch {
      // Ignore cleanup error
    }

    this.subscribers.clear();
    this.ctx = null;
    this.isUnlockedState = false;
  }
}

/**
 * Singleton instance accessor for application-wide spatial audio.
 */
let soundscapeSingleton: SoundscapeEngine | null = null;

export function getSoundscapeEngine(options?: SoundscapeOptions): SoundscapeEngine {
  if (!soundscapeSingleton) {
    soundscapeSingleton = new SoundscapeEngine(options);
  }
  return soundscapeSingleton;
}

export function resetSoundscapeEngine(): void {
  if (soundscapeSingleton) {
    soundscapeSingleton.dispose();
    soundscapeSingleton = null;
  }
}
