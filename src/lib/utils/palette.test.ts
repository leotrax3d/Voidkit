import { describe, expect, it } from 'vitest';
import { hexToRgb, contrastRatio } from './color';
import { generatePalette, paletteModeLabel } from './palette';

describe('palette utils', () => {
  it('generates deterministic triadic palettes', () => {
    const first = generatePalette('#336699', 'triadic');
    const second = generatePalette('#336699', 'triadic');

    expect(first.json).toBe(second.json);
    expect(first.groups).toHaveLength(3);
    expect(first.groups[0].shades).toHaveLength(10);
  });

  it('exports css variables and json', () => {
    const palette = generatePalette('#336699', 'analog');

    expect(palette.cssVariables).toContain('--palette-analog-');
    expect(palette.json).toContain('"baseHex"');
    expect(paletteModeLabel('analog')).toBe('Analog');
  });

  it('calculates expected contrast extremes', () => {
    expect(contrastRatio(hexToRgb('#000000'), hexToRgb('#ffffff'))).toBe(21);
  });

  it('creates valid swatches for light and dark shades', () => {
    const palette = generatePalette('#ff6600', 'monochromatic');
    const darkest = palette.groups[0].shades[palette.groups[0].shades.length - 1];
    const lightest = palette.groups[0].shades[0];

    expect(darkest.contrastOnWhite).toBeGreaterThan(lightest.contrastOnWhite);
    expect(lightest.hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});
