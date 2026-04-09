import { describe, expect, it } from 'vitest';
import {
  adfgvxCipher,
  adfgxCipher,
  affineCipher,
  autokeyCipher,
  baconCipher,
  beaufortCipher,
  gronsfeldCipher,
  nihilistCipher,
  polybiusSquare,
  portaCipher,
  validateAffineKeys
} from './classical-ciphers';

describe('classical-ciphers utility', () => {
  it('round-trips Affine cipher', () => {
    const encoded = affineCipher('Attack at dawn!', 5, 8, 'encode').output;
    const decoded = affineCipher(encoded, 5, 8, 'decode').output;
    expect(decoded).toBe('Attack at dawn!');
  });

  it('validates Affine key invertibility', () => {
    expect(() => validateAffineKeys('13', '8')).toThrow('coprime with 26');
  });

  it('round-trips Polybius square', () => {
    const encoded = polybiusSquare('HELLO WORLD', '', 'encode').output;
    const decoded = polybiusSquare(encoded, '', 'decode').output;
    expect(decoded.replace(/[^A-Z]/g, '')).toBe('HELLOWORLD');
  });

  it('round-trips Bacon cipher', () => {
    const encoded = baconCipher('HELLO', 'encode').output;
    const decoded = baconCipher(encoded, 'decode').output;
    expect(decoded).toBe('HELLO');
  });

  it('handles Beaufort reciprocal transform', () => {
    const encoded = beaufortCipher('DEFENDTHEEASTWALL', 'FORTIFY').output;
    const decoded = beaufortCipher(encoded, 'FORTIFY').output;
    expect(decoded).toBe('DEFENDTHEEASTWALL');
  });

  it('round-trips Autokey cipher', () => {
    const encoded = autokeyCipher('ATTACKATDAWN', 'QUEENLY', 'encode').output;
    const decoded = autokeyCipher(encoded, 'QUEENLY', 'decode').output;
    expect(decoded).toBe('ATTACKATDAWN');
  });

  it('validates Gronsfeld key and round-trips', () => {
    expect(() => gronsfeldCipher('HELLO', '12A', 'encode')).toThrow('digits only');

    const encoded = gronsfeldCipher('HELLO WORLD', '31415', 'encode').output;
    const decoded = gronsfeldCipher(encoded, '31415', 'decode').output;
    expect(decoded).toBe('HELLO WORLD');
  });

  it('round-trips Porta cipher via reciprocal transform', () => {
    const encoded = portaCipher('ATTACKATDAWN', 'PORTA').output;
    const decoded = portaCipher(encoded, 'PORTA').output;
    expect(decoded).toBe('ATTACKATDAWN');
  });

  it('round-trips ADFGX cipher', () => {
    const encoded = adfgxCipher('ATTACKATONCE', 'GERMAN', 'CIPHER', 'encode').output;
    const decoded = adfgxCipher(encoded, 'GERMAN', 'CIPHER', 'decode').output;
    expect(decoded.startsWith('ATTACKATONCE')).toBe(true);
  });

  it('round-trips ADFGVX cipher with digits', () => {
    const encoded = adfgvxCipher('MEETAT0900', 'MATRIX', 'ENIGMA', 'encode').output;
    const decoded = adfgvxCipher(encoded, 'MATRIX', 'ENIGMA', 'decode').output;
    expect(decoded.startsWith('MEETAT0900')).toBe(true);
  });

  it('round-trips Nihilist cipher and rejects malformed numeric tokens', () => {
    const encoded = nihilistCipher('DEFENDTHEEASTWALL', 'KEY', '', 'encode').output;
    const decoded = nihilistCipher(encoded, 'KEY', '', 'decode').output;
    expect(decoded).toBe('DEFENDTHEEASTWALL');

    expect(() => nihilistCipher('12 xx 44', 'KEY', '', 'decode')).toThrow('whitespace-separated integer groups');
  });
});
