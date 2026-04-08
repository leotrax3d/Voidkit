export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function shiftChar(char: string, shift: number): string {
  const isUpper = char >= 'A' && char <= 'Z';
  const isLower = char >= 'a' && char <= 'z';
  if (!isUpper && !isLower) {
    return char;
  }

  const base = isUpper ? 65 : 97;
  const code = char.charCodeAt(0) - base;
  return String.fromCharCode(base + mod(code + shift, 26));
}

export function caesarCipher(text: string, shift: number): string {
  return text
    .split('')
    .map((char) => shiftChar(char, shift))
    .join('');
}

export function rotCipher(text: string, rotation: number): string {
  return caesarCipher(text, rotation);
}

export function atbashCipher(text: string): string {
  return text
    .split('')
    .map((char) => {
      const isUpper = char >= 'A' && char <= 'Z';
      const isLower = char >= 'a' && char <= 'z';
      if (!isUpper && !isLower) {
        return char;
      }

      const base = isUpper ? 65 : 97;
      const index = char.charCodeAt(0) - base;
      return String.fromCharCode(base + (25 - index));
    })
    .join('');
}

export function normalizeKey(key: string): string {
  return key.replace(/[^a-z]/gi, '').toUpperCase();
}

export function vigenereCipher(text: string, key: string, decrypt = false): string {
  const normalizedKey = normalizeKey(key);
  if (normalizedKey.length === 0) {
    throw new Error('Keyword must contain at least one letter.');
  }

  let keyIndex = 0;
  return text
    .split('')
    .map((char) => {
      const isUpper = char >= 'A' && char <= 'Z';
      const isLower = char >= 'a' && char <= 'z';
      if (!isUpper && !isLower) {
        return char;
      }

      const shift = normalizedKey.charCodeAt(keyIndex % normalizedKey.length) - 65;
      keyIndex += 1;
      return shiftChar(char, decrypt ? -shift : shift);
    })
    .join('');
}

export type PlayfairMatrix = {
  matrix: string[][];
  positions: Record<string, { row: number; col: number }>;
};

function playfairKeyAlphabet(keyword: string): string {
  const cleaned = normalizeKey(keyword).replace(/J/g, 'I');
  const seen = new Set<string>();
  const output: string[] = [];

  const combined = `${cleaned}${ALPHABET.replace('J', '')}`;
  combined.split('').forEach((char) => {
    if (!seen.has(char)) {
      seen.add(char);
      output.push(char);
    }
  });

  return output.join('');
}

export function buildPlayfairMatrix(keyword: string): PlayfairMatrix {
  const sequence = playfairKeyAlphabet(keyword);
  const matrix: string[][] = [];
  const positions: Record<string, { row: number; col: number }> = {};

  for (let row = 0; row < 5; row += 1) {
    matrix[row] = [];
    for (let col = 0; col < 5; col += 1) {
      const char = sequence[row * 5 + col];
      matrix[row][col] = char;
      positions[char] = { row, col };
    }
  }

  return { matrix, positions };
}

function splitDigraphs(input: string, decrypt = false): string[] {
  const chars = normalizeKey(input).replace(/J/g, 'I').split('');
  const digraphs: string[] = [];

  for (let index = 0; index < chars.length; index += 1) {
    const first = chars[index];
    const second = chars[index + 1];

    if (!second) {
      digraphs.push(`${first}${decrypt ? 'X' : 'X'}`);
      continue;
    }

    if (!decrypt && first === second) {
      digraphs.push(`${first}X`);
    } else {
      digraphs.push(`${first}${second}`);
      index += 1;
    }
  }

  return digraphs;
}

export function playfairCipher(text: string, keyword: string, decrypt = false): string {
  const prepared = normalizeKey(text);
  if (prepared.length === 0) {
    return '';
  }

  const { matrix, positions } = buildPlayfairMatrix(keyword);
  const digraphs = splitDigraphs(text, decrypt);

  return digraphs
    .map((pair) => {
      const a = positions[pair[0]];
      const b = positions[pair[1]];
      if (!a || !b) {
        throw new Error('Input contains unsupported characters for Playfair.');
      }

      if (a.row === b.row) {
        const shift = decrypt ? -1 : 1;
        return `${matrix[a.row][mod(a.col + shift, 5)]}${matrix[b.row][mod(b.col + shift, 5)]}`;
      }

      if (a.col === b.col) {
        const shift = decrypt ? -1 : 1;
        return `${matrix[mod(a.row + shift, 5)][a.col]}${matrix[mod(b.row + shift, 5)][b.col]}`;
      }

      return `${matrix[a.row][b.col]}${matrix[b.row][a.col]}`;
    })
    .join('');
}

