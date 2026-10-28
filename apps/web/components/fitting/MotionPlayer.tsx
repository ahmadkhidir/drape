'use client';

/**
 * 360° Motion Video Player & Interactive Scrubbing UI
 * Spec Anchors:
 *   - docs/Drape/features/FEAT-006.md (360° Looping Neural Motion & Garment Walk)
 *   - docs/Drape/screens/05-fitting-results-view.md (Screen 5: Fitting Results View)
 *   - CONTRACTS.md C-014 (POST /api/v1/fittings/:id/motion)
 *   - CONTRACTS.md C-015 (GET /api/v1/fittings/:id/motion)
 *   - docs/Drape/analytics.md (EVT-008: motion_video_generated)
 *   - docs/Drape/nfr.md (NFR-005, NFR-030)
 */

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';

export type TrajectoryPreset = 'turntable_360' | 'runway_step_turn';

export interface MotionTelemetryEvent {
  event: 'motion_video_generated';
  fitting_id: string;
  duration_seconds: number;
  generation_latency_ms: number;
  event_id: string;
  occurred_at: string;
  platform: 'web';
}

export interface MotionPlayerProps {
  fittingId: string;
  staticRenderUrl: string;
  initialVideoUrl?: string | null;
  fabricName?: string;
  silhouetteName?: string;
  durationMs?: number; // Fixed 4000ms per FEAT-006
  fps?: number; // Fixed 30fps per FEAT-006
  thumbnailSpriteUrl?: string | null;
  authToken?: string | null;
  autoPlay?: boolean;
  onTelemetry?: (event: MotionTelemetryEvent) => void;
  onBackToPortrait?: () => void;
  className?: string;
}

/**
 * Pure calculation: converts current playback time (seconds) to rotation angle (0° to 359°).
 * 4.0 seconds duration = 360 degrees full turntable rotation.
 */
export function calculateRotationAngle(currentTimeSeconds: number, durationSeconds: number = 4.0): number {
  if (durationSeconds <= 0) return 0;
  const normalized = (currentTimeSeconds % durationSeconds + durationSeconds) % durationSeconds;
  return Math.round((normalized / durationSeconds) * 360) % 360;
}

/**
 * Pure calculation: converts current playback time to zero-indexed discrete video frame number.
 * 4.0s @ 30fps = 120 frames (0 to 119).
 */
export function calculateFrameIndex(currentTimeSeconds: number, fps: number = 30, totalFrames: number = 120): number {
  if (totalFrames <= 0) return 0;
  const rawFrame = Math.floor(currentTimeSeconds * fps);
  return Math.max(0, Math.min(totalFrames - 1, rawFrame % totalFrames));
}

/**
 * Pure calculation: maps horizontal drag displacement or scrubber percentage (0.0 to 1.0)
 * to exact seek time within the looping video bounds.
 */
export function calculateSeekTimeFromFraction(fraction: number, durationSeconds: number = 4.0): number {
  const clamped = Math.max(0, Math.min(1, fraction));
  return Number((clamped * durationSeconds).toFixed(3));
}

/**
 * Pure helper: structures standard EVT-008 telemetry event payload.
 */
