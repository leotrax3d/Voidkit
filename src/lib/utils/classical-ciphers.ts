import { normalizeKey } from './ciphers';

export type CipherMode = 'encode' | 'decode';

export type CipherTransform = {
  output: string;
  warnings: string[];
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const POLYBIUS_COORDS = ['A', 'D', 'F', 'G', 'X'] as const;
const POLYBIUS_COORDS_6 = ['A', 'D', 'F', 'G', 'V', 'X'] as const;

const BACON_TABLE: Record<string, string> = {
  A: 'AAAAA', B: 'AAAAB', C: 'AAABA', D: 'AAABB', E: 'AABAA', F: 'AABAB', G: 'AABBA', H: 'AABBB',
  I: 'ABAAA', J: 'ABAAB', K: 'ABABA', L: 'ABABB', M: 'ABBAA', N: 'ABBAB', O: 'ABBBA', P: 'ABBBB',
  Q: 'BAAAA', R: 'BAAAB', S: 'BAABA', T: 'BAABB', U: 'BABAA', V: 'BABAB', W: 'BABBA', X: 'BABBB',
  Y: 'BBAAA', Z: 'BBAAB'
};

const BACON_REVERSE = Object.fromEntries(Object.entries(BACON_TABLE).map(([key, value]) => [value, key]));

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const tmp = y;
    y = x % y;
    x = tmp;
  }
  return x;
}

function modInverse(value: number, modulus: number): number | undefined {
  const normalized = mod(value, modulus);
  for (let i = 1; i < modulus; i += 1) {
    if (mod(normalized * i, modulus) === 1) {
      return i;
    }
  }
  return undefined;
}

function normalizeLetter(char: string): string | null {
  if (!/[A-Za-z]/.test(char)) return null;
  const upper = char.toUpperCase();
  return upper === 'J' ? 'I' : upper;
}

function normalizeLetterKey(key: string, label: string): string {
  const normalized = normalizeKey(key);
  if (!normalized) {
    throw new Error(`${label} must contain at least one letter.`);
  }
  return normalized;
}