export type HillMatrix2 = [number, number, number, number];

export function parseHillMatrix(input: string): HillMatrix2 {
  const values = input
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value));

  if (values.length !== 4 || values.some((value) => !Number.isInteger(value))) {
    throw new Error('Hill matrix must contain exactly four integers (2x2).');
  }

  return [values[0], values[1], values[2], values[3]];
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
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

function invertHillMatrix(matrix: HillMatrix2): HillMatrix2 {
  const [a, b, c, d] = matrix;
  const determinant = mod(a * d - b * c, 26);

  if (gcd(determinant, 26) !== 1) {
    throw new Error('Matrix is not invertible modulo 26.');
  }

  const invDet = modInverse(determinant, 26);
  if (invDet === undefined) {
    throw new Error('Matrix inverse could not be calculated.');
  }

  return [
    mod(invDet * d, 26),
    mod(invDet * -b, 26),
    mod(invDet * -c, 26),
    mod(invDet * a, 26)
  ];
}

function normalizePlaintext(text: string): string {
  const cleaned = normalizeKey(text);
  return cleaned.length % 2 === 0 ? cleaned : `${cleaned}X`;
}

function hillTransformPair(pair: string, matrix: HillMatrix2): string {
  const [a, b, c, d] = matrix;
  const x = pair.charCodeAt(0) - 65;
  const y = pair.charCodeAt(1) - 65;
  const out1 = mod(a * x + b * y, 26);
  const out2 = mod(c * x + d * y, 26);
  return String.fromCharCode(65 + out1, 65 + out2);
}

export function hillCipher(text: string, matrix: HillMatrix2, decrypt = false): string {
  const clean = normalizePlaintext(text);
  if (clean.length === 0) {
    return '';
  }

  const workingMatrix = decrypt ? invertHillMatrix(matrix) : matrix;
  let output = '';
  for (let i = 0; i < clean.length; i += 2) {
    output += hillTransformPair(clean.slice(i, i + 2), workingMatrix);
  }

  return output;
}

export function normalizeSubstitutionMap(mapInput: string): string {
  const cleaned = normalizeKey(mapInput);
  if (cleaned.length !== 26) {
    throw new Error('Substitution map must contain exactly 26 letters.');
  }

  const unique = new Set(cleaned.split(''));
  if (unique.size !== 26) {
    throw new Error('Substitution map must contain each letter exactly once.');
  }

  return cleaned;
}

export function randomSubstitutionMap(): string {
  const chars = ALPHABET.split('');
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const random = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[random]] = [chars[random], chars[i]];
  }

  return chars.join('');
}

export function substitutionCipher(text: string, mapInput: string, decrypt = false): string {
  const map = normalizeSubstitutionMap(mapInput);
  const source = decrypt ? map : ALPHABET;
  const target = decrypt ? ALPHABET : map;

  return text
    .split('')
    .map((char) => {
      const upper = char.toUpperCase();
      const index = source.indexOf(upper);
      if (index === -1) {
        return char;
      }

      const out = target[index];
      return char === upper ? out : out.toLowerCase();
    })
    .join('');
}

export type ColumnarResult = {
  text: string;
  grid: string[][];
};

function keywordOrder(keyword: string): number[] {
  const clean = normalizeKey(keyword);
  if (!clean.length) {
    throw new Error('Keyword must contain at least one letter.');
  }

  return clean
    .split('')
    .map((char, index) => ({ char, index }))
    .sort((a, b) => (a.char === b.char ? a.index - b.index : a.char.localeCompare(b.char)))
    .map((item) => item.index);
}

