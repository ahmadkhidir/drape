/**
 * Web Audio Soundscape Engine Type Definitions
 * Spec: docs/Drape/features/FEAT-011.md
 * Issue: #64
 */

export type NoiseType = 'white' | 'pink' | 'brownian';

export interface FabricAudioProfile {
  id: string;
  name: string;
  baseFilterFreq: number; // Hz
  maxFilterFreq: number;  // Hz
  filterQ: number;
  noiseType: NoiseType;
  gainScale: number;
  frictionDecay: number; // seconds
  harmonicOvertoneFreq?: number; // Hz for rich fabrics (velvet, brocade)
}

export interface FrictionParams {
  /** Normalized pointer velocity (0.0 to 1.0) or clamped pixel speed */
  velocity: number;
  /** Fabric identifier or fabric name matching a profile */
  fabricType?: string;
  /** Stereo panning (-1.0 left to 1.0 right) */
  pan?: number;
}

export interface ScissorSnipParams {
  /** Target yardage value crossed */
  yardage?: number;
  /** Optional notch index */
  notchIndex?: number;
  /** Volume / velocity intensity (0.0 to 1.0) */
  intensity?: number;
  /** Stereo panning (-1.0 left to 1.0 right) */
  pan?: number;
}

export interface SoundscapeOptions {
  /** Master volume scaling (0.0 to 1.0), defaults to 0.7 */
  masterVolume?: number;
  /** Ambient atelier salon soundscape enabled by default, defaults to true */
  ambientEnabled?: boolean;
  /** Ambient volume scaling (0.0 to 1.0), defaults to 0.12 */
  ambientVolume?: number;
  /** Custom AudioContext provider for testing */
  audioContext?: AudioContext;
}

export interface AudioEngineState {
  isMuted: boolean;
  isSuspended: boolean;
  isUnlocked: boolean;
  ambientActive: boolean;
  currentFabric: string;
  reducedMotionActive: boolean;
}
