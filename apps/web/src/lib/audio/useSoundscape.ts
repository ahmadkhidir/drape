'use client';

/**
 * React Hook for Haptic & Spatial Web Audio Soundscape
 * Spec: docs/Drape/features/FEAT-011.md
 * Issue: #64
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSoundscapeEngine, SoundscapeEngine } from './soundscape';
import { AudioEngineState, FrictionParams, ScissorSnipParams } from './types';

export function useSoundscape() {
  const engineRef = useRef<SoundscapeEngine | null>(null);

  const [state, setState] = useState<AudioEngineState>(() => {
    if (typeof window !== 'undefined') {
      const engine = getSoundscapeEngine();
      engineRef.current = engine;
      return engine.getState();
    }
    return {
      isMuted: true,
      isSuspended: true,
      isUnlocked: false,
      ambientActive: false,
      currentFabric: 'silk',
      reducedMotionActive: false,
    };
  });

  useEffect(() => {
    const engine = getSoundscapeEngine();
    engineRef.current = engine;

    const unsubscribe = engine.subscribe((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const toggleMute = useCallback(() => {
    return getSoundscapeEngine().toggleMute();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    getSoundscapeEngine().setMuted(muted);
  }, []);

  const unlock = useCallback(() => {
    return getSoundscapeEngine().unlock();
  }, []);

  const modulateFriction = useCallback((params: FrictionParams) => {
    getSoundscapeEngine().modulateFriction(params);
  }, []);

  const stopFriction = useCallback(() => {
    getSoundscapeEngine().stopFriction();
  }, []);

  const triggerScissorSnip = useCallback((params?: ScissorSnipParams) => {
    getSoundscapeEngine().triggerScissorSnip(params);
  }, []);

  const setFabric = useCallback((fabricId: string) => {
    getSoundscapeEngine().setFabric(fabricId);
  }, []);

  return {
    state,
    isMuted: state.isMuted,
    isUnlocked: state.isUnlocked,
    reducedMotionActive: state.reducedMotionActive,
    toggleMute,
    setMuted,
    unlock,
    modulateFriction,
    stopFriction,
    triggerScissorSnip,
    setFabric,
  };
}
