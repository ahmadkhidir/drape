'use client';

import React from 'react';
import { SavedFitting } from './types';

interface MotionVideoModalProps {
  fitting: SavedFitting | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 360-Degree Motion Video Walk Modal
 * Spec Anchor: screens/09-digital-wardrobe.md, FEAT-006, FEAT-009
 */
export function MotionVideoModal({ fitting, isOpen, onClose }: MotionVideoModalProps) {
  if (!isOpen || !fitting) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="motion-modal-title"
      data-testid="motion-video-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-950/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-stone-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300">
                360° Neural Motion Walk
              </span>
            </div>
            <h3 id="motion-modal-title" className="font-serif text-lg text-white mt-0.5">
              {fitting.silhouetteName}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            data-testid="close-motion-modal"
            aria-label="Close motion modal"
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video / 360 Turntable Viewport */}
        <div className="relative aspect-[3/4] sm:aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
          {fitting.motionVideoUrl ? (
            <video
              src={fitting.motionVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              controls
              className="w-full h-full object-contain"
              data-testid="motion-video-element"
            />
          ) : (
            /* Animated fallback 360 turntable canvas/SVG */
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-stone-900 to-stone-950 p-8 text-center">
              <div className="relative w-48 h-48 mb-4 flex items-center justify-center">
                <svg className="w-40 h-40 text-amber-500/80 animate-spin-slow" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                  <circle cx="50" cy="50" r="44" strokeWidth="1" strokeDasharray="6 8" />
                  <ellipse cx="50" cy="50" rx="44" ry="16" strokeWidth="1.5" />
                  <path d="M50 6 L50 94" strokeWidth="1" strokeDasharray="3 3" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">👗</span>
                </div>
              </div>
              <p className="text-xs font-mono text-stone-400 max-w-xs">
                Rendering 60fps 360-degree orbital cloth simulation in WebGPU viewport.
              </p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-amber-300">Fabric:</span>
            <span>{fitting.fabricName}</span>
          </div>
          <div className="flex items-center space-x-1 font-mono">
            <span>Drape:</span>
            <span className="text-stone-200">{Math.round(fitting.drapeScore * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
