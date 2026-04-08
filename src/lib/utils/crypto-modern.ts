import { normalizeHexColor } from './color';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function fromUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function fromUtf8Buffer(value: string): ArrayBuffer {
  const bytes = fromUtf8(value);
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

function toUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export async function hashText(algorithm: 'SHA-256' | 'SHA-512' | 'MD5' | 'BLAKE3', text: string): Promise<string> {
  if (algorithm === 'MD5' || algorithm === 'BLAKE3') {
    throw new Error(`${algorithm} is not available in the current browser runtime. Use SHA-256 or SHA-512.`);
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable in this environment.');
  }

  const digest = await crypto.subtle.digest(algorithm, fromUtf8Buffer(text));
  return toHex(new Uint8Array(digest));
}

export async function hmacText(algorithm: 'SHA-256' | 'SHA-512', key: string, message: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable in this environment.');
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    fromUtf8Buffer(key),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, fromUtf8Buffer(message));
  return toHex(new Uint8Array(signature));
}

export function encodeBase64(value: string): string {
  const bytes = fromUtf8(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function decodeBase64(value: string): string {
  const binary = atob(value.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return toUtf8(bytes);
}

export function encodeBase32(input: string): string {
  const bytes = fromUtf8(input);
  let bits = 0;
  let value = 0;
  let output = '';

  bytes.forEach((byte) => {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  });

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  while (output.length % 8 !== 0) {
    output += '=';
  }

  return output;
}

export function decodeBase32(input: string): string {
  const clean = input.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  clean.split('').forEach((char) => {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid Base32 input.');
    }

    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  });

  return toUtf8(new Uint8Array(bytes));
}

export function encodeBase58(input: string): string {
  const bytes = fromUtf8(input);
  let num = 0n;
  bytes.forEach((byte) => {
    num = (num << 8n) + BigInt(byte);
  });

  let output = '';
  while (num > 0n) {
    const mod = Number(num % 58n);
    output = BASE58_ALPHABET[mod] + output;
    num /= 58n;
  }

  for (let i = 0; i < bytes.length && bytes[i] === 0; i += 1) {
    output = `1${output}`;
  }

  return output || '1';
}

export function decodeBase58(input: string): string {
  let num = 0n;
  for (const char of input.trim()) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid Base58 input.');
    }

    num = num * 58n + BigInt(index);
  }

  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num /= 256n;
  }

  for (let i = 0; i < input.length && input[i] === '1'; i += 1) {
    bytes.unshift(0);
  }

  return toUtf8(new Uint8Array(bytes));
}

export type JwtDecoded = {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string;
  validShape: boolean;
};

function decodeJwtPart(part: string): Record<string, unknown> | null {
  try {
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLength);
    const raw = atob(padded);
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function decodeJwt(token: string): JwtDecoded {
  const parts = token.trim().split('.');
  if (parts.length < 2) {
    return { header: null, payload: null, signature: '', validShape: false };
  }

  return {
    header: decodeJwtPart(parts[0]),
    payload: decodeJwtPart(parts[1]),
    signature: parts[2] ?? '',
    validShape: parts.length === 3
  };
}

export async function passwordHashFallback(password: string, salt: string, iterations = 120000): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable in this environment.');
  }

  const baseKey = await crypto.subtle.importKey('raw', fromUtf8Buffer(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: fromUtf8Buffer(salt),
      iterations
    },
    baseKey,
    256
  );

  return toHex(new Uint8Array(bits));
}

export type CryptoClassification = {
  kind: 'unknown' | 'jwt' | 'hex' | 'base64' | 'base32' | 'base58' | 'morse';
  confidence: 'low' | 'medium' | 'high';
  reason: string;
};

export function inspectCryptoInput(value: string): CryptoClassification {
  const input = value.trim();
  if (!input) {
    return { kind: 'unknown', confidence: 'low', reason: 'Empty input.' };
  }

  if (input.split('.').length === 3) {
    const jwt = decodeJwt(input);
    if (jwt.header && jwt.payload) {
      return { kind: 'jwt', confidence: 'high', reason: 'Looks like a JWT with decodable header and payload.' };
    }
  }

  if (/^[a-f0-9]+$/i.test(input) && input.length % 2 === 0) {
    return { kind: 'hex', confidence: 'high', reason: 'Only hexadecimal characters and even length.' };
  }

  if (/^[A-Z2-7=\s]+$/i.test(input) && input.replace(/\s+/g, '').length >= 8) {
    return { kind: 'base32', confidence: 'medium', reason: 'Matches Base32 alphabet and padding pattern.' };
  }

  if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(input)) {
    return { kind: 'base58', confidence: 'medium', reason: 'Matches Base58 alphabet.' };
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(input) && input.length % 4 === 0) {
    return { kind: 'base64', confidence: 'medium', reason: 'Matches Base64 alphabet and length multiple of four.' };
  }

  if (/^[.\-\s/]+$/.test(input)) {
    return { kind: 'morse', confidence: 'medium', reason: 'Contains only Morse symbols dot, dash, and separators.' };
  }

  return { kind: 'unknown', confidence: 'low', reason: 'No strong signature for a known format.' };
}
