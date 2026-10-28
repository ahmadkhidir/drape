'use client';

import React from 'react';
import { useSoundscape } from '../../lib/audio';

interface SoundscapeToggleProps {
  className?: string;
}

export function SoundscapeToggle({ className = '' }: SoundscapeToggleProps) {
  const { isMuted, toggleMute, unlock, triggerScissorSnip } = useSoundscape();

  const handleToggle = async () => {
    // Unlock Web Audio context upon explicit user gesture
    await unlock();
    const newMutedState = toggleMute();
    if (!newMutedState) {
      // Play brief crisp artisan shears cue to confirm soundscape activation
      triggerScissorSnip({ intensity: 0.7 });
    }
  };

  const isSoundOn = !isMuted;

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md border transition-all cursor-pointer ${
        isSoundOn
          ? 'bg-gold/10 border-gold text-gold shadow-sm'
          : 'border-grey-300 dark:border-grey-700 text-ink dark:text-alabaster hover:border-gold hover:text-gold'
      } ${className}`}
      aria-label={isSoundOn ? 'Mute Bespoke Soundscape' : 'Enable Bespoke Spatial Soundscape'}
      title={isSoundOn ? 'Click to Mute Soundscape' : 'Click to Enable Spatial Soundscape'}
    >
      <span className="flex items-center space-x-1.5">
        {isSoundOn ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
            </span>
            <span>Sound: ON</span>
          </>
        ) : (
          <>
            <span className="inline-flex rounded-full h-2 w-2 bg-grey-400"></span>
            <span>Sound: OFF</span>
          </>
        )}
      </span>
    </button>
  );
}