function parseInteger(input: string, label: string): number {
  const value = Number(input);
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer.`);
  }
  return value;
}

export function validateAffineKeys(aInput: string, bInput: string): { a: number; b: number } {
  const a = parseInteger(aInput, 'Key a');
  const b = parseInteger(bInput, 'Key b');

  if (gcd(a, 26) !== 1) {
    throw new Error('Key a must be coprime with 26 (e.g., 1,3,5,7,9,11,15,17,19,21,23,25).');
  }

  return { a: mod(a, 26), b: mod(b, 26) };
}

export function affineCipher(text: string, a: number, b: number, mode: CipherMode): CipherTransform {
  const warnings = new Set<string>();
  const inverse = mode === 'decode' ? modInverse(a, 26) : undefined;

  if (mode === 'decode' && inverse === undefined) {
    throw new Error('Key a has no modular inverse in mod 26.');
  }

  const output = [...text]
    .map((char) => {
      if (!/[A-Za-z]/.test(char)) return char;
      const upper = char.toUpperCase();
      const x = upper.charCodeAt(0) - 65;
      const y = mode === 'encode' ? mod(a * x + b, 26) : mod((inverse ?? 1) * (x - b), 26);
      const transformed = String.fromCharCode(65 + y);
      return char === upper ? transformed : transformed.toLowerCase();
    })
    .join('');

  if (text.length === 0) {
    warnings.add('Input is empty.');
  }

  return { output, warnings: [...warnings] };
}

type PolybiusMaps = {
  encodeMap: Record<string, string>;
  decodeMap: Record<string, string>;
};

function buildPolybiusMaps(squareKey: string): PolybiusMaps {
  const key = normalizeKey(squareKey).replace(/J/g, 'I');
  const alphabet = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
  const seen = new Set<string>();
  const sequence = `${key}${alphabet}`.split('').filter((char) => {
    if (seen.has(char)) return false;
    seen.add(char);
    return true;
  });

  const encodeMap: Record<string, string> = {};
  const decodeMap: Record<string, string> = {};

  for (let i = 0; i < sequence.length; i += 1) {
    const row = Math.floor(i / 5) + 1;
    const col = (i % 5) + 1;
    const coord = `${row}${col}`;
    encodeMap[sequence[i]] = coord;
    decodeMap[coord] = sequence[i];
  }

  return { encodeMap, decodeMap };
}

export function polybiusSquare(text: string, squareKey: string, mode: CipherMode): CipherTransform {
  const warnings = new Set<string>();
  const { encodeMap, decodeMap } = buildPolybiusMaps(squareKey);

  if (mode === 'encode') {
    const out = [...text]
      .map((char) => {
        const letter = normalizeLetter(char);
        if (!letter) return char;
        return encodeMap[letter] ?? char;
      })
      .join('');

    if (/[Jj]/.test(text)) {
      warnings.add('Letter J is merged into I in Polybius square mode.');
    }

    return { output: out, warnings: [...warnings] };
  }

  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (/[1-5]/.test(char)) {
      const next = text[i + 1];
      if (!next || !/[1-5]/.test(next)) {
        throw new Error('Polybius decode expects complete digit pairs in the 1-5 range.');
      }
      const pair = `${char}${next}`;
      out += decodeMap[pair] ?? '?';
      i += 1;
      continue;
    }
    out += char;
  }

  return { output: out, warnings: [...warnings] };
}

export function baconCipher(text: string, mode: CipherMode): CipherTransform {
  const warnings = new Set<string>();

  if (mode === 'encode') {
    const out = [...text]
      .map((char) => {
        if (!/[A-Za-z]/.test(char)) return char;
        return BACON_TABLE[char.toUpperCase()] ?? char;
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return { output: out, warnings: [...warnings] };
  }

  const compact = text.toUpperCase().replace(/[^AB]/g, '');
  if (compact.length % 5 !== 0) {
    throw new Error('Bacon decode expects A/B symbols in groups of 5.');
  }

  let out = '';
  for (let i = 0; i < compact.length; i += 5) {
    const token = compact.slice(i, i + 5);
    out += BACON_REVERSE[token] ?? '?';
  }

  return { output: out, warnings: [...warnings] };
}

export function beaufortCipher(text: string, keyword: string): CipherTransform {
  const key = normalizeLetterKey(keyword, 'Keyword');
  let keyIndex = 0;

  const output = [...text]
    .map((char) => {
      if (!/[A-Za-z]/.test(char)) return char;
      const p = char.toUpperCase().charCodeAt(0) - 65;
      const k = key.charCodeAt(keyIndex % key.length) - 65;
      keyIndex += 1;
      const c = mod(k - p, 26);
      const transformed = String.fromCharCode(65 + c);
      return char === char.toUpperCase() ? transformed : transformed.toLowerCase();
    })
    .join('');

  return { output, warnings: [] };
}

export function autokeyCipher(text: string, keyword: string, mode: CipherMode): CipherTransform {
  const key = normalizeLetterKey(keyword, 'Keyword');
  let dynamicKey = key;
  const warnings = new Set<string>();

  const outputChars: string[] = [];

  for (const char of text) {
    if (!/[A-Za-z]/.test(char)) {
      outputChars.push(char);
      continue;
    }

    const upper = char.toUpperCase();
    const pOrC = upper.charCodeAt(0) - 65;
    const k = dynamicKey.charCodeAt(0) - 65;
    dynamicKey = dynamicKey.slice(1);

    if (mode === 'encode') {
      const c = mod(pOrC + k, 26);
      const transformed = String.fromCharCode(65 + c);
      outputChars.push(char === upper ? transformed : transformed.toLowerCase());
      dynamicKey += upper;
    } else {
      const p = mod(pOrC - k, 26);
      const transformed = String.fromCharCode(65 + p);
      outputChars.push(char === upper ? transformed : transformed.toLowerCase());
      dynamicKey += transformed;
    }
  }

  if (text.length === 0) warnings.add('Input is empty.');
  return { output: outputChars.join(''), warnings: [...warnings] };
}

export function validateGronsfeldKey(key: string): string {
  const clean = key.trim();
  if (!/^[0-9]+$/.test(clean)) {
    throw new Error('Gronsfeld key must contain digits only.');
  }
  return clean;
}

export function gronsfeldCipher(text: string, numericKey: string, mode: CipherMode): CipherTransform {
  const key = validateGronsfeldKey(numericKey);
  let keyIndex = 0;

  const output = [...text]
    .map((char) => {
      if (!/[A-Za-z]/.test(char)) return char;
      const shift = Number(key[keyIndex % key.length]);
      keyIndex += 1;
      const code = char.toUpperCase().charCodeAt(0) - 65;
      const transformedCode = mode === 'encode' ? mod(code + shift, 26) : mod(code - shift, 26);
      const transformed = String.fromCharCode(65 + transformedCode);
      return char === char.toUpperCase() ? transformed : transformed.toLowerCase();
    })
    .join('');

  return { output, warnings: [] };
}

export function portaCipher(text: string, keyword: string): CipherTransform {
  const key = normalizeLetterKey(keyword, 'Keyword');
  let keyIndex = 0;

  const output = [...text]
    .map((char) => {
      if (!/[A-Za-z]/.test(char)) return char;
      const upper = char.toUpperCase();
      const p = upper.charCodeAt(0) - 65;
      const k = Math.floor((key.charCodeAt(keyIndex % key.length) - 65) / 2);
      keyIndex += 1;

      const mapped = p < 13 ? ((p + k) % 13) + 13 : mod(p - k, 13);
      const transformed = String.fromCharCode(65 + mapped);
      return char === upper ? transformed : transformed.toLowerCase();
    })
    .join('');

  return { output, warnings: [] };
}

function keywordOrder(keyword: string): number[] {
  const clean = normalizeLetterKey(keyword, 'Transposition key');
  return clean
    .split('')
    .map((char, index) => ({ char, index }))
    .sort((a, b) => (a.char === b.char ? a.index - b.index : a.char.localeCompare(b.char)))
    .map((item) => item.index);
}

function columnarEncryptRaw(text: string, keyword: string): string {
  const order = keywordOrder(keyword);
  const cols = order.length;
  const rows = Math.ceil(text.length / cols);
  const padded = text.padEnd(rows * cols, 'X');
  const grid: string[][] = Array.from({ length: rows }, (_, row) =>
    padded.slice(row * cols, row * cols + cols).split('')
  );

  let out = '';
  order.forEach((col) => {
    for (let row = 0; row < rows; row += 1) {
      out += grid[row][col];
    }
  });

  return out;
}

function columnarDecryptRaw(text: string, keyword: string): string {
  const order = keywordOrder(keyword);
  const cols = order.length;
  if (text.length % cols !== 0) {
    throw new Error('Ciphertext length must be divisible by transposition key length.');
  }

  const rows = text.length / cols;
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(''));
  let cursor = 0;

  order.forEach((col) => {
    for (let row = 0; row < rows; row += 1) {
      grid[row][col] = text[cursor] ?? 'X';
      cursor += 1;
    }
  });

  return grid.map((row) => row.join('')).join('');
}

type FractionationMaps = {
  toPair: Record<string, string>;
  fromPair: Record<string, string>;
};

function buildFractionationMaps(squareKey: string, alphabet: string, coords: readonly string[]): FractionationMaps {
  const key = normalizeKey(squareKey).replace(/J/g, 'I');
  const baseAlphabet = alphabet;
  const seen = new Set<string>();
  const sequence = `${key}${baseAlphabet}`.split('').filter((char) => {
    if (!baseAlphabet.includes(char)) return false;
    if (seen.has(char)) return false;
    seen.add(char);
    return true;
  });

  const toPair: Record<string, string> = {};
  const fromPair: Record<string, string> = {};

  for (let index = 0; index < sequence.length; index += 1) {
    const row = Math.floor(index / coords.length);
    const col = index % coords.length;
    const pair = `${coords[row]}${coords[col]}`;
    toPair[sequence[index]] = pair;
    fromPair[pair] = sequence[index];
  }

  return { toPair, fromPair };
}

function fractionationCipher(
  text: string,
  squareKey: string,
  transpositionKey: string,
  alphabet: string,
  coords: readonly string[],
  mode: CipherMode
): CipherTransform {
  const warnings = new Set<string>();
  const { toPair, fromPair } = buildFractionationMaps(squareKey, alphabet, coords);

  if (mode === 'encode') {
    let normalized = '';
    let dropped = 0;
    for (const rawChar of text.toUpperCase()) {
      const char = rawChar === 'J' && alphabet.includes('I') && !alphabet.includes('J') ? 'I' : rawChar;
      if (!alphabet.includes(char)) {
        if (/[A-Z0-9]/.test(rawChar)) {
          dropped += 1;
        }
        continue;
      }
      if (!toPair[char]) {
        dropped += 1;
        continue;
      }
      normalized += char;
    }

    if (dropped > 0) {
      warnings.add(`${dropped} unsupported characters were skipped during encoding.`);
    }

    const fractionated = normalized
      .split('')
      .map((char) => toPair[char])
      .join('');

    return {
      output: columnarEncryptRaw(fractionated, transpositionKey),
      warnings: [...warnings]
    };
  }

  const restored = columnarDecryptRaw(normalizeKey(text), transpositionKey);
  if (restored.length % 2 !== 0) {
    throw new Error('Decoded fractionation stream is malformed (odd pair count).');
  }

  let out = '';
  for (let i = 0; i < restored.length; i += 2) {
    const pair = restored.slice(i, i + 2);
    out += fromPair[pair] ?? '?';
  }

  return { output: out, warnings: [...warnings] };
}

export function adfgxCipher(
  text: string,
  squareKey: string,
  transpositionKey: string,
  mode: CipherMode
): CipherTransform {
  return fractionationCipher(text, squareKey, transpositionKey, 'ABCDEFGHIKLMNOPQRSTUVWXYZ', POLYBIUS_COORDS, mode);
}

export function adfgvxCipher(
  text: string,
  squareKey: string,
  transpositionKey: string,
  mode: CipherMode
): CipherTransform {
  return fractionationCipher(text, squareKey, transpositionKey, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', POLYBIUS_COORDS_6, mode);
}

function polybiusNumber(char: string, key: string): number {
  const { encodeMap } = buildPolybiusMaps(key);
  const letter = normalizeLetter(char);
  if (!letter) {
    throw new Error(`Unsupported character '${char}' for Nihilist cipher.`);
  }
  const coord = encodeMap[letter];
  if (!coord) {
    throw new Error(`Character '${char}' is not in the configured Polybius square.`);
  }
  return Number(coord);
}

function keyNumbersFromKeyword(keyword: string, squareKey: string): number[] {
  const clean = normalizeLetterKey(keyword, 'Keyword').replace(/J/g, 'I');
  return clean.split('').map((char) => polybiusNumber(char, squareKey));
}

export function nihilistCipher(
  text: string,
  keyword: string,
  squareKey: string,
  mode: CipherMode
): CipherTransform {
  const warnings = new Set<string>();
  const keyNumbers = keyNumbersFromKeyword(keyword, squareKey);
  const { decodeMap } = buildPolybiusMaps(squareKey);

  if (mode === 'encode') {
    const letters = normalizeKey(text).replace(/J/g, 'I');
    if (!letters.length) {
      return { output: '', warnings: ['No encodable letters found in input.'] };
    }

    const out = letters
      .split('')
      .map((char, index) => {
        const base = polybiusNumber(char, squareKey);
        return String(base + keyNumbers[index % keyNumbers.length]);
      })
      .join(' ');

    return { output: out, warnings: [...warnings] };
  }

  const tokens = text
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) {
    return { output: '', warnings: ['No numeric groups found in input.'] };
  }

  if (tokens.some((token) => !/^\d+$/.test(token))) {
    throw new Error('Nihilist decode expects whitespace-separated integer groups.');
  }

  const out = tokens
    .map((token, index) => {
      const value = Number(token) - keyNumbers[index % keyNumbers.length];
      const pair = String(value).padStart(2, '0');
      const decoded = decodeMap[pair];
      if (!decoded) {
        throw new Error(`Decoded pair '${pair}' is outside the Polybius square.`);
      }
      return decoded;
    })
    .join('');

  return { output: out, warnings: [...warnings] };
}
