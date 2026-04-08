import { describe, expect, it } from 'vitest';
import {
  decodeBase32,
  decodeBase58,
  decodeJwt,
  encodeBase32,
  encodeBase58,
  inspectCryptoInput
} from './crypto-modern';

describe('modern crypto helpers', () => {
  it('round-trips Base32', () => {
    const encoded = encodeBase32('hello world');
    expect(decodeBase32(encoded)).toBe('hello world');
  });

  it('round-trips Base58', () => {
    const encoded = encodeBase58('hello world');
    expect(decodeBase58(encoded)).toBe('hello world');
  });

  it('decodes JWT shape and payload', () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.' +
      'signature';
    const decoded = decodeJwt(token);
    expect(decoded.validShape).toBe(true);
    expect(decoded.payload?.name).toBe('John');
  });

  it('classifies common crypto formats', () => {
    expect(inspectCryptoInput('aabbccdd').kind).toBe('hex');
    expect(inspectCryptoInput('... --- ...').kind).toBe('morse');
    expect(inspectCryptoInput('JBSWY3DP').kind).toBe('base32');
  });
});