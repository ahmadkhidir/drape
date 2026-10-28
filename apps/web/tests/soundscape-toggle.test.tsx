import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SoundscapeToggle } from '../components/audio/SoundscapeToggle';

describe('SoundscapeToggle Component', () => {
  it('renders with Sound: OFF initially per browser autoplay constraints', () => {
    const html = renderToStaticMarkup(<SoundscapeToggle />);
    expect(html).toContain('Sound: OFF');
    expect(html).toContain('aria-label="Enable Bespoke Spatial Soundscape"');
  });

  it('contains accessible button attributes and custom classNames', () => {
    const html = renderToStaticMarkup(<SoundscapeToggle className="custom-test-class" />);
    expect(html).toContain('custom-test-class');
    expect(html).toContain('type="button"');
  });
});
