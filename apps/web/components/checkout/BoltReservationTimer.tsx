'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BoltLockResponse } from '../../lib/checkoutTypes';
import { acquireBoltLock, releaseBoltLock } from '../../lib/checkoutApi';

export interface BoltReservationTimerProps {
  boltId: string;
  requestedYards: number;
  initialLockId?: string;
  initialExpiresAt?: string;
  onLockExpired?: () => void;
  onLockRenewed?: (lock: BoltLockResponse) => void;
  onLockAcquired?: (lock: BoltLockResponse) => void;
  className?: string;
}

const TOTAL_LOCK_DURATION_SECONDS = 15 * 60; // 900 seconds per C-019

export const BoltReservationTimer: React.FC<BoltReservationTimerProps> = ({
  boltId,
  requestedYards,
  initialLockId,
  initialExpiresAt,
  onLockExpired,
  onLockRenewed,
  onLockAcquired,
  className = '',
}) => {
  const [lockId, setLockId] = useState<string | null>(initialLockId || null);
  const [expiresAt, setExpiresAt] = useState<string | null>(
    initialExpiresAt || new Date(Date.now() + TOTAL_LOCK_DURATION_SECONDS * 1000).toISOString()
  );
  const [secondsRemaining, setSecondsRemaining] = useState<number>(TOTAL_LOCK_DURATION_SECONDS);
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);
  const [isReLocking, setIsReLocking] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Store active lock id in ref for clean unmount release (C-020)
  const activeLockRef = useRef<{ boltId: string; lockId: string | null }>({
    boltId,
    lockId: initialLockId || null,
  });

  // Acquire lock on mount if not provided
  useEffect(() => {
    let isCancelled = false;
    if (!initialLockId) {
      acquireBoltLock({ boltId, requestedYards }).then((res) => {
        if (!isCancelled) {
          setLockId(res.lockId);
          setExpiresAt(res.expiresAt);
          activeLockRef.current = { boltId, lockId: res.lockId };
          if (onLockAcquired) onLockAcquired(res);
        }
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [boltId, requestedYards, initialLockId, onLockAcquired]);

  // Clean unmount release
  useEffect(() => {
    return () => {
      const current = activeLockRef.current;
      if (current.lockId) {
        releaseBoltLock(current.boltId, current.lockId).catch(() => {});
      }
    };
  }, []);

  // Update secondsRemaining every second based on expiresAt
  useEffect(() => {
    if (!expiresAt) return;

    const targetTime = new Date(expiresAt).getTime();

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setSecondsRemaining(diff);

      if (diff === 0) {
        clearInterval(interval);
        setIsExpired(true);
        if (onLockExpired) onLockExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onLockExpired]);

  // Handle Re-Lock 1-click action
  const handleReLock = useCallback(async () => {
    setIsReLocking(true);
    try {
      const res = await acquireBoltLock({ boltId, requestedYards });
      setLockId(res.lockId);
      setExpiresAt(res.expiresAt);
      activeLockRef.current = { boltId, lockId: res.lockId };
      setIsExpired(false);
      setIsWarningDismissed(false);
      setSecondsRemaining(TOTAL_LOCK_DURATION_SECONDS);
      if (onLockRenewed) onLockRenewed(res);
    } catch {
      // Handle failure
    } finally {
      setIsReLocking(false);
    }
  }, [boltId, requestedYards, onLockRenewed]);

  // Formatting helpers
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const percentage = Math.min(100, Math.max(0, (secondsRemaining / TOTAL_LOCK_DURATION_SECONDS) * 100));

  const isLowTime = secondsRemaining > 0 && secondsRemaining <= 120; // Under 2 minutes remaining warning
  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 60;

  // Progress bar color based on remaining time
  const progressBarColor = isUrgent
    ? 'bg-rose-500'
    : isLowTime
    ? 'bg-amber-500'
    : 'bg-accent-500';

  return (
    <div
      className={`relative rounded-md border border-grey-200 bg-white p-3.5 shadow-xs transition-all ${className}`}
      role="region"
      aria-label="Continuous bolt inventory reservation timer"
    >
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-primary-900 tracking-wider uppercase text-[11px]">
            Continuous Bolt Lock Active
          </span>
          <span className="text-[11px] text-grey-500 font-mono">({boltId})</span>
        </div>
        <div
          className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
            isUrgent
              ? 'bg-rose-100 text-rose-800 animate-pulse'
              : isLowTime
              ? 'bg-amber-100 text-amber-800'
              : 'bg-surface-secondary text-grey-800'
          }`}
          aria-live="polite"
        >
          {formattedTime} remaining
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full bg-grey-100 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${progressBarColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-grey-500 mt-1.5 font-mono">
        <span>Reserved: {requestedYards} yds</span>
        <span>Redis Lock: {lockId ? `${lockId.slice(0, 10)}...` : 'Allocating...'}</span>
      </div>

      {/* Warning Toast when under 2 minutes remain */}
      {isLowTime && !isWarningDismissed && (
        <div
          className="mt-3 p-2.5 bg-amber-50 border border-amber-300 rounded-md text-amber-900 text-xs flex items-center justify-between shadow-sm animate-fade-in"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <span className="text-amber-700 text-sm">⏳</span>
            <span>
              <strong>Reservation expiring soon:</strong> Under 2 minutes remain. Complete checkout or re-lock to prevent
              continuous bolt release.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsWarningDismissed(true)}
            className="text-amber-700 hover:text-amber-900 text-xs font-bold px-2 py-0.5"
            aria-label="Dismiss warning"
          >
            ✕
          </button>
        </div>
      )}

      {/* Expired Modal Overlay */}
      {isExpired && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lock-expired-title"
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border border-grey-200 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3 text-xl">
              ⚠️
            </div>
            <h4 id="lock-expired-title" className="text-lg font-display font-semibold text-primary-900 mb-2">
              Continuous Bolt Reservation Expired
            </h4>
            <p className="text-xs text-grey-600 mb-5 leading-relaxed">
              Your 15-minute continuous hold on bolt <strong>{boltId}</strong> ({requestedYards} yards) has lapsed to
              release inventory for waiting ateliers. Would you like to re-verify and lock continuous yardage now?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleReLock}
                disabled={isReLocking}
                className="w-full py-2.5 px-4 bg-primary-900 text-alabaster rounded-md text-xs font-semibold tracking-wider uppercase hover:bg-primary-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {isReLocking ? 'Verifying Bolt Inventory...' : 'Re-Lock Continuous Yardage (15 Min)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoltReservationTimer;
