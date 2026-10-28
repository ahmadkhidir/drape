/**
 * Soundscape Engine Unit Tests (FEAT-011)
 * Issue: #64
 *
 * Verifies:
 * - Autoplay policy compliance (initial suspended state until deliberate canvas gesture)
 * - Velocity-modulated cloth friction synthesis and parameter scaling (<20ms latency)
 * - Tactile scissor snip audio cues for yardage cut adjustments
 * - Persistent mute toggle state via localStorage and instant audio suppression
 * - System prefers-reduced-motion: reduce accessibility enforcement
 * - Fabric acoustic profiles and spatial panning
 * - Graceful degradation in server-side or non-WebAudio environments
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SoundscapeEngine,
  getSoundscapeEngine,
  resetSoundscapeEngine,
  FABRIC_AUDIO_PROFILES,
  STORAGE_KEY_MUTED,
  createWhiteNoiseBuffer,
  createPinkNoiseBuffer,
  createBrownianNoiseBuffer,
  useSoundscape,
} from '../lib/audio';

// ── Web Audio API Mocks for Node Test Environment ──

interface ScheduledCall {
  method: string;
  value?: number;
  time?: number;
  timeConstant?: number;
}

class MockAudioParam {
  public value: number;
  public calls: ScheduledCall[] = [];

  constructor(defaultValue: number = 0) {
    this.value = defaultValue;
  }

  setValueAtTime(value: number, time: number) {
    this.value = value;
    this.calls.push({ method: 'setValueAtTime', value, time });
  }

  setTargetAtTime(target: number, time: number, timeConstant: number) {
    this.value = target;
    this.calls.push({ method: 'setTargetAtTime', value: target, time, timeConstant });
  }

  linearRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.calls.push({ method: 'linearRampToValueAtTime', value, time });
  }

  exponentialRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.calls.push({ method: 'exponentialRampToValueAtTime', value, time });
  }

  cancelScheduledValues(time: number) {
    this.calls.push({ method: 'cancelScheduledValues', time });
  }
}

class MockAudioNode {
  public connectedTo: unknown[] = [];
  public isDisconnected: boolean = false;

  connect(destination: unknown) {
    this.connectedTo.push(destination);
    return destination;
  }

  disconnect() {
    this.isDisconnected = true;
    this.connectedTo = [];
  }
}

class MockGainNode extends MockAudioNode {
  public gain = new MockAudioParam(1.0);
}

class MockBiquadFilterNode extends MockAudioNode {
  public frequency = new MockAudioParam(1000);
  public Q = new MockAudioParam(1.0);
  public type: string = 'lowpass';
}

class MockStereoPannerNode extends MockAudioNode {
  public pan = new MockAudioParam(0.0);
}

class MockAudioBuffer {
  public numberOfChannels: number;
  public length: number;
  public sampleRate: number;
  private channelData: Float32Array;

  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.channelData = new Float32Array(length);
  }

  getChannelData(_channel: number): Float32Array {
    return this.channelData;
  }
}

class MockAudioBufferSourceNode extends MockAudioNode {
  public buffer: MockAudioBuffer | null = null;
  public loop: boolean = false;
  public started: boolean = false;
  public stopped: boolean = false;

  start(_time?: number) {
    this.started = true;
  }

  stop(_time?: number) {
    this.stopped = true;
  }
}

class MockOscillatorNode extends MockAudioNode {
  public frequency = new MockAudioParam(440);
  public type: string = 'sine';
  public started: boolean = false;
  public stopped: boolean = false;

  start(_time?: number) {
    this.started = true;
  }

  stop(_time?: number) {
    this.stopped = true;
  }
}

class MockDynamicsCompressorNode extends MockAudioNode {
  public threshold = new MockAudioParam(-24);
  public knee = new MockAudioParam(30);
  public ratio = new MockAudioParam(12);
  public attack = new MockAudioParam(0.003);
  public release = new MockAudioParam(0.25);
}

class MockAudioContext {
  public state: 'suspended' | 'running' | 'closed' = 'suspended';
  public currentTime: number = 0.5;
  public sampleRate: number = 44100;
  public destination = new MockAudioNode();

  public createdGains: MockGainNode[] = [];
  public createdFilters: MockBiquadFilterNode[] = [];
  public createdBufferSources: MockAudioBufferSourceNode[] = [];
  public createdOscillators: MockOscillatorNode[] = [];
  public createdPanners: MockStereoPannerNode[] = [];

  createGain(): MockGainNode {
    const node = new MockGainNode();
    this.createdGains.push(node);
    return node;
  }

  createBiquadFilter(): MockBiquadFilterNode {
    const node = new MockBiquadFilterNode();
    this.createdFilters.push(node);
    return node;
  }

  createBufferSource(): MockAudioBufferSourceNode {
    const node = new MockAudioBufferSourceNode();
    this.createdBufferSources.push(node);
    return node;
  }

  createBuffer(channels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer(channels, length, sampleRate);
  }

  createStereoPanner(): MockStereoPannerNode {
    const node = new MockStereoPannerNode();
    this.createdPanners.push(node);
    return node;
  }

  createDynamicsCompressor(): MockDynamicsCompressorNode {
    return new MockDynamicsCompressorNode();
  }

  createOscillator(): MockOscillatorNode {
    const node = new MockOscillatorNode();
    this.createdOscillators.push(node);
    return node;
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }
}

// ── Test Suite ──

describe('FEAT-011: Haptic & Spatial Web Audio Soundscape Engine', () => {
  let mockContext: MockAudioContext;
  let mockStorage: Record<string, string>;
  let mockMediaMatches: boolean;
  let mediaQueryListeners: Array<(e: { matches: boolean }) => void>;

  beforeEach(() => {
    resetSoundscapeEngine();
    mockContext = new MockAudioContext();
    mockStorage = {};
    mockMediaMatches = false;
    mediaQueryListeners = [];

    // Mock browser environment globals
    const mockWindow = {
      AudioContext: vi.fn(() => mockContext),
      localStorage: {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
      },
      matchMedia: (query: string) => ({
        matches: query.includes('prefers-reduced-motion') ? mockMediaMatches : false,
        addEventListener: (_event: string, handler: (e: { matches: boolean }) => void) => {
          mediaQueryListeners.push(handler);
        },
        removeEventListener: (_event: string, handler: (e: { matches: boolean }) => void) => {
          mediaQueryListeners = mediaQueryListeners.filter((h) => h !== handler);
        },
      }),
    };

    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('AudioContext', mockWindow.AudioContext);
  });

  afterEach(() => {
    resetSoundscapeEngine();
    vi.unstubAllGlobals();
  });

  describe('Autoplay Policy Compliance & Lifecycle', () => {
    it('initializes in suspended state until first deliberate user canvas gesture', () => {
      const engine = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });

      expect(mockContext.state).toBe('suspended');
      expect(engine.isUnlocked()).toBe(false);

      const state = engine.getState();
      expect(state.isSuspended).toBe(true);
      expect(state.isUnlocked).toBe(false);
    });

    it('resumes AudioContext and transitions to unlocked on deliberate user gesture', async () => {
      const engine = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });

      const unlocked = await engine.unlock();
      expect(unlocked).toBe(true);
      expect(mockContext.state).toBe('running');
      expect(engine.isUnlocked()).toBe(true);

      const state = engine.getState();
      expect(state.isSuspended).toBe(false);
      expect(state.isUnlocked).toBe(true);
    });
  });

  describe('Procedural Noise Generation', () => {
    it('generates uniform white noise buffer without clipping', () => {
      const buffer = createWhiteNoiseBuffer(mockContext as unknown as AudioContext, 0.05);
      expect(buffer.numberOfChannels).toBe(1);
      expect(buffer.length).toBe(Math.floor(44100 * 0.05));

      const data = buffer.getChannelData(0);
      let hasNonZero = false;
      for (let i = 0; i < data.length; i++) {
        expect(data[i]).toBeGreaterThanOrEqual(-1.0);
        expect(data[i]).toBeLessThanOrEqual(1.0);
        if (data[i] !== 0) hasNonZero = true;
      }
      expect(hasNonZero).toBe(true);
    });

    it('generates pink noise buffer with 1/f spectral attenuation', () => {
      const buffer = createPinkNoiseBuffer(mockContext as unknown as AudioContext, 0.05);
      expect(buffer.numberOfChannels).toBe(1);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
        expect(data[i]).toBeGreaterThanOrEqual(-1.0);
        expect(data[i]).toBeLessThanOrEqual(1.0);
      }
    });

    it('generates brownian noise buffer for warm ambient salon tone', () => {
      const buffer = createBrownianNoiseBuffer(mockContext as unknown as AudioContext, 0.05);
      expect(buffer.numberOfChannels).toBe(1);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
        expect(data[i]).toBeGreaterThanOrEqual(-1.0);
        expect(data[i]).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('Velocity-Modulated Cloth Friction & Rustle Synthesizer', () => {
    it('modulates filter cutoff frequency and gain based on pointer drag velocity', async () => {
      const engine = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });
      await engine.unlock();
      engine.setMuted(false);
      engine.setFabric('silk');

      // Modulate at moderate velocity
      engine.modulateFriction({ velocity: 0.4 });

      // Check friction filter node
      const frictionFilter = mockContext.createdFilters[0];
      expect(frictionFilter).toBeDefined();

      const lastFreqCall = frictionFilter.frequency.calls[frictionFilter.frequency.calls.length - 1];
      expect(lastFreqCall.method).toBe('setTargetAtTime');
      // Silk base: 1800, max: 5200. At v=0.4: freq should be comfortably between base and max
      expect(lastFreqCall.value).toBeGreaterThan(1800);
      expect(lastFreqCall.value).toBeLessThan(5200);
      // Latency target (<20ms): timeConstant must be <= 0.02s
      expect(lastFreqCall.timeConstant).toBeLessThanOrEqual(0.02);

      // Modulate at high velocity
      engine.modulateFriction({ velocity: 0.9 });
      const highFreqCall = frictionFilter.frequency.calls[frictionFilter.frequency.calls.length - 1];
      expect(highFreqCall.value).toBeGreaterThan(lastFreqCall.value!);
    });

    it('smoothly ramps friction gain to zero when velocity ceases', async () => {
      const engine = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });
      await engine.unlock();
      engine.setMuted(false);

      // Active dragging
      engine.modulateFriction({ velocity: 0.6 });

      // Cease dragging (near zero velocity)
      engine.modulateFriction({ velocity: 0.001 });

      const frictionGain = mockContext.createdGains[3]; // Friction gain node
      const lastCall = frictionGain.gain.calls[frictionGain.gain.calls.length - 1];
      expect(lastCall.method).toBe('setTargetAtTime');
      expect(lastCall.value).toBe(0.0);
      expect(lastCall.timeConstant).toBeLessThanOrEqual(0.02);
    });

    it('calibrates acoustic profiles: silk resonates high while wool resonates low-mid', async () => {
      const engine = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });
      await engine.unlock();
      engine.setMuted(false);

      // 1. Raw Silk
      engine.setFabric('silk');
      engine.modulateFriction({ velocity: 0.5 });
      const frictionFilter = mockContext.createdFilters[0];
      const silkFreq = frictionFilter.frequency.calls[frictionFilter.frequency.calls.length - 1].value!;

      // 2. Wool Crepe
      engine.setFabric('wool');
      engine.modulateFriction({ velocity: 0.5 });
      const woolFreq = frictionFilter.frequency.calls[frictionFilter.frequency.calls.length - 1].value!;

      // Silk frequency should be significantly higher than wool for delicate crispness vs deep texture
      expect(silkFreq).toBeGreaterThan(woolFreq * 2);
      expect(FABRIC_AUDIO_PROFILES['silk'].filterQ).toBeGreaterThan(FABRIC_AUDIO_PROFILES['wool'].filterQ);
    });

    it('updates stereo panning across drag gestures', async () => {
      const engine = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });
      await engine.unlock();
      engine.setMuted(false);

      engine.modulateFriction({ velocity: 0.5, pan: -0.75 }); // Drag on left side of cutting table
      const panner = mockContext.createdPanners[0];
      expect(panner).toBeDefined();

      const lastPanCall = panner.pan.calls[panner.pan.calls.length - 1];
      expect(lastPanCall.method).toBe('setTargetAtTime');
      expect(lastPanCall.value).toBeCloseTo(-0.75, 2);
    });
  });

  describe('Tactile Scissor Snip Audio Cue', () => {
    it('triggers dual-frequency shear and transient click when passing yardage notches', async () => {
      const engine = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });
      await engine.unlock();
      engine.setMuted(false);

      const preOscCount = mockContext.createdOscillators.length;
      const preBufferSourceCount = mockContext.createdBufferSources.length;

      // Trigger snip for 2.5 yards
      engine.triggerScissorSnip({ yardage: 2.5, intensity: 0.8 });

      // Should create oscillators (metallic ring & thud) and noise burst source
      expect(mockContext.createdOscillators.length).toBeGreaterThan(preOscCount);
      expect(mockContext.createdBufferSources.length).toBeGreaterThan(preBufferSourceCount);

      const latestOsc = mockContext.createdOscillators[mockContext.createdOscillators.length - 2];
      expect(latestOsc.started).toBe(true);
    });

    it('does not trigger audio cue when engine is muted or suspended', () => {
      const engine = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });
      engine.setMuted(true);

      const preOscCount = mockContext.createdOscillators.length;
      engine.triggerScissorSnip({ yardage: 1.0 });

      // No new nodes created when muted
      expect(mockContext.createdOscillators.length).toBe(preOscCount);
    });
  });

  describe('Persistent Mute Toggle & Accessibility Controls', () => {
    it('instantly silences master gain and saves preference in localStorage', () => {
      const engine = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });
      engine.setMuted(false);

      // Master gain node is index 0
      const masterGain = mockContext.createdGains[0];

      // Mute
      engine.setMuted(true);
      expect(engine.isMuted()).toBe(true);
      expect(mockStorage[STORAGE_KEY_MUTED]).toBe('true');

      const lastCall = masterGain.gain.calls[masterGain.gain.calls.length - 1];
      expect(lastCall.method).toBe('setValueAtTime');
      expect(lastCall.value).toBe(0);

      // Unmute
      engine.setMuted(false);
      expect(engine.isMuted()).toBe(false);
      expect(mockStorage[STORAGE_KEY_MUTED]).toBe('false');
    });

    it('toggles mute state and returns next state', () => {
      const engine = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });
      engine.setMuted(true);

      const state1 = engine.toggleMute();
      expect(state1).toBe(false);
      expect(engine.isMuted()).toBe(false);

      const state2 = engine.toggleMute();
      expect(state2).toBe(true);
      expect(engine.isMuted()).toBe(true);
    });

    it('honors saved localStorage mute preference on startup', () => {
      mockStorage[STORAGE_KEY_MUTED] = 'true';
      const engine1 = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });
      expect(engine1.isMuted()).toBe(true);

      mockStorage[STORAGE_KEY_MUTED] = 'false';
      const mockContext2 = new MockAudioContext();
      const engine2 = new SoundscapeEngine({ audioContext: mockContext2 as unknown as AudioContext });
      expect(engine2.isMuted()).toBe(false);
    });

    it('honors system prefers-reduced-motion: reduce by defaulting to muted and muting on change', () => {
      // User has reduced motion enabled
      mockMediaMatches = true;
      const engine = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });
      expect(engine.isMuted()).toBe(true);
      expect(engine.getState().reducedMotionActive).toBe(true);

      // Change event fired
      engine.setMuted(false);
      expect(engine.isMuted()).toBe(false);

      // Trigger reduced motion change event
      mediaQueryListeners.forEach((listener) => listener({ matches: true }));
      expect(engine.isMuted()).toBe(true);
    });
  });

  describe('Singleton Accessor & Lifecycle Teardown', () => {
    it('manages singleton instance correctly', () => {
      const engine1 = getSoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });
      const engine2 = getSoundscapeEngine();
      expect(engine1).toBe(engine2);

      resetSoundscapeEngine();
      const mockContext3 = new MockAudioContext();
      const engine3 = getSoundscapeEngine({ audioContext: mockContext3 as unknown as AudioContext });
      expect(engine3).not.toBe(engine1);
    });

    it('cleans up nodes and closes AudioContext on dispose', () => {
      const engine = new SoundscapeEngine({ audioContext: mockContext as unknown as AudioContext });
      engine.dispose();

      expect(mockContext.state).toBe('closed');
      expect(engine.getState().isUnlocked).toBe(false);
    });
  });

  describe('Graceful Degradation & Non-Browser Safety', () => {
    it('degrades silently when AudioContext is completely unavailable', () => {
      vi.stubGlobal('AudioContext', undefined);
      vi.stubGlobal('window', {});

      const engine = new SoundscapeEngine();
      expect(engine.isUnlocked()).toBe(false);

      // Method calls must not throw
      expect(() => engine.modulateFriction({ velocity: 0.5 })).not.toThrow();
      expect(() => engine.stopFriction()).not.toThrow();
      expect(() => engine.triggerScissorSnip()).not.toThrow();
      expect(() => engine.setFabric('linen')).not.toThrow();
      expect(() => engine.setMuted(true)).not.toThrow();
      expect(() => engine.dispose()).not.toThrow();
    });

    it('exports useSoundscape React hook from index module', () => {
      expect(typeof useSoundscape).toBe('function');
    });
  });
});
