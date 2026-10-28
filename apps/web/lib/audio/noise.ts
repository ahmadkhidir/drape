/**
 * Procedural Noise Buffers for Atelier Soundscape Engine
 * Spec: docs/Drape/features/FEAT-011.md
 * Issue: #64
 *
 * Pre-generates seamless looping noise buffers (white, pink, brownian)
 * to eliminate hot-path allocations during real-time cloth friction synthesis.
 */

/**
 * Generates a looping white noise AudioBuffer.
 * Useful for high-frequency silk shearing and crisp textile friction.
 */
export function createWhiteNoiseBuffer(
  ctx: AudioContext,
  durationSeconds: number = 2.0
): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100;
  const bufferSize = Math.floor(sampleRate * durationSeconds);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    // Uniform white noise in [-1.0, 1.0]
    channelData[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

/**
 * Generates a looping pink noise AudioBuffer using Paul Kellet's filter algorithm.
 * Pink noise drops 3dB per octave, mirroring natural acoustic cloth rustle (wool, linen).
 */
export function createPinkNoiseBuffer(
  ctx: AudioContext,
  durationSeconds: number = 2.0
): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100;
  const bufferSize = Math.floor(sampleRate * durationSeconds);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const channelData = buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;

    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;

    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;

    // Scale to approximately [-1.0, 1.0] range
    channelData[i] = Math.max(-1.0, Math.min(1.0, pink * 0.11));
  }

  return buffer;
}

/**
 * Generates a looping brownian (red) noise AudioBuffer.
 * Drops 6dB per octave, evoking deep, warm ambient salon room tone.
 */
export function createBrownianNoiseBuffer(
  ctx: AudioContext,
  durationSeconds: number = 3.0
): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100;
  const bufferSize = Math.floor(sampleRate * durationSeconds);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const channelData = buffer.getChannelData(0);

  let lastOut = 0.0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Leaky integrator to prevent DC drift
    lastOut = (lastOut + 0.02 * white) / 1.02;
    channelData[i] = Math.max(-1.0, Math.min(1.0, lastOut * 3.5));
  }

  return buffer;
}