export function columnarTranspositionEncrypt(text: string, keyword: string): ColumnarResult {
  const clean = normalizeKey(text);
  if (!clean.length) {
    return { text: '', grid: [] };
  }

  const order = keywordOrder(keyword);
  const columns = order.length;
  const rows = Math.ceil(clean.length / columns);
  const padded = clean.padEnd(rows * columns, 'X');
  const grid: string[][] = Array.from({ length: rows }, (_, row) =>
    padded.slice(row * columns, row * columns + columns).split('')
  );

  let output = '';
  order.forEach((columnIndex) => {
    for (let row = 0; row < rows; row += 1) {
      output += grid[row][columnIndex];
    }
  });

  return { text: output, grid };
}

export function columnarTranspositionDecrypt(text: string, keyword: string): ColumnarResult {
  const clean = normalizeKey(text);
  if (!clean.length) {
    return { text: '', grid: [] };
  }

  const order = keywordOrder(keyword);
  const columns = order.length;
  if (clean.length % columns !== 0) {
    throw new Error('Ciphertext length must be divisible by keyword length for this demo decryptor.');
  }

  const rows = clean.length / columns;
  const grid: string[][] = Array.from({ length: rows }, () => Array(columns).fill(''));
  let cursor = 0;

  order.forEach((columnIndex) => {
    for (let row = 0; row < rows; row += 1) {
      grid[row][columnIndex] = clean[cursor];
      cursor += 1;
    }
  });

  return {
    text: grid.map((row) => row.join('')).join(''),
    grid
  };
}

const MORSE_TABLE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
  K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
  U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.'
};

const MORSE_REVERSE = Object.fromEntries(Object.entries(MORSE_TABLE).map(([key, value]) => [value, key]));

export function morseEncode(input: string): string {
  return input
    .toUpperCase()
    .split(' ')
    .map((word) => word.split('').map((char) => MORSE_TABLE[char] ?? '?').join(' '))
    .join(' / ');
}

export function morseDecode(input: string): string {
  return input
    .trim()
    .split(' / ')
    .map((word) =>
      word
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => MORSE_REVERSE[token] ?? '?')
        .join('')
    )
    .join(' ');
}

const POLYBIUS = ['11', '12', '13', '14', '15', '21', '22', '23', '24', '25', '31', '32', '33', '34', '35', '41', '42', '43', '44', '45', '51', '52', '53', '54', '55'];
const POLYBIUS_ALPHABET = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';

export function polybiusEncode(input: string): string {
  return normalizeKey(input)
    .replace(/J/g, 'I')
    .split('')
    .map((char) => POLYBIUS[POLYBIUS_ALPHABET.indexOf(char)] ?? '')
    .join(' ')
    .trim();
}

export function polybiusDecode(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .map((token) => {
      const index = POLYBIUS.indexOf(token);
      return index === -1 ? '?' : POLYBIUS_ALPHABET[index];
    })
    .join('');
}

const BACON_TABLE: Record<string, string> = {
  A: 'AAAAA', B: 'AAAAB', C: 'AAABA', D: 'AAABB', E: 'AABAA', F: 'AABAB', G: 'AABBA', H: 'AABBB',
  I: 'ABAAA', J: 'ABAAB', K: 'ABABA', L: 'ABABB', M: 'ABBAA', N: 'ABBAB', O: 'ABBBA', P: 'ABBBB',
  Q: 'BAAAA', R: 'BAAAB', S: 'BAABA', T: 'BAABB', U: 'BABAA', V: 'BABAB', W: 'BABBA', X: 'BABBB',
  Y: 'BBAAA', Z: 'BBAAB'
};

const BACON_REVERSE = Object.fromEntries(Object.entries(BACON_TABLE).map(([key, value]) => [value, key]));

export function baconEncode(input: string): string {
  return normalizeKey(input)
    .split('')
    .map((char) => BACON_TABLE[char] ?? '')
    .join(' ')
    .trim();
}

export function baconDecode(input: string): string {
  const normalized = input.toUpperCase().replace(/[^AB]/g, '');
  if (normalized.length % 5 !== 0) {
    throw new Error('Bacon input must contain groups of 5 A/B characters.');
  }

  let output = '';
  for (let i = 0; i < normalized.length; i += 5) {
    const token = normalized.slice(i, i + 5);
    output += BACON_REVERSE[token] ?? '?';
  }

  return output;
}
