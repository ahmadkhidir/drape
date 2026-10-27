'use client';

/**
 * 15-Minute Ephemeral RAM Deletion Countdown Progress Bar
 * Spec Anchors: NFR-040 (Illinois BIPA & Automated RAM destruction), Screen 05, C-012
 */

import React, { useState, useEffect } from 'react';

interface EphemeralCountdownProps {
  expiresAt: string; // ISO 8601 string
  onExpired?: () => void;
}

export const EphemeralCountdown: React.FC<EphemeralCountdownProps> = ({
  expiresAt,
  onExpired,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [initialDuration] = useState<number>(15 * 60);
  const [hasTriggeredTwoMinAlert, setHasTriggeredTwoMinAlert] = useState(false);

  useEffect(() => {
    const targetMs = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((targetMs - now) / 1000));
      setSecondsRemaining(diffSec);

      if (diffSec <= 120 && !hasTriggeredTwoMinAlert && diffSec > 0) {
        setHasTriggeredTwoMinAlert(true);
      }

      if (diffSec === 0) {
        onExpired?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, hasTriggeredTwoMinAlert, onExpired]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const percentRemaining = Math.max(0, Math.min(100, (secondsRemaining / initialDuration) * 100));
  const isUrgent = secondsRemaining <= 120 && secondsRemaining > 0;
  const isExpired = secondsRemaining === 0;

  return (
    <div className="space-y-2 rounded-lg border border-grey-300 dark:border-grey-700 bg-alabaster dark:bg-obsidian/60 p-4 font-sans text-xs">
      {/* Header and Countdown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isExpired
                ? 'bg-semantic-error-500'
                : isUrgent
                ? 'bg-semantic-warning-500 animate-ping'
                : 'bg-semantic-success-500'
            }`}
          />
          <span className="font-semibold uppercase tracking-wider text-grey-700 dark:text-grey-300 text-[11px]">
            {isExpired ? 'Ephemeral Lifetime Expired' : 'Biometric Privacy RAM-Disk Purge'}
          </span>
        </div>
        <span
          className={`font-mono font-bold text-xs ${
            isExpired
              ? 'text-semantic-error-500'
              : isUrgent
              ? 'text-semantic-warning-500 animate-pulse'
              : 'text-gold'
          }`}
        >
          {isExpired ? 'PURGED (00:00)' : formattedTime}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-grey-200 dark:bg-grey-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isExpired
              ? 'bg-semantic-error-500'
              : isUrgent
              ? 'bg-semantic-warning-500'
              : 'bg-gold'
          }`}
          style={{ width: `${percentRemaining}%` }}
        />
      </div>

      {/* Ephemeral Notice Text */}
      <p className="text-[11px] text-grey-500 dark:text-grey-400 leading-normal">
        {isExpired
          ? 'Customer portrait assets have been cryptographically shredded from volatile memory per Illinois BIPA.'
          : 'Per NFR-040, raw customer photos are processed in RAM-disks and permanently wiped after 15 minutes.'}
      </p>

      {/* 2-Minute Warning Alert Toast */}
      {isUrgent && (
        <div
          role="alert"
          className="mt-2 p-2.5 rounded bg-semantic-warning-100 dark:bg-semantic-warning-900/40 border border-semantic-warning-500 text-semantic-warning-900 dark:text-semantic-warning-100 text-[11px] font-medium flex items-center space-x-2 animate-fadeIn"
        >
          <span className="text-base">⚠️</span>
          <span>
            <strong>Warning:</strong> Under 2 minutes remaining until portrait assets are cryptographically purged from memory. Save your yardage specs now.
          </span>
        </div>
      )}
    </div>
  );
};