export function createEvt008Payload(fittingId: string, latencyMs: number, durationSec: number = 4): MotionTelemetryEvent {
  return {
    event: 'motion_video_generated',
    fitting_id: fittingId,
    duration_seconds: durationSec,
    generation_latency_ms: Math.round(latencyMs),
    event_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt-${Date.now()}`,
    occurred_at: new Date().toISOString(),
    platform: 'web',
  };
}

export function MotionPlayer({
  fittingId,
  staticRenderUrl,
  initialVideoUrl = null,
  fabricName = 'Curated Textile',
  silhouetteName = 'Bespoke Garment',
  durationMs = 4000,
  fps = 30,
  thumbnailSpriteUrl = null,
  authToken = null,
  autoPlay = true,
  onTelemetry,
  onBackToPortrait,
  className = '',
}: MotionPlayerProps) {
  const durationSeconds = durationMs / 1000;
  const totalFrames = Math.round(durationSeconds * fps);

  // Core playback states
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay && Boolean(initialVideoUrl));
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [selectedTrajectory, setSelectedTrajectory] = useState<TrajectoryPreset>('turntable_360');

  // Generation & lifecycle states
  const [generationStatus, setGenerationStatus] = useState<
    'idle' | 'requesting' | 'queued' | 'rendering' | 'completed' | 'failed' | 'fallback'
  >(initialVideoUrl ? 'completed' : 'idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('Preparing neural camera path...');
  const [estimatedWaitSeconds, setEstimatedWaitSeconds] = useState<number>(5.5);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFallbackActive, setIsFallbackActive] = useState<boolean>(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrubberTrackRef = useRef<HTMLDivElement | null>(null);
  const requestStartTimeRef = useRef<number>(0);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasPlayingBeforeScrubRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartTimeRef = useRef<number>(0);

  const titleId = useId();

  // Clean up polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // Dispatch telemetry event (EVT-008)
  const emitTelemetry = useCallback(
    (latencyMs: number) => {
      const payload = createEvt008Payload(fittingId, latencyMs, durationSeconds);
      if (onTelemetry) {
        onTelemetry(payload);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('drape:telemetry', { detail: payload }));
      }
    },
    [fittingId, durationSeconds, onTelemetry]
  );

  // Poll C-015 GET /api/v1/fittings/:id/motion
  const startPollingMotionStatus = useCallback(() => {
    let pollCount = 0;
    const maxPolls = 20; // 30 seconds max timeout (NFR-005)

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    pollTimerRef.current = setInterval(async () => {
      pollCount += 1;

      // Realistic progress milestones for UX
      if (pollCount === 1) {
        setProgressPercent(20);
        setProgressMessage('Transmitting static fit coordinates to GPU worker...');
      } else if (pollCount === 2) {
        setProgressPercent(45);
        setProgressMessage('Synthesizing neural cloth dynamics & light reflections...');
      } else if (pollCount === 3) {
        setProgressPercent(75);
        setProgressMessage('Computing 360° hemline billow & drape inertia...');
      } else if (pollCount >= 4) {
        setProgressPercent(90);
        setProgressMessage('Assembling seamless 30fps catwalk motion loop...');
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        const guestToken =
          typeof localStorage !== 'undefined' ? localStorage.getItem('drape_guest_session_id') : null;
        if (guestToken) {
          headers['x-guest-session-token'] = guestToken;
        }

        const res = await fetch(`/api/v1/fittings/${fittingId}/motion`, {
          method: 'GET',
          headers,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'completed' && data.videoUrl) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setProgressPercent(100);
            setProgressMessage('Catwalk walk sequence synthesized successfully.');
            setVideoUrl(data.videoUrl);
            setGenerationStatus('completed');
            setIsPlaying(true);

            const elapsedMs = Date.now() - requestStartTimeRef.current;
            emitTelemetry(elapsedMs);
            return;
          }

          if (data.status === 'failed') {
            throw new Error(data.errorMessage || 'Motion video synthesis failed.');
          }
        } else if (res.status === 404 && pollCount > 10) {
          throw new Error('Motion job session timed out.');
        }
      } catch (err: any) {
        // Stop polling on explicit error or after timeout
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setErrorMessage(err?.message || 'Serverless GPU inference timed out.');
        setGenerationStatus('failed');
        setIsFallbackActive(true);
      }

      if (pollCount >= maxPolls) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setErrorMessage('GPU worker inference exceeded 8.0s timeout limit. Fallback activated.');
        setGenerationStatus('fallback');
        setIsFallbackActive(true);
      }
    }, 1500);
  }, [fittingId, authToken, emitTelemetry]);

  // Trigger C-014 POST /api/v1/fittings/:id/motion
  const handleTriggerMotionGeneration = async (preset: TrajectoryPreset = selectedTrajectory) => {
    setGenerationStatus('requesting');
    setErrorMessage(null);
    setIsFallbackActive(false);
    setProgressPercent(10);
    setProgressMessage('Submitting 360° motion generation job to priority queue...');
    requestStartTimeRef.current = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      } else {
        // Fallback demo token for non-authenticated exploration
        headers['Authorization'] = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
      }

      const res = await fetch(`/api/v1/fittings/${fittingId}/motion`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          trajectoryPreset: preset,
          fps: 30,
          durationMs: 4000,
        }),
      });

      if (res.status === 202) {
        const data = await res.json();
        setEstimatedWaitSeconds(data.estimatedWaitSeconds || 5.5);
        setGenerationStatus('rendering');
        startPollingMotionStatus();
        return;
      }

      if (res.status === 402) {
        throw new Error('360° looping motion walk requires Atelier Client or Couture Studio Pro subscription.');
      }

      if (res.status === 404) {
        throw new Error('Base static fitting render not found or expired.');
      }

      if (res.status === 409) {
        throw new Error('Base static fitting is still processing. Please allow render to finalize.');
      }

      if (res.status === 503) {
        throw new Error('GPU worker queue is temporarily at capacity. Please retry shortly.');
      }

      throw new Error(`Motion generation request failed (HTTP ${res.status}).`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch motion generation request.');
      setGenerationStatus('failed');
      setIsFallbackActive(true);
    }
  };

  // Video element playback listeners
  const handleTimeUpdate = () => {
    if (!isScrubbing && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoEnded = () => {
    // Seamless loop: reset currentTime to 0 and replay
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleVideoError = () => {
    setErrorMessage('Video streaming asset failed to buffer. Serving high-resolution 2D portrait fallback.');
    setIsFallbackActive(true);
    setGenerationStatus('fallback');
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Horizontal Scrubbing - Pointer/Touch Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!videoRef.current || !videoUrl) return;
    e.preventDefault();

    setIsScrubbing(true);
    wasPlayingBeforeScrubRef.current = isPlaying;
    dragStartXRef.current = e.clientX;
    dragStartTimeRef.current = videoRef.current.currentTime;

    videoRef.current.pause();
    setIsPlaying(false);

    // Capture pointer to track gestures outside element boundaries
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing || !videoRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartXRef.current;

    // A full width swipe across the container rotates 360 degrees (4.0 seconds)
    const timeDelta = (deltaX / rect.width) * durationSeconds;
    let newTime = dragStartTimeRef.current + timeDelta;

    // Wrap around seamless loop: 0 <= newTime < durationSeconds
    newTime = ((newTime % durationSeconds) + durationSeconds) % durationSeconds;

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    setIsScrubbing(false);

    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore if pointer capture release fails
    }

    if (wasPlayingBeforeScrubRef.current && videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Scrubber track direct click / drag
  const handleScrubberTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberTrackRef.current || !videoRef.current) return;
    const rect = scrubberTrackRef.current.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    const seekTime = calculateSeekTimeFromFraction(fraction, durationSeconds);

    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  // Keyboard navigation & accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const frameStep = 1 / fps; // 0.0333s = 1 frame

    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextTime = Math.max(0, videoRef.current.currentTime - frameStep);
      videoRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextTime = Math.min(durationSeconds, videoRef.current.currentTime + frameStep);
      videoRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    } else if (e.key === 'Home') {
      e.preventDefault();
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      videoRef.current.currentTime = durationSeconds - 0.01;
      setCurrentTime(durationSeconds - 0.01);
    }
  };

  const rotationAngle = calculateRotationAngle(currentTime, durationSeconds);
  const currentFrame = calculateFrameIndex(currentTime, fps, totalFrames);
  const progressRatio = durationSeconds > 0 ? currentTime / durationSeconds : 0;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col w-full aspect-[3/4] max-h-[760px] rounded-xl overflow-hidden border border-grey-300 dark:border-grey-700 bg-obsidian text-alabaster select-none focus:outline-none focus:ring-2 focus:ring-gold ${className}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-labelledby={titleId}
      aria-label="360-degree Motion Catwalk Video Player"
    >
      {/* Editorial Watermark & Top HUD */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
          <span id={titleId} className="font-mono text-xs uppercase tracking-widest text-gold font-bold">
            360° Catwalk Motion • Neural Runway
          </span>
        </div>

        {/* Rotation Angle Compass Badge */}
        <div className="flex items-center space-x-2 font-mono text-xs bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-gold/40 text-alabaster">
          <span className="text-gold font-bold">{rotationAngle}°</span>
          <span className="text-grey-400">|</span>
          <span className="text-grey-300">
            Frame {currentFrame + 1}/{totalFrames}
          </span>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {/* State A: Ready Video Player */}
        {videoUrl && !isFallbackActive ? (
          <div
            className="relative w-full h-full flex items-center justify-center cursor-ew-resize"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            title="Drag horizontally across garment to scrub 360° rotation"
          >
            <video
              ref={videoRef}
              src={videoUrl}
              loop
              muted
              playsInline
              autoPlay={isPlaying}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onError={handleVideoError}
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Scrub Hint Indicator Overlay */}
            {isScrubbing && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/20">
                <div className="px-4 py-2 rounded-lg bg-black/75 backdrop-blur-md border border-gold text-center text-xs font-mono text-gold shadow-xl">
                  ↔ Scrubbing Turntable: <strong>{rotationAngle}°</strong>
                </div>
              </div>
            )}
          </div>
        ) : isFallbackActive || generationStatus === 'fallback' ? (
          /* State B: Fallback Static 2D Fitting Render with Notice Banner */
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/90 p-6 text-center">
            {staticRenderUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={staticRenderUrl}
                alt={`${silhouetteName} Tailored in ${fabricName}`}
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
            ) : null}

            {/* Non-Blocking Fallback Notice Banner */}
            <div className="relative z-10 max-w-md p-6 rounded-xl bg-obsidian/90 border border-semantic-warning-500/80 backdrop-blur-md space-y-4 shadow-2xl">
              <div className="h-10 w-10 mx-auto rounded-full bg-semantic-warning-500/20 text-gold flex items-center justify-center text-xl">
                ⚠
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-semibold text-alabaster">
                  High-Resolution 2D Fitting Maintained
                </h3>
                <p className="text-xs text-grey-300 font-sans leading-relaxed">
                  {errorMessage ||
                    'Serverless GPU queue latency exceeded the interactive threshold. Seamlessly displaying photorealistic portrait render.'}
                </p>
              </div>

              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleTriggerMotionGeneration(selectedTrajectory)}
                  className="px-4 py-2 rounded-md bg-gold text-ink text-xs font-semibold uppercase tracking-wider hover:bg-gold/90 transition-colors cursor-pointer"
                >
                  ↻ Retry 360° Walk
                </button>
                {onBackToPortrait && (
                  <button
                    type="button"
                    onClick={onBackToPortrait}
                    className="px-4 py-2 rounded-md border border-grey-600 text-alabaster text-xs font-semibold uppercase tracking-wider hover:bg-grey-800 transition-colors cursor-pointer"
                  >
                    View Before / After
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* State C: Idle / Trigger Generation Banner */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-t from-obsidian via-obsidian/80 to-transparent">
            {staticRenderUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={staticRenderUrl}
                alt="Static Portrait Preview"
                className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xs"
              />
            )}

            <div className="relative z-10 max-w-md space-y-5 p-6 rounded-2xl bg-black/80 border border-grey-700/80 backdrop-blur-md shadow-2xl">
              <div className="h-12 w-12 rounded-full border border-gold/60 text-gold flex items-center justify-center mx-auto text-2xl font-serif">
                360°
              </div>

              <div className="space-y-2">
                <h2 className="font-display text-2xl font-semibold text-alabaster tracking-tight">
                  Experience Garment in Motion
                </h2>
                <p className="font-sans text-xs text-grey-300 leading-relaxed">
                  Synthesize an interactive 4-second looping catwalk walk sequence. View authentic cloth inertia, hemline
                  centrifugal billow, and shifting satin sheen across a 360-degree rotation.
                </p>
              </div>

              {/* Trajectory Preset Selector */}
              <div className="flex items-center justify-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedTrajectory('turntable_360')}
                  className={`px-3 py-1.5 rounded text-[11px] font-mono transition-all ${
                    selectedTrajectory === 'turntable_360'
                      ? 'bg-gold text-ink font-bold shadow-xs'
                      : 'border border-grey-700 text-grey-400 hover:text-alabaster'
                  }`}
                >
                  Turntable 360° Pivot
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTrajectory('runway_step_turn')}
                  className={`px-3 py-1.5 rounded text-[11px] font-mono transition-all ${
                    selectedTrajectory === 'runway_step_turn'
                      ? 'bg-gold text-ink font-bold shadow-xs'
                      : 'border border-grey-700 text-grey-400 hover:text-alabaster'
                  }`}
                >
                  Runway Step Turn
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleTriggerMotionGeneration(selectedTrajectory)}
                className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-lg bg-gold text-ink font-semibold text-xs uppercase tracking-widest hover:bg-gold/90 transition-all shadow-lg hover:shadow-gold/20 cursor-pointer"
              >
                <span>▶ View in 360° Motion</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal / Inline Progress Indicator during Generation */}
        {(generationStatus === 'requesting' || generationStatus === 'rendering') && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Synthesizing 360° Neural Motion"
            className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-fade-in"
          >
            <div className="w-full max-w-sm rounded-xl border border-gold/40 bg-obsidian p-6 text-center space-y-5 shadow-2xl">
              <div className="relative h-16 w-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-gold/20 animate-ping" />
                <div className="h-16 w-16 rounded-full border-2 border-gold border-t-transparent animate-spin flex items-center justify-center text-gold font-mono text-sm">
                  {progressPercent}%
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-lg font-semibold text-alabaster">
                  Synthesizing Neural Motion Walk
                </h3>
                <p className="font-sans text-xs text-grey-300">{progressMessage}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-grey-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gold h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-grey-400">
                <span>Est. Wait: ~{estimatedWaitSeconds}s</span>
                <span>Seamless 30 FPS Loop</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls & Draggable Scrubber */}
      {videoUrl && !isFallbackActive && (
        <div className="relative z-30 p-4 bg-gradient-to-t from-black via-black/90 to-transparent space-y-3">
          {/* Draggable Progress & Scrub Bar */}
          <div
            ref={scrubberTrackRef}
            onClick={handleScrubberTrackClick}
            className="relative w-full h-3 bg-grey-800/80 rounded-full cursor-pointer flex items-center group py-2"
            role="slider"
            aria-label="360 Rotation Scrubber"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={rotationAngle}
          >
            {/* Filled Progress Track */}
            <div
              className="absolute left-0 h-1.5 bg-gradient-to-r from-accent-600 via-gold to-accent-300 rounded-full"
              style={{ width: `${progressRatio * 100}%` }}
            />

            {/* Draggable Scrub Handle */}
            <div
              className="absolute h-4 w-4 rounded-full bg-alabaster border-2 border-gold shadow-md transform -translate-x-1/2 transition-transform duration-75 group-hover:scale-125"
              style={{ left: `${progressRatio * 100}%` }}
            />
          </div>

          {/* Action Controls Bar */}
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={togglePlayPause}
                className="px-3 py-1.5 rounded-md bg-grey-800 hover:bg-grey-700 text-alabaster flex items-center space-x-1.5 transition-colors cursor-pointer"
                aria-label={isPlaying ? 'Pause 360 Video' : 'Play 360 Video'}
              >
                <span>{isPlaying ? '⏸ Pause' : '▶ Play'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    setCurrentTime(0);
                  }
                }}
                className="px-2.5 py-1.5 rounded-md border border-grey-700 hover:border-gold text-grey-400 hover:text-alabaster transition-colors cursor-pointer"
                title="Reset to 0° Front Angle"
                aria-label="Reset Rotation Angle"
              >
                ↻ Reset 0°
              </button>

              <span className="text-[11px] text-grey-400 hidden sm:inline">
                Drag horizontally to rotate • Space to play/pause
              </span>
            </div>

            {onBackToPortrait && (
              <button
                type="button"
                onClick={onBackToPortrait}
                className="text-xs text-grey-400 hover:text-gold transition-colors underline cursor-pointer"
              >
                ← Back to Portrait
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
