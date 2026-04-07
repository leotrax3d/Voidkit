export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export type HslColor = {
  h: number;
  s: number;
  l: number;
};

export type HsvColor = {
  h: number;
  s: number;
  v: number;
};

export type CmykColor = {
  c: number;
  m: number;
  y: number;
  k: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function normalizeHexColor(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const shortMatch = /^#([0-9a-fA-F]{3})$/;
  const longMatch = /^#([0-9a-fA-F]{6})$/;

  if (longMatch.test(prefixed)) {
    return `#${prefixed.slice(1).toLowerCase()}`;
  }

  const short = prefixed.match(shortMatch);
  if (!short) {
    return undefined;
  }

  const [first, second, third] = short[1].split('');
  return `#${first}${first}${second}${second}${third}${third}`.toLowerCase();
}

export function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHexColor(hex);
  if (!normalized) {
    throw new Error('Invalid hex color.');
  }

  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);

  return { r: red, g: green, b: blue };
}

export function rgbToHex(color: RgbColor): string {
  const red = clamp(Math.round(color.r), 0, 255).toString(16).padStart(2, '0');
  const green = clamp(Math.round(color.g), 0, 255).toString(16).padStart(2, '0');
  const blue = clamp(Math.round(color.b), 0, 255).toString(16).padStart(2, '0');
  return `#${red}${green}${blue}`;
}

export function rgbToHsl(color: RgbColor): HslColor {
  const red = clamp(color.r, 0, 255) / 255;
  const green = clamp(color.g, 0, 255) / 255;
  const blue = clamp(color.b, 0, 255) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  if (delta !== 0) {
    switch (max) {
      case red:
        hue = 60 * (((green - blue) / delta) % 6);
        break;
      case green:
        hue = 60 * ((blue - red) / delta + 2);
        break;
      default:
        hue = 60 * ((red - green) / delta + 4);
        break;
    }
  }

  if (hue < 0) {
    hue += 360;
  }

  return {
    h: roundTo(hue, 2),
    s: roundTo(saturation * 100, 2),
    l: roundTo(lightness * 100, 2)
  };
}

export function hslToRgb(color: HslColor): RgbColor {
  const hue = ((color.h % 360) + 360) % 360;
  const saturation = clamp(color.s, 0, 100) / 100;
  const lightness = clamp(color.l, 0, 100) / 100;

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue / 60;
  const secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = lightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondComponent;
  } else if (huePrime < 2) {
    red = secondComponent;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondComponent;
  } else if (huePrime < 4) {
    green = secondComponent;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondComponent;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondComponent;
  }

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255)
  };
}

export function rgbToHsv(color: RgbColor): HsvColor {
  const red = clamp(color.r, 0, 255) / 255;
  const green = clamp(color.g, 0, 255) / 255;
  const blue = clamp(color.b, 0, 255) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    switch (max) {
      case red:
        hue = 60 * (((green - blue) / delta) % 6);
        break;
      case green:
        hue = 60 * ((blue - red) / delta + 2);
        break;
      default:
        hue = 60 * ((red - green) / delta + 4);
        break;
    }
  }

  if (hue < 0) {
    hue += 360;
  }

  return {
    h: roundTo(hue, 2),
    s: roundTo((max === 0 ? 0 : delta / max) * 100, 2),
    v: roundTo(max * 100, 2)
  };
}

export function hsvToRgb(color: HsvColor): RgbColor {
  const hue = ((color.h % 360) + 360) % 360;
  const saturation = clamp(color.s, 0, 100) / 100;
  const value = clamp(color.v, 0, 100) / 100;

  const chroma = value * saturation;
  const huePrime = hue / 60;
  const secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = value - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondComponent;
  } else if (huePrime < 2) {
    red = secondComponent;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondComponent;
  } else if (huePrime < 4) {
    green = secondComponent;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondComponent;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondComponent;
  }

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255)
  };
}

