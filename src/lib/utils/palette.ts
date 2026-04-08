import {
  contrastRatio,
  formatHsl,
  formatRgb,
  hexToRgb,
  hslToRgb,
  normalizeHexColor,
  rgbToHex,
  rgbToHsl,
  type HslColor,
  type RgbColor
} from './color';

export type PaletteMode = 'monochromatic' | 'analog' | 'complementary' | 'triadic' | 'tetradic';

export type PaletteShadeStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface PaletteShade {
  step: PaletteShadeStep;
  hex: string;
  rgb: RgbColor;
  hsl: HslColor;
  contrastOnWhite: number;
  contrastOnBlack: number;
  whiteTextRating: 'AA' | 'AAA' | 'Fail';
  blackTextRating: 'AA' | 'AAA' | 'Fail';
}

export interface PaletteGroup {
  label: string;
  hue: number;
  shades: PaletteShade[];
}

export interface GeneratedPalette {
  baseHex: string;
  baseRgb: RgbColor;
  baseHsl: HslColor;
  mode: PaletteMode;
  groups: PaletteGroup[];
  cssVariables: string;
  json: string;
}

const SHADE_STEPS: PaletteShadeStep[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const SHADE_LIGHTNESS: Record<PaletteShadeStep, number> = {
  50: 97,
  100: 93,
  200: 87,
  300: 79,
  400: 68,
  500: 58,
  600: 47,
  700: 36,
  800: 24,
  900: 14
};

const MODE_OFFSETS: Record<PaletteMode, number[]> = {
  monochromatic: [0],
  analog: [-30, 0, 30],
  complementary: [0, 180],
  triadic: [0, 120, 240],
  tetradic: [0, 90, 180, 270]
};

const MODE_LABELS: Record<PaletteMode, string[]> = {
  monochromatic: ['Base'],
  analog: ['Analog Left', 'Base', 'Analog Right'],
  complementary: ['Base', 'Complement'],
  triadic: ['Base', 'Triad 1', 'Triad 2'],
  tetradic: ['Base', 'Tetrad 1', 'Tetrad 2', 'Tetrad 3']
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rotateHue(hue: number, offset: number): number {
  return ((hue + offset) % 360 + 360) % 360;
}

function getTextRating(ratio: number): 'AA' | 'AAA' | 'Fail' {
  if (ratio >= 7) {
    return 'AAA';
  }

  if (ratio >= 4.5) {
    return 'AA';
  }

  return 'Fail';
}

function generateShades(baseHsl: HslColor): PaletteShade[] {
  return SHADE_STEPS.map((step) => {
    const lightness = SHADE_LIGHTNESS[step];
    const distance = Math.abs(500 - step) / 400;
    const saturationMultiplier = clamp(1 - distance * 0.18, 0.68, 1.08);
    const shadeHsl: HslColor = {
      h: baseHsl.h,
      s: clamp(baseHsl.s * saturationMultiplier, 6, 100),
      l: lightness
    };
    const rgb = hslToRgb(shadeHsl);
    const hex = rgbToHex(rgb);

    return {
      step,
      hex,
      rgb,
      hsl: shadeHsl,
      contrastOnWhite: contrastRatio(rgb, { r: 255, g: 255, b: 255 }),
      contrastOnBlack: contrastRatio(rgb, { r: 0, g: 0, b: 0 }),
      whiteTextRating: getTextRating(contrastRatio(rgb, { r: 255, g: 255, b: 255 })),
      blackTextRating: getTextRating(contrastRatio(rgb, { r: 0, g: 0, b: 0 }))
    };
  });
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildCssVariables(mode: PaletteMode, groups: PaletteGroup[]): string {
  const lines: string[] = [':root {'];

  groups.forEach((group) => {
    const groupSlug = slugify(group.label);
    group.shades.forEach((shade) => {
      lines.push(`  --palette-${mode}-${groupSlug}-${shade.step}: ${shade.hex};`);
    });
  });

  lines.push('}');
  return lines.join('\n');
}

export function generatePalette(baseHex: string, mode: PaletteMode): GeneratedPalette {
  const normalized = normalizeHexColor(baseHex);
  if (!normalized) {
    throw new Error('Invalid base color.');
  }

  const baseRgb = hexToRgb(normalized);
  const baseHsl = rgbToHsl(baseRgb);
  const offsets = MODE_OFFSETS[mode];
  const labels = MODE_LABELS[mode];

  const groups: PaletteGroup[] = offsets.map((offset, index) => {
    const hue = rotateHue(baseHsl.h, offset);
    const shades = generateShades({ ...baseHsl, h: hue });

    return {
      label: labels[index] ?? `Tone ${index + 1}`,
      hue,
      shades
    };
  });

  const json = JSON.stringify(
    {
      baseHex: normalized,
      mode,
      groups: groups.map((group) => ({
        label: group.label,
        hue: group.hue,
        shades: group.shades.map((shade) => ({
          step: shade.step,
          hex: shade.hex,
          rgb: shade.rgb,
          hsl: shade.hsl,
          contrastOnWhite: shade.contrastOnWhite,
          contrastOnBlack: shade.contrastOnBlack,
          whiteTextRating: shade.whiteTextRating,
          blackTextRating: shade.blackTextRating
        }))
      }))
    },
    null,
    2
  );

  return {
    baseHex: normalized,
    baseRgb,
    baseHsl,
    mode,
    groups,
    cssVariables: buildCssVariables(mode, groups),
    json
  };
}

export function paletteModeLabel(mode: PaletteMode): string {
  switch (mode) {
    case 'monochromatic':
      return 'Monochromatic';
    case 'analog':
      return 'Analog';
    case 'complementary':
      return 'Complementary';
    case 'triadic':
      return 'Triadic';
    case 'tetradic':
      return 'Tetradic';
  }
}

export function paletteSwatchSummary(shade: PaletteShade): string {
  return `${shade.step} · ${shade.hex} · ${formatRgb(shade.rgb)} · ${formatHsl(shade.hsl)}`;
}
