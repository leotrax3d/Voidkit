import { describe, expect, it } from 'vitest';
import {
  caesarCipher,
  columnarTranspositionDecrypt,
  columnarTranspositionEncrypt,
  hillCipher,
  morseDecode,
  morseEncode,
  parseHillMatrix,
  playfairCipher,
  substitutionCipher,
  vigenereCipher
} from './ciphers';

describe('cipher utilities', () => {
  it('computes classic Caesar output', () => {
    expect(caesarCipher('HELLO', 3)).toBe('KHOOR');
    expect(caesarCipher('KHOOR', -3)).toBe('HELLO');
  });

  it('encrypts and decrypts Vigenere text', () => {
    expect(vigenereCipher('ATTACKATDAWN', 'LEMON')).toBe('LXFOPVEFRNHR');
    expect(vigenereCipher('LXFOPVEFRNHR', 'LEMON', true)).toBe('ATTACKATDAWN');
  });

  it('round-trips Playfair text for simple input', () => {
    const encrypted = playfairCipher('CIPHER', 'VOIDKIT');
    const decrypted = playfairCipher(encrypted, 'VOIDKIT', true);
    expect(decrypted).toBe('CIPHER');
  });

  it('round-trips Hill cipher text', () => {
    const matrix = parseHillMatrix('3 3 2 5');
    const encrypted = hillCipher('HELLO', matrix);
    const decrypted = hillCipher(encrypted, matrix, true);
    expect(decrypted).toBe('HELLOX');
  });

  it('applies monoalphabetic substitution', () => {
    const map = 'ZYXWVUTSRQPONMLKJIHGFEDCBA';
    const encrypted = substitutionCipher('Attack', map);
    expect(encrypted).toBe('Zggzxp');
    expect(substitutionCipher(encrypted, map, true)).toBe('Attack');
  });

  it('transposes columns and decrypts padded output', () => {
    const encrypted = columnarTranspositionEncrypt('SECRETMESSAGE', 'VOID');
    const decrypted = columnarTranspositionDecrypt(encrypted.text, 'VOID');
    expect(decrypted.text.startsWith('SECRETMESSAGE')).toBe(true);
  });

  it('encodes and decodes Morse text', () => {
    const encoded = morseEncode('SOS 123');
    expect(encoded).toBe('... --- ... / .---- ..--- ...--');
    expect(morseDecode(encoded)).toBe('SOS 123');
  });
});
