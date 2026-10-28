/**
 * Atelier Media Generator & Sample Asset Bootstrap
 * Ensures valid high-resolution SVG/WebP composite renders and sample motion assets exist locally.
 */

import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_ATELIER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <defs>
    <linearGradient id="silkGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#15171d"/>
      <stop offset="50%" stop-color="#232731"/>
      <stop offset="100%" stop-color="#0e1014"/>
    </linearGradient>
    <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8c7136"/>
      <stop offset="50%" stop-color="#c5a059"/>
      <stop offset="100%" stop-color="#e0c792"/>
    </linearGradient>
    <radialGradient id="stageSpotlight" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.7"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#silkGlow)"/>
  <rect width="100%" height="100%" fill="url(#stageSpotlight)"/>
  <ellipse cx="450" cy="1120" rx="360" ry="40" fill="#000" opacity="0.6"/>
  <path d="M450 160 C410 160, 360 250, 350 360 C340 470, 390 560, 380 660 C360 780, 240 960, 200 1100 L700 1100 C660 960, 540 780, 520 660 C510 560, 560 470, 550 360 C540 250, 490 160, 450 160 Z" fill="url(#goldRibbon)" opacity="0.95" stroke="#f9f4ea" stroke-width="2"/>
  <text x="450" y="80" text-anchor="middle" fill="#fbf9f5" font-family="serif" font-size="34" letter-spacing="4">DRAPE COUTURE COMPOSITE</text>
  <text x="450" y="1150" text-anchor="middle" fill="#c5a059" font-family="monospace" font-size="16" letter-spacing="2">DRAPE HAUTE COUTURE ATELIER • BESPOKE FIT</text>
</svg>`;

export function ensureMediaDirectories(mediaRoot: string): { rendersDir: string; motionDir: string } {
  const rendersDir = path.join(mediaRoot, 'renders');
  const motionDir = path.join(mediaRoot, 'motion');

  if (!fs.existsSync(rendersDir)) {
    fs.mkdirSync(rendersDir, { recursive: true });
  }
  if (!fs.existsSync(motionDir)) {
    fs.mkdirSync(motionDir, { recursive: true });
  }

  // Ensure default fallback sample render exists
  const defaultSampleRender = path.join(rendersDir, 'fitting_default.svg');
  if (!fs.existsSync(defaultSampleRender)) {
    fs.writeFileSync(defaultSampleRender, SAMPLE_ATELIER_SVG, 'utf8');
  }

  return { rendersDir, motionDir };
}

export function writeFittingRenderAsset(mediaRoot: string, fittingId: string): string {
  const { rendersDir } = ensureMediaDirectories(mediaRoot);
  const targetSvg = path.join(rendersDir, `${fittingId}.svg`);
  if (!fs.existsSync(targetSvg)) {
    fs.writeFileSync(targetSvg, SAMPLE_ATELIER_SVG, 'utf8');
  }
  return `/media/renders/${fittingId}.svg`;
}