export function rgbToCmyk(color: RgbColor): CmykColor {
  const red = clamp(color.r, 0, 255) / 255;
  const green = clamp(color.g, 0, 255) / 255;
  const blue = clamp(color.b, 0, 255) / 255;

  const key = 1 - Math.max(red, green, blue);
  if (key === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const denominator = 1 - key;

  return {
    c: roundTo(((1 - red - key) / denominator) * 100, 2),
    m: roundTo(((1 - green - key) / denominator) * 100, 2),
    y: roundTo(((1 - blue - key) / denominator) * 100, 2),
    k: roundTo(key * 100, 2)
  };
}

export function cmykToRgb(color: CmykColor): RgbColor {
  const cyan = clamp(color.c, 0, 100) / 100;
  const magenta = clamp(color.m, 0, 100) / 100;
  const yellow = clamp(color.y, 0, 100) / 100;
  const black = clamp(color.k, 0, 100) / 100;

  return {
    r: Math.round(255 * (1 - cyan) * (1 - black)),
    g: Math.round(255 * (1 - magenta) * (1 - black)),
    b: Math.round(255 * (1 - yellow) * (1 - black))
  };
}

export function relativeLuminance(color: RgbColor): number {
  const transform = (channel: number): number => {
    const normalized = clamp(channel, 0, 255) / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const red = transform(color.r);
  const green = transform(color.g);
  const blue = transform(color.b);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: RgbColor, background: RgbColor): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return roundTo((lighter + 0.05) / (darker + 0.05), 2);
}

export function formatRgb(color: RgbColor): string {
  return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
}

export function formatHsl(color: HslColor): string {
  return `hsl(${roundTo(color.h, 2)}, ${roundTo(color.s, 2)}%, ${roundTo(color.l, 2)}%)`;
}

export function formatHsv(color: HsvColor): string {
  return `hsb(${roundTo(color.h, 2)}, ${roundTo(color.s, 2)}%, ${roundTo(color.v, 2)}%)`;
}

export function formatCmyk(color: CmykColor): string {
  return `cmyk(${roundTo(color.c, 2)}%, ${roundTo(color.m, 2)}%, ${roundTo(color.y, 2)}%, ${roundTo(color.k, 2)}%)`;
}

export function parseRgbString(value: string): RgbColor | undefined {
  const match = value
    .trim()
    .match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i) ?? value.trim().match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/i);

  if (!match) {
    return undefined;
  }

  const red = Number(match[1]);
  const green = Number(match[2]);
  const blue = Number(match[3]);

  if ([red, green, blue].some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
    return undefined;
  }

  return { r: red, g: green, b: blue };
}

export function parseHslString(value: string): HslColor | undefined {
  const match = value
    .trim()
    .match(/^hsl\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*\)$/i) ??
    value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%$/i);

  if (!match) {
    return undefined;
  }

  const hue = Number(match[1]);
  const saturation = Number(match[2]);
  const lightness = Number(match[3]);

  if ([hue, saturation, lightness].some((channel) => !Number.isFinite(channel))) {
    return undefined;
  }

  if (saturation < 0 || saturation > 100 || lightness < 0 || lightness > 100) {
    return undefined;
  }

  return { h: hue, s: saturation, l: lightness };
}

export function parseHsvString(value: string): HsvColor | undefined {
  const match = value
    .trim()
    .match(/^(?:hsb|hsv)\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*\)$/i) ??
    value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%$/i);

  if (!match) {
    return undefined;
  }

  const hue = Number(match[1]);
  const saturation = Number(match[2]);
  const valueChannel = Number(match[3]);

  if ([hue, saturation, valueChannel].some((channel) => !Number.isFinite(channel))) {
    return undefined;
  }

  if (saturation < 0 || saturation > 100 || valueChannel < 0 || valueChannel > 100) {
    return undefined;
  }

  return { h: hue, s: saturation, v: valueChannel };
}

export function parseCmykString(value: string): CmykColor | undefined {
  const match = value
    .trim()
    .match(/^cmyk\(\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*\)$/i) ??
    value.trim().match(/^(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%$/i);

  if (!match) {
    return undefined;
  }

  const cyan = Number(match[1]);
  const magenta = Number(match[2]);
  const yellow = Number(match[3]);
  const black = Number(match[4]);

  if ([cyan, magenta, yellow, black].some((channel) => !Number.isFinite(channel))) {
    return undefined;
  }

  if ([cyan, magenta, yellow, black].some((channel) => channel < 0 || channel > 100)) {
    return undefined;
  }

  return { c: cyan, m: magenta, y: yellow, k: black };
}

export function rgbaString(color: RgbColor, alpha = 1): string {
  const clampedAlpha = clamp(alpha, 0, 1);
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${roundTo(clampedAlpha, 3)})`;
}

export function colorFromAnyInput(value: string): RgbColor | undefined {
  const hex = normalizeHexColor(value);
  if (hex) {
    return hexToRgb(hex);
  }

  const rgb = parseRgbString(value);
  if (rgb) {
    return rgb;
  }

  const hsl = parseHslString(value);
  if (hsl) {
    return hslToRgb(hsl);
  }

  const hsv = parseHsvString(value);
  if (hsv) {
    return hsvToRgb(hsv);
  }

  const cmyk = parseCmykString(value);
  if (cmyk) {
    return cmykToRgb(cmyk);
  }

  return undefined;
}
