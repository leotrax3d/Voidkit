import { describe, expect, it } from 'vitest';
import { caesarCipher, columnarTranspositionEncrypt, substitutionCipher, vigenereCipher } from './ciphers';
import { analyzeCipherBatch, analyzeCipherString } from './cipher-inspector';

function railFenceEncode(text: string, rails: number): string {
  const clean = text.replace(/\s+/g, '');
  const rows = Array.from({ length: rails }, () => [] as string[]);
  let rail = 0;
  let direction = 1;

  for (const char of clean) {
    rows[rail].push(char);
    rail += direction;
    if (rail === 0 || rail === rails - 1) direction *= -1;
  }

  return rows.flat().join('');
}

describe('cipher inspector engine', () => {
  it('detects Caesar and ROT13 patterns', () => {
    const caesar = analyzeCipherString('KHOOR ZRUOG');
    expect(caesar.topMatch.kind).toBe('caesar');
    expect(caesar.topMatch.name).toContain('shift 3');

    const rot13 = analyzeCipherString('URYYB, JBEYQ!');
    expect(rot13.topMatch.kind).toBe('rot13');
    expect(rot13.topMatch.name).toBe('ROT13');
  });

  it('detects Atbash output', () => {
    const report = analyzeCipherString('SVOOL DLIOW');
    expect(report.topMatch.kind).toBe('atbash');
    expect(report.topMatch.confidence).toBeGreaterThanOrEqual(70);
  });

  it('detects Vigenere-like periodicity', () => {
    const encrypted = vigenereCipher('ATTACKATDAWNATTACKATDAWN', 'LEMON');
    const report = analyzeCipherString(encrypted);
    expect(report.candidates.some((candidate) => candidate.kind === 'vigenere')).toBe(true);
    expect(report.topMatch.confidence).toBeGreaterThanOrEqual(45);
  });

  it('detects substitution and transposition heuristics', () => {
    const substitutionMap = 'QWERTYUIOPASDFGHJKLZXCVBNM';
    const substitutionCiphertext = substitutionCipher('THIS IS A LONGER SUBSTITUTION SAMPLE', substitutionMap);
    const substitutionReport = analyzeCipherString(substitutionCiphertext);
    expect(substitutionReport.candidates.some((candidate) => candidate.kind === 'substitution')).toBe(true);

    const railFenceCiphertext = railFenceEncode('WEAREDISCOVEREDFLEEATONCE', 3);
    const railFenceReport = analyzeCipherString(railFenceCiphertext);
    expect(railFenceReport.candidates.some((candidate) => candidate.kind === 'rail-fence')).toBe(true);

    const columnarCiphertext = columnarTranspositionEncrypt('WEAREDISCOVEREDFLEEATONCE', 'ZEBRA').text;
    const columnarReport = analyzeCipherString(columnarCiphertext);
    expect(columnarReport.candidates.some((candidate) => candidate.kind === 'columnar-transposition')).toBe(true);
  });

  it('detects Morse and Polybius patterns', () => {
    const morseReport = analyzeCipherString('.... . .-.. .-.. --- / .-- --- .-. .-.. -..');
    expect(morseReport.topMatch.kind).toBe('morse');

    const polybiusReport = analyzeCipherString('23 15 31 31 34');
    expect(polybiusReport.topMatch.kind).toBe('polybius');
  });

  it('handles ambiguous and very short inputs conservatively', () => {
    const shortReport = analyzeCipherString('ab');
    expect(['unknown', 'plain-text']).toContain(shortReport.topMatch.kind);
    expect(shortReport.topMatch.confidence).toBeLessThanOrEqual(60);

    const ambiguousReport = analyzeCipherString('This looks like ordinary text with no obvious cipher.');
    expect(['plain-text', 'unknown']).toContain(ambiguousReport.topMatch.kind);
  });

  it('ranks candidates deterministically', () => {
    const input = 'KHOOR ZRUOG';
    const first = analyzeCipherString(input);
    const second = analyzeCipherString(input);

    expect(first.topMatch.kind).toBe(second.topMatch.kind);
    expect(first.topMatch.confidence).toBe(second.topMatch.confidence);
    expect(first.candidates.map((candidate) => candidate.kind)).toEqual(second.candidates.map((candidate) => candidate.kind));
  });

  it('supports batch inspection of multiple lines', () => {
    const batch = analyzeCipherBatch(['KHOOR ZRUOG', 'SVOOL DLIOW', '.... . .-.. .-.. ---'].join('\n'), 'batch');
    expect(batch.reports).toHaveLength(3);
    expect(batch.reports[0].report.topMatch.kind).toBe('caesar');
    expect(batch.reports[2].report.topMatch.kind).toBe('morse');
  });

  it('includes decoder previews for likely ciphers', () => {
    const report = analyzeCipherString('KHOOR ZRUOG');
    expect(report.decoderPreviews.length).toBeGreaterThan(0);
  });
});