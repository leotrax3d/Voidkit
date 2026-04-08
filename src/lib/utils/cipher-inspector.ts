import {
  atbashCipher,
  baconDecode,
  columnarTranspositionDecrypt,
  morseDecode,
  polybiusDecode,
  vigenereCipher
} from './ciphers';

export type InspectorMode = 'single' | 'multi' | 'batch';

export type ValidationStatus = 'definite' | 'likely' | 'possible' | 'weak' | 'invalid';

export type CipherKind =
  | 'caesar'
  | 'rot13'
  | 'rot5'
  | 'rot18'
  | 'rot47'
  | 'atbash'
  | 'vigenere'
  | 'affine'
  | 'substitution'
  | 'columnar-transposition'
  | 'rail-fence'
  | 'playfair'
  | 'hill'
  | 'polybius'
  | 'bacon'
  | 'morse'
  | 'plain-text'
  | 'unknown';

export type WarningMessage = {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
};

export type ConfidenceBand = 'definite' | 'likely' | 'possible' | 'weak';

export type CipherMetadata = {
  length: number;
  lineCount: number;
  wordCount: number;
  letterRatio: number;
  digitRatio: number;
  spaceRatio: number;
  punctuationRatio: number;
  uniqueChars: number;
  entropy: number;
  indexOfCoincidence: number;
  repeatedBigrams: number;
  repeatedTrigrams: number;
  likelyPeriods?: number[];
  keyGuess?: string;
  shift?: number;
  affineKey?: { a: number; b: number };
  railFenceRails?: number;
  columnWidth?: number;
  groupSize?: number;
  decodedPreview?: string;
  prefixPattern?: string;
};

export type CipherCandidate = {
  kind: CipherKind;
  name: string;
  confidence: number;
  band: ConfidenceBand;
  validation: ValidationStatus;
  reasons: string[];
  whyLessLikely: string[];
  metadata: CipherMetadata;
  preview?: string;
};

export type CipherPreview = {
  label: string;
  preview: string;
  confidence: number;
  note: string;
};

export type InputSummary = {
  length: number;
  lines: number;
  batchMode: boolean;
  preview: string;
};

export type CipherInspectionReport = {
  inputSummary: InputSummary;
  candidates: CipherCandidate[];
  topMatch: CipherCandidate;
  warnings: WarningMessage[];
  decoderPreviews: CipherPreview[];
};

export type BatchInspectionEntry = {
  index: number;
  valuePreview: string;
  report: CipherInspectionReport;
};

export type BatchInspectionReport = {
  mode: InspectorMode;
  reports: BatchInspectionEntry[];
  warnings: WarningMessage[];
};

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const COMMON_WORDS = ['THE', 'AND', 'ING', 'YOU', 'THAT', 'FOR', 'WITH', 'THIS', 'HAVE', 'FROM', 'NOT', 'ARE', 'WAS', 'BUT', 'ALL'];
const COMMON_BIGRAMS = ['TH', 'HE', 'IN', 'ER', 'AN', 'RE', 'ON', 'AT', 'EN', 'ND', 'TI', 'ES', 'OR', 'TE', 'OF'];
const COMMON_TRIGRAMS = ['THE', 'AND', 'ING', 'HER', 'HAT', 'ERE', 'ENT', 'THA', 'NTH', 'INT'];
const ENGLISH_FREQUENCIES = [8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153, 0.772, 4.025, 2.406, 6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056, 2.758, 0.978, 2.36, 0.15, 1.974, 0.074];
const VALID_MOD26_MULTIPLIERS = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
const ROT47_START = 33;
const ROT47_END = 126;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundScore(value: number): number {
  return clamp(Math.round(value), 0, 100);
}

function bandFromScore(score: number): ConfidenceBand {
  if (score >= 85) return 'definite';
  if (score >= 70) return 'likely';
  if (score >= 45) return 'possible';
  return 'weak';
}

function validationFromScore(score: number, structuralFit: boolean): ValidationStatus {
  if (!structuralFit) return 'invalid';
  if (score >= 85) return 'definite';
  if (score >= 70) return 'likely';
  if (score >= 45) return 'possible';
  return 'weak';
}

function stripWrappingQuotes(value: string): string {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === '\'' && last === '\'')) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizeInput(rawInput: string): string {
  return stripWrappingQuotes(rawInput.trim());
}

function truncate(value: string, limit = 140): string {
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function countMatches(input: string, patterns: string[]): number {
  const upper = input.toUpperCase();
  return patterns.reduce((total, pattern) => total + (upper.includes(pattern) ? 1 : 0), 0);
}

function letterText(value: string): string {
  return value.replace(/[^A-Za-z]/g, '').toUpperCase();
}

function preserveCaseReference(source: string, transformed: string): string {
  let output = '';
  let cursor = 0;

  for (const char of source) {
    if (!/[A-Za-z]/.test(char)) {
      output += char;
      continue;
    }

    const next = transformed[cursor] ?? char;
    cursor += 1;
    output += char === char.toUpperCase() ? next : next.toLowerCase();
  }

  return output;
}

function shiftLetter(charCode: number, shift: number): number {
  return ((charCode - 65 + shift) % 26 + 26) % 26;
}

function caesarDecodeLetters(input: string, shift: number): string {
  const letters = letterText(input);
  let output = '';

  for (const char of letters) {
    const code = char.charCodeAt(0) - 65;
    output += String.fromCharCode(65 + shiftLetter(code + 65, -shift));
  }

  return preserveCaseReference(input, output);
}

function affineDecodeLetters(input: string, a: number, b: number): string {
  const letters = letterText(input);
  const inverse = modInverse(a, 26);
  if (inverse === undefined) return input;

  let output = '';
  for (const char of letters) {
    const code = char.charCodeAt(0) - 65;
    const decoded = ((inverse * (code - b)) % 26 + 26) % 26;
    output += String.fromCharCode(65 + decoded);
  }

  return preserveCaseReference(input, output);
}

function rot47(input: string): string {
  return [...input]
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < ROT47_START || code > ROT47_END) return char;
      return String.fromCharCode(ROT47_START + ((code - ROT47_START + 47) % 94));
    })
    .join('');
}

function rotDigits(input: string, shift: number): string {
  return [...input]
    .map((char) => {
      if (!/[0-9]/.test(char)) return char;
      return String.fromCharCode(48 + ((char.charCodeAt(0) - 48 + shift + 10) % 10));
    })
    .join('');
}

function rotAlphanumeric(input: string, letterShift: number, digitShift: number): string {
  return [...input]
    .map((char) => {
      if (/[A-Za-z]/.test(char)) {
        const upper = char.toUpperCase();
        const rotated = String.fromCharCode(65 + ((upper.charCodeAt(0) - 65 + letterShift + 26) % 26));
        return char === upper ? rotated : rotated.toLowerCase();
      }
      if (/[0-9]/.test(char)) {
        return String.fromCharCode(48 + ((char.charCodeAt(0) - 48 + digitShift + 10) % 10));
      }
      return char;
    })
    .join('');
}

function railFenceDecrypt(ciphertext: string, rails: number): string {
  if (rails <= 1) return ciphertext;
  const chars = [...ciphertext.replace(/\s+/g, '')];
  const pattern = Array.from({ length: chars.length }, () => 0);
  let rail = 0;
  let direction = 1;

  for (let index = 0; index < chars.length; index += 1) {
    pattern[index] = rail;
    rail += direction;
    if (rail === 0 || rail === rails - 1) direction *= -1;
  }

  const counts = Array.from({ length: rails }, (_, currentRail) => pattern.filter((entry) => entry === currentRail).length);
  const railsChars = counts.map((count) => chars.splice(0, count));
  const positions = Array.from({ length: rails }, () => 0);

  rail = 0;
  direction = 1;
  let output = '';
  for (let index = 0; index < pattern.length; index += 1) {
    output += railsChars[pattern[index]][positions[pattern[index]]];
    positions[pattern[index]] += 1;
    rail += direction;
    if (rail === 0 || rail === rails - 1) direction *= -1;
  }

  return output;
}

function railFenceEncode(text: string, rails: number): string {
  if (rails <= 1) return text;
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

function modInverse(value: number, modulus: number): number | undefined {
  const normalized = ((value % modulus) + modulus) % modulus;
  for (let i = 1; i < modulus; i += 1) {
    if ((normalized * i) % modulus === 1) return i;
  }
  return undefined;
}

function normalizedEnglishScore(text: string): number {
  const source = text.toUpperCase();
  const letters = source.replace(/[^A-Z]/g, '');
  if (!letters.length) {
    return source.trim().length ? 0.12 : 0;
  }

  const words = source.match(/[A-Z]{2,}/g) ?? [];
  const commonWordHits = countMatches(source, COMMON_WORDS);
  const bigramHits = countMatches(source, COMMON_BIGRAMS);
  const trigramHits = countMatches(source, COMMON_TRIGRAMS);
  const vowels = (letters.match(/[AEIOU]/g) ?? []).length;
  const vowelRatio = vowels / letters.length;
  const wordScore = clamp(words.length / 4, 0, 1);
  const vowelScore = 1 - Math.min(Math.abs(vowelRatio - 0.38) / 0.38, 1);
  const punctuationPenalty = clamp((source.match(/[^A-Z0-9\s,.;:'"!?\-()/]/g) ?? []).length / Math.max(source.length, 1), 0, 1);
  const spaceScore = source.includes(' ') ? 0.2 : 0;
  const matchScore = clamp((commonWordHits * 0.18) + (bigramHits * 0.06) + (trigramHits * 0.12), 0, 1);

  return clamp(wordScore * 0.25 + vowelScore * 0.2 + matchScore * 0.4 + spaceScore * 0.1 + (1 - punctuationPenalty) * 0.05, 0, 1);
}

function entropy(value: string): number {
  if (!value.length) return 0;
  const counts = new Map<string, number>();
  for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1);

  let result = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    result -= probability * Math.log2(probability);
  }
  return Number(result.toFixed(4));
}

function indexOfCoincidence(value: string): number {
  const letters = letterText(value);
  const length = letters.length;
  if (length < 2) return 0;
  const counts = new Map<string, number>();
  for (const char of letters) counts.set(char, (counts.get(char) ?? 0) + 1);

  const sum = [...counts.values()].reduce((total, count) => total + count * (count - 1), 0);
  return Number((sum / (length * (length - 1))).toFixed(4));
}

function repeatedNgrams(value: string, size: number): number {
  const letters = letterText(value);
  if (letters.length < size * 2) return 0;

  const positions = new Map<string, number[]>();
  for (let index = 0; index <= letters.length - size; index += 1) {
    const ngram = letters.slice(index, index + size);
    const list = positions.get(ngram) ?? [];
    list.push(index);
    positions.set(ngram, list);
  }

  let repeated = 0;
  for (const list of positions.values()) {
    if (list.length > 1) repeated += list.length - 1;
  }
  return repeated;
}

function factorEvidence(value: string): number[] {
  const letters = letterText(value);
  if (letters.length < 6) return [];
  const repeated = new Map<number, number>();

  for (let size = 3; size <= 4; size += 1) {
    const positions = new Map<string, number[]>();
    for (let index = 0; index <= letters.length - size; index += 1) {
      const ngram = letters.slice(index, index + size);
      const list = positions.get(ngram) ?? [];
      list.push(index);
      positions.set(ngram, list);
    }

    for (const list of positions.values()) {
      if (list.length < 2) continue;
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const distance = list[j] - list[i];
          for (let factor = 2; factor <= 12; factor += 1) {
            if (distance % factor === 0) {
              repeated.set(factor, (repeated.get(factor) ?? 0) + 1);
            }
          }
        }
      }
    }
  }

  return [...repeated.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([factor]) => factor);
}

function buildMetadata(input: string): CipherMetadata {
  const letters = letterText(input);
  const length = input.length;
  const lettersLength = letters.length;
  const words = input.trim().split(/\s+/).filter(Boolean).length;
  const characters = [...input];
  const lettersCount = characters.filter((char) => /[A-Za-z]/.test(char)).length;
  const digitsCount = characters.filter((char) => /[0-9]/.test(char)).length;
  const spacesCount = characters.filter((char) => /\s/.test(char)).length;
  const punctuationCount = Math.max(length - lettersCount - digitsCount - spacesCount, 0);

  return {
    length,
    lineCount: input.split(/\r?\n/).length,
    wordCount: words,
    letterRatio: length ? lettersCount / length : 0,
    digitRatio: length ? digitsCount / length : 0,
    spaceRatio: length ? spacesCount / length : 0,
    punctuationRatio: length ? punctuationCount / length : 0,
    uniqueChars: new Set(characters).size,
    entropy: entropy(input),
    indexOfCoincidence: indexOfCoincidence(input),
    repeatedBigrams: repeatedNgrams(input, 2),
    repeatedTrigrams: repeatedNgrams(input, 3),
    prefixPattern: truncate(input.slice(0, 24))
  };
}

function makeCandidate(kind: CipherKind, name: string, confidence: number, validation: ValidationStatus, reasons: string[], whyLessLikely: string[], metadata: CipherMetadata, preview?: string): CipherCandidate {
  return {
    kind,
    name,
    confidence: roundScore(confidence),
    band: bandFromScore(confidence),
    validation,
    reasons,
    whyLessLikely,
    metadata,
    preview
  };
}

function withPreview(metadata: CipherMetadata, preview: string): CipherMetadata {
  return { ...metadata, decodedPreview: preview };
}

function detectMorse(input: string, metadata: CipherMetadata): CipherCandidate | null {
  const compact = input.replace(/\s+/g, '');
  if (!compact || !/^[.\-\/]+$/.test(compact)) return null;

  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const validTokens = tokens.every((token) => /^[.\-]+$/.test(token) || token === '/');
  const preview = morseDecode(input);
  const structuralFit = validTokens && tokens.length > 0;
  const score = structuralFit ? 94 - Math.min(Math.max(tokens.length - 12, 0), 20) : 40;

  return makeCandidate(
    'morse',
    'Morse code',
    score,
    validationFromScore(score, structuralFit),
    ['Contains only dots, dashes, slashes, and spacing separators.', 'Morse-like token boundaries are present.'],
    ['Plain text would normally contain alphabetic characters rather than only Morse symbols.'],
    withPreview({ ...metadata }, preview),
    preview
  );
}

function decodePolybiusTokens(input: string): string {
  const tokens = input.match(/[1-5]{2}/g) ?? [];
  if (!tokens.length) return '';
  return tokens
    .map((token) => {
      const row = Number(token[0]);
      const col = Number(token[1]);
      const index = (row - 1) * 5 + (col - 1);
      return 'ABCDEFGHIKLMNOPQRSTUVWXYZ'[index] ?? '?';
    })
    .join('');
}

function detectPolybius(input: string, metadata: CipherMetadata): CipherCandidate | null {
  const digitsOnly = input.replace(/\s|[./-]/g, '');
  const tokenized = input.match(/[1-5]{2}/g) ?? [];
  const structuralFit = (digitsOnly.length >= 4 && digitsOnly.length % 2 === 0 && /^[1-5\s./-]+$/.test(input)) || tokenized.length > 0;
  if (!structuralFit) return null;

  const preview = decodePolybiusTokens(input);
  const score = tokenized.length >= 2 ? 92 : 68;

  return makeCandidate(
    'polybius',
    'Polybius square',
    score,
    validationFromScore(score, true),
    ['Uses digit pairs from a 5x5 grid pattern.', 'Letter output is encoded as coordinate pairs.'],
    ['Ordinary text rarely consists of valid 1-5 coordinate pairs.'],
    withPreview({ ...metadata, groupSize: 2 }, preview),
    preview
  );
}

function detectBacon(input: string, metadata: CipherMetadata): CipherCandidate | null {
  const compact = input.replace(/\s+/g, '').toUpperCase();
  if (!compact || !/^[AB]+$/.test(compact)) return null;
  const structuralFit = compact.length % 5 === 0 && compact.length >= 10;
  if (!structuralFit) return null;

  const preview = baconDecode(compact);
  const score = 95;

  return makeCandidate(
    'bacon',
    'Bacon cipher',
    score,
    validationFromScore(score, true),
    ['Only A and B characters are present.', 'Length is divisible by 5, matching Bacon groups.'],
    ['Plain text does not normally use only A and B characters in five-character groups.'],
    withPreview({ ...metadata, groupSize: 5 }, preview),
    preview
  );
}

function candidateScoreFromDecoded(raw: string, decoded: string, shiftEvidence: number): number {
  const rawScore = normalizedEnglishScore(raw);
  const decodedScore = normalizedEnglishScore(decoded);
  const improvement = Math.max(decodedScore - rawScore, 0);
  return roundScore((decodedScore * 78) + (improvement * 16) + (shiftEvidence * 6));
}

function detectCaesarAndRot(input: string, metadata: CipherMetadata): CipherCandidate[] {
  const candidates: CipherCandidate[] = [];
  const letters = letterText(input);
  const canHandlePrintable = input.length >= 4;
  if (!canHandlePrintable) return candidates;

  let bestCaesar: CipherCandidate | undefined;

  for (let shift = 1; shift < 26; shift += 1) {
    const preview = caesarDecodeLetters(input, shift);
    const score = candidateScoreFromDecoded(input, preview, shift === 13 ? 1.25 : 1);
    const valid = letters.length >= 4 && normalizedEnglishScore(preview) > normalizedEnglishScore(input) + 0.03;
    const kind: CipherKind = shift === 13 && letters.length >= 4 ? 'rot13' : 'caesar';
    const name = shift === 13 && letters.length >= 4 ? 'ROT13' : `Caesar cipher (shift ${shift})`;
    const candidate = makeCandidate(
      kind,
      name,
      score,
      validationFromScore(score, valid),
      shift === 13
        ? ['A shift of 13 produces substantially more readable text.', 'ROT13 is a specific Caesar shift.']
        : [`A Caesar shift of ${shift} produces the best readability among single shifts.`, 'Letter distribution and spacing are preserved.'],
      shift === 13
        ? ['Other shifts did not decode to equally readable text.']
        : ['Atbash, affine, and other transforms produced weaker readable output.'],
      withPreview({ ...metadata, shift }, preview),
      preview
    );
    if (!bestCaesar || candidate.confidence > bestCaesar.confidence) {
      bestCaesar = candidate;
    }
  }

  if (bestCaesar) candidates.push(bestCaesar);

  if (/^[0-9]+$/.test(input)) {
    const rot5Preview = rotDigits(input, -5);
    const score = roundScore(normalizedEnglishScore(rot5Preview) * 100 + 8);
    candidates.push(
      makeCandidate(
        'rot5',
        'ROT5',
        score,
        validationFromScore(score, true),
        ['The input is digit-only, which fits a ROT5-style digit rotation.'],
        ['Non-digit text would not fit a digit-only rotation pattern.'],
        withPreview({ ...metadata, shift: 5 }, rot5Preview),
        rot5Preview
      )
    );
  }

  if (/[A-Za-z]/.test(input) && /[0-9]/.test(input)) {
    const rot18Preview = rotAlphanumeric(input, -13, -5);
    const score = candidateScoreFromDecoded(input, rot18Preview, 1.1);
    candidates.push(
      makeCandidate(
        'rot18',
        'ROT18',
        score,
        validationFromScore(score, true),
        ['Letters and digits are both present, which fits ROT18-style rotation.', 'ROT18 rotates letters by 13 and digits by 5.'],
        ['Plain text often does not mix cyclic letter and digit shifts like this.'],
        withPreview({ ...metadata, shift: 18 }, rot18Preview),
        rot18Preview
      )
    );
  }

  const printableCount = [...input].filter((char) => {
    const code = char.charCodeAt(0);
    return code >= ROT47_START && code <= ROT47_END;
  }).length;
  if (printableCount >= Math.max(4, input.length - 1)) {
    const rot47Preview = rot47(input);
    const score = candidateScoreFromDecoded(input, rot47Preview, 1.15);
    candidates.push(
      makeCandidate(
        'rot47',
        'ROT47',
        score,
        validationFromScore(score, true),
        ['Most characters are printable ASCII, which matches ROT47.', 'ROT47 preserves printable ASCII structure.'],
        ['A non-printable-heavy input would be a poor ROT47 fit.'],
        withPreview({ ...metadata }, rot47Preview),
        rot47Preview
      )
    );
  }

  return candidates;
}

function detectAtbash(input: string, metadata: CipherMetadata): CipherCandidate | null {
  const letters = letterText(input);
  if (letters.length < 4) return null;
  const preview = atbashCipher(input);
  const score = candidateScoreFromDecoded(input, preview, 1.05);
  const valid = normalizedEnglishScore(preview) > normalizedEnglishScore(input) + 0.04;

  return makeCandidate(
    'atbash',
    'Atbash cipher',
    score,
    validationFromScore(score, valid),
    ['Mirrored alphabet output improves readability.', 'Atbash is an involutive substitution, so decode and encode are the same transform.'],
    ['If Atbash were wrong, the transformed text would not read more like English than the original.'],
    withPreview({ ...metadata }, preview),
    preview
  );
}

function detectAffine(input: string, metadata: CipherMetadata): CipherCandidate | null {
  const letters = letterText(input);
  if (letters.length < 4) return null;

  let best: CipherCandidate | null = null;

  for (const a of VALID_MOD26_MULTIPLIERS) {
    for (let b = 0; b < 26; b += 1) {
      const preview = affineDecodeLetters(input, a, b);
      const score = candidateScoreFromDecoded(input, preview, 1.1);
      const candidate = makeCandidate(
        'affine',
        `Affine cipher (a=${a}, b=${b})`,
        score,
        validationFromScore(score, normalizedEnglishScore(preview) > normalizedEnglishScore(input) + 0.04),
        ['A modular linear transform produces a more readable decode than most single shifts.'],
        ['Simple Caesar and Atbash candidates were evaluated separately; affine must outperform them to rank highly.'],
        withPreview({ ...metadata, affineKey: { a, b } }, preview),
        preview
      );

      if (!best || candidate.confidence > best.confidence) best = candidate;
    }
  }

  if (!best) return null;
  if (best.confidence < 55) return null;
  if (best.metadata.affineKey?.a === 1 && best.confidence < 75) return null;
  return best;
}

function likelyPeriods(input: string): number[] {
  const letters = letterText(input);
  if (letters.length < 8) return [];

  const candidates: Array<{ period: number; score: number }> = [];
  for (let period = 2; period <= 12; period += 1) {
    const cosetScores: number[] = [];
    for (let offset = 0; offset < period; offset += 1) {
      let coset = '';
      for (let index = offset; index < letters.length; index += period) {
        coset += letters[index];
      }
      cosetScores.push(indexOfCoincidence(coset));
    }

    const average = cosetScores.reduce((sum, value) => sum + value, 0) / cosetScores.length;
    const repeatedEvidence = factorEvidence(letters);
    const bonus = repeatedEvidence.includes(period) ? 0.02 : 0;
    candidates.push({ period, score: average + bonus });
  }

  return candidates
    .filter((item) => item.score >= 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.period);
}

function guessVigenereKey(input: string, period: number): string {
  const letters = letterText(input);
  if (letters.length < period) return '';

  const key: string[] = [];

  for (let offset = 0; offset < period; offset += 1) {
    let bestShift = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    const coset: string[] = [];

    for (let index = offset; index < letters.length; index += period) {
      coset.push(letters[index]);
    }

    for (let shift = 0; shift < 26; shift += 1) {
      const counts = Array.from({ length: 26 }, () => 0);
      for (const char of coset) {
        const decodedIndex = ((char.charCodeAt(0) - 65 - shift) % 26 + 26) % 26;
        counts[decodedIndex] += 1;
      }

      const total = coset.length || 1;
      let chiSquare = 0;
      for (let i = 0; i < 26; i += 1) {
        const observed = counts[i];
        const expected = (total * ENGLISH_FREQUENCIES[i]) / 100;
        chiSquare += ((observed - expected) ** 2) / Math.max(expected, 0.001);
      }

      if (chiSquare < bestScore) {
        bestScore = chiSquare;
        bestShift = shift;
      }
    }

    key.push(String.fromCharCode(65 + bestShift));
  }

  return key.join('');
}

function detectVigenere(input: string, metadata: CipherMetadata): CipherCandidate | null {
  const letters = letterText(input);
  if (letters.length < 8) return null;

  const periods = likelyPeriods(input);
  if (!periods.length) return null;

  const bestPeriod = periods[0];
  const keyGuess = guessVigenereKey(input, bestPeriod);
  const preview = keyGuess ? vigenereCipher(input, keyGuess, true) : input;
  const previewScore = normalizedEnglishScore(preview);
  const evidence = factorEvidence(letters).includes(bestPeriod) ? 15 : 0;
  const score = roundScore(previewScore * 100 + evidence + periods.length * 6);

  if (score < 45) return null;

  return makeCandidate(
    'vigenere',
    `Vigenère-like cipher (period ${bestPeriod})`,
    score,
    validationFromScore(score, true),
    ['Repeated shift periodicity suggests a repeating keyword.', `Likely key length: ${bestPeriod}${periods.length > 1 ? `, ${periods.slice(1).join(', ')}` : ''}.`],
    ['A single Caesar shift did not explain the text as well as a repeating-key model.'],
    withPreview({ ...metadata, likelyPeriods: periods, keyGuess }, preview),
    preview
  );
}

function detectRailFence(input: string, metadata: CipherMetadata): CipherCandidate | null {
  const letters = letterText(input);
  if (letters.length < 6) return null;

  let best: CipherCandidate | null = null;
  for (let rails = 2; rails <= 8; rails += 1) {
    const preview = railFenceDecrypt(letters, rails);
    const score = candidateScoreFromDecoded(input, preview, 1.05);
    const candidate = makeCandidate(
      'rail-fence',
      `Rail Fence cipher (rails ${rails})`,
      score,
      validationFromScore(score, normalizedEnglishScore(preview) > normalizedEnglishScore(input) + 0.03),
      ['Characters are preserved but the order changes in a zig-zag pattern.', `Rail count ${rails} produces the strongest readability.`],
      ['Other cipher families were checked first because they are more common and easier to validate.'],
      withPreview({ ...metadata, railFenceRails: rails }, preview),
      preview
    );

    if (!best || candidate.confidence > best.confidence) best = candidate;
  }

  if (!best || best.confidence < 52) return null;
  return best;
}

function detectColumnarTransposition(input: string, metadata: CipherMetadata): CipherCandidate | null {
  const letters = letterText(input);
  if (letters.length < 8) return null;

  let best: CipherCandidate | null = null;
  for (let width = 2; width <= 10; width += 1) {
    if (letters.length % width !== 0) continue;
    const keyword = LETTERS.slice(0, width);
    const preview = columnarTranspositionDecrypt(letters, keyword).text;
    const score = candidateScoreFromDecoded(input, preview, 1.02);
    const candidate = makeCandidate(
      'columnar-transposition',
      `Columnar transposition (width ${width})`,
      score,
      validationFromScore(score, normalizedEnglishScore(preview) > normalizedEnglishScore(input) + 0.02),
      ['The letter inventory is preserved while order appears permuted by columns.', `A column width of ${width} improves readability the most.`],
      ['Rail Fence and substitution-style decodes were tested first because they are more directly constrained.'],
      withPreview({ ...metadata, columnWidth: width }, preview),
      preview
    );

    if (!best || candidate.confidence > best.confidence) best = candidate;
  }

  if (!best || best.confidence < 42) return null;
  return best;
}

function detectPlayfair(input: string, metadata: CipherMetadata): CipherCandidate | null {
  const letters = letterText(input);
  if (letters.length < 8 || letters.length % 2 !== 0) return null;

  const doubled = (letters.match(/([A-Z])\1/g) ?? []).length;
  const pairCount = letters.length / 2;
  const oddPenalty = input.includes(' ') ? 6 : 0;
  const score = roundScore(34 + Math.max(0, 30 - doubled * 8) + Math.min(pairCount, 8) * 3 - oddPenalty + (letters.length > 14 ? 8 : 0));

  if (score < 40) return null;

  return makeCandidate(
    'playfair',
    'Playfair cipher',
    score,
    validationFromScore(score, true),
    ['The text is digraph-friendly and even-length, which fits Playfair output.', 'Repeated letters are limited inside the letter pairs.'],
    ['Single-shift substitutions usually show different letter patterns and are easier to rule out.'],
    { ...metadata, groupSize: 2 },
    letters
  );
}

function detectHill(input: string, metadata: CipherMetadata): CipherCandidate | null {
  const letters = letterText(input);
  if (letters.length < 8) return null;

  const blockFit = letters.length % 2 === 0 || letters.length % 3 === 0;
  if (!blockFit) return null;

  const score = roundScore(28 + (metadata.entropy >= 3.6 ? 18 : 0) + (metadata.letterRatio > 0.85 ? 10 : 0) + (metadata.spaceRatio < 0.03 ? 12 : 0) + (letters.length >= 12 ? 10 : 0));
  if (score < 38) return null;

  return makeCandidate(
    'hill',
    'Hill cipher',
    score,
    validationFromScore(score, true),
    ['The length fits matrix-style grouping, and the text is dense and alphabetic.', 'High entropy and block alignment are consistent with a Hill-style cipher.'],
    ['Plain substitution ciphers typically do not require block alignment.'],
    { ...metadata, groupSize: letters.length % 2 === 0 ? 2 : 3 },
    letters
  );
}

function detectSubstitution(input: string, metadata: CipherMetadata, baselineScores: number[]): CipherCandidate | null {
  const letters = letterText(input);
  if (letters.length < 12) return null;

  const ic = metadata.indexOfCoincidence;
  const frequencyShape = ic >= 0.055 && ic <= 0.075;
  const letterDensity = metadata.letterRatio > 0.7;
  const notSingleShiftStrong = Math.max(...baselineScores) < 72;
  const score = roundScore(38 + (frequencyShape ? 24 : 0) + (letterDensity ? 14 : 0) + (notSingleShiftStrong ? 10 : -6) + Math.min(metadata.repeatedBigrams * 2, 10));

  if (score < 48) return null;

  return makeCandidate(
    'substitution',
    'Simple substitution cipher',
    score,
    validationFromScore(score, true),
    ['The letter-frequency shape looks monoalphabetic rather than random.', 'No single-shift decode dominated the ranking, which is consistent with substitution.'],
    ['Caesar, Atbash, and affine candidates were weaker than the overall frequency pattern.'],
    metadata,
    letters
  );
}

function detectPlainText(input: string, metadata: CipherMetadata, topScore: number): CipherCandidate | null {
  const englishScore = normalizedEnglishScore(input);
  if (englishScore < 0.42) return null;
  if (topScore >= 58) return null;

  return makeCandidate(
    'plain-text',
    'Plain text',
    roundScore(50 + englishScore * 30),
    'likely',
    ['The text reads like ordinary language more than cipher output.', 'No classical cipher pattern clearly dominates.'],
    ['Cipher-specific candidates were evaluated, but none achieved a strong score.'],
    metadata,
    truncate(input, 140)
  );
}

function detectUnknown(metadata: CipherMetadata): CipherCandidate {
  return makeCandidate(
    'unknown',
    'Unknown',
    18,
    'weak',
    ['No strong classical cipher signature was found.'],
    ['The input may be plain text, an unusual format, or a cipher outside the supported classical set.'],
    metadata,
    ''
  );
}

function rankCandidates(candidates: CipherCandidate[]): CipherCandidate[] {
  const priority: CipherKind[] = ['morse', 'bacon', 'polybius', 'rot13', 'caesar', 'atbash', 'rot5', 'rot18', 'rot47', 'affine', 'rail-fence', 'columnar-transposition', 'vigenere', 'substitution', 'playfair', 'hill', 'plain-text', 'unknown'];
  return candidates.sort((left, right) => {
    if (right.confidence !== left.confidence) return right.confidence - left.confidence;
    const leftPriority = priority.indexOf(left.kind);
    const rightPriority = priority.indexOf(right.kind);
    return leftPriority - rightPriority;
  });
}

function buildDecoderPreviews(input: string, topCandidates: CipherCandidate[]): CipherPreview[] {
  const previews: CipherPreview[] = [];
  const uniqueKinds = new Set<CipherKind>();

  for (const candidate of topCandidates) {
    if (uniqueKinds.has(candidate.kind)) continue;
    uniqueKinds.add(candidate.kind);
    if (!candidate.preview) continue;
    previews.push({
      label: candidate.name,
      preview: truncate(candidate.preview, 220),
      confidence: candidate.confidence,
      note: candidate.reasons[0] ?? 'Decoder preview generated.'
    });
  }

  if (previews.length === 0 && input.length) {
    const atbashPreview = atbashCipher(input);
    previews.push({
      label: 'Atbash preview',
      preview: truncate(atbashPreview, 220),
      confidence: roundScore(normalizedEnglishScore(atbashPreview) * 100),
      note: 'Atbash is included because it is a common classical decoder.'
    });
  }

  return previews.slice(0, 6);
}

function buildWarnings(topCandidate: CipherCandidate, rawInput: string): WarningMessage[] {
  const warnings: WarningMessage[] = [
    {
      code: 'heuristic',
      severity: 'warning',
      message: 'Detection is heuristic, not guaranteed.'
    },
    {
      code: 'secret',
      severity: 'warning',
      message: 'Do not paste real secrets into untrusted environments.'
    }
  ];

  if (topCandidate.band === 'weak' || topCandidate.confidence < 45) {
    warnings.push({
      code: 'ambiguous',
      severity: 'info',
      message: 'The result is ambiguous. Consider trying all classical decoders.'
    });
  }

  if (letterText(rawInput).length < 4) {
    warnings.push({
      code: 'short-input',
      severity: 'info',
      message: 'Very short inputs are intentionally scored conservatively.'
    });
  }

  return warnings;
}

function addGenericStructureCandidates(input: string, metadata: CipherMetadata): CipherCandidate[] {
  const candidates: CipherCandidate[] = [];
  const morse = detectMorse(input, metadata);
  if (morse) candidates.push(morse);
  const polybius = detectPolybius(input, metadata);
  if (polybius) candidates.push(polybius);
  const bacon = detectBacon(input, metadata);
  if (bacon) candidates.push(bacon);
  return candidates;
}

function addClassicalSubstitutionCandidates(input: string, metadata: CipherMetadata): CipherCandidate[] {
  const caesarCandidates = detectCaesarAndRot(input, metadata);
  const atbash = detectAtbash(input, metadata);
  const affine = detectAffine(input, metadata);
  const vigenere = detectVigenere(input, metadata);
  const railFence = detectRailFence(input, metadata);
  const columnar = detectColumnarTransposition(input, metadata);
  const playfair = detectPlayfair(input, metadata);
  const hill = detectHill(input, metadata);

  const scoreBasis = [...caesarCandidates, ...(atbash ? [atbash] : []), ...(affine ? [affine] : [])].map((candidate) => candidate.confidence);
  const substitution = detectSubstitution(input, metadata, scoreBasis);

  return [
    ...caesarCandidates,
    ...(atbash ? [atbash] : []),
    ...(affine ? [affine] : []),
    ...(vigenere ? [vigenere] : []),
    ...(substitution ? [substitution] : []),
    ...(railFence ? [railFence] : []),
    ...(columnar ? [columnar] : []),
    ...(playfair ? [playfair] : []),
    ...(hill ? [hill] : [])
  ];
}

export function analyzeCipherString(rawInput: string): CipherInspectionReport {
  const input = normalizeInput(rawInput);
  const metadata = buildMetadata(input);
  const inputSummary: InputSummary = {
    length: rawInput.length,
    lines: rawInput.split(/\r?\n/).length,
    batchMode: false,
    preview: truncate(input, 140)
  };

  if (!input.length) {
    const unknown = detectUnknown(metadata);
    return {
      inputSummary,
      candidates: [unknown],
      topMatch: unknown,
      warnings: buildWarnings(unknown, input),
      decoderPreviews: []
    };
  }

  const structureCandidates = addGenericStructureCandidates(input, metadata);
  const classicalCandidates = addClassicalSubstitutionCandidates(input, metadata);
  let candidates = rankCandidates([...structureCandidates, ...classicalCandidates]);

  if (!candidates.length) {
    candidates = [detectUnknown(metadata)];
  }

  const topMatch = candidates[0];
  const plainText = detectPlainText(input, metadata, topMatch.confidence);
  if (plainText) {
    candidates = rankCandidates([...candidates, plainText]);
  }

  const finalTop = candidates[0];
  const decoderPreviews = buildDecoderPreviews(input, candidates.slice(0, 6));

  return {
    inputSummary,
    candidates,
    topMatch: finalTop,
    warnings: buildWarnings(finalTop, input),
    decoderPreviews
  };
}

export function analyzeCipherBatch(rawInput: string, mode: InspectorMode): BatchInspectionReport {
  if (mode !== 'batch') {
    return {
      mode,
      reports: [
        {
          index: 1,
          valuePreview: truncate(normalizeInput(rawInput), 60),
          report: analyzeCipherString(rawInput)
        }
      ],
      warnings: []
    };
  }

  const lines = rawInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 200);

  const warnings: WarningMessage[] = rawInput.split(/\r?\n/).filter((line) => line.trim()).length > lines.length
    ? [
        {
          code: 'batch-truncated',
          severity: 'info',
          message: 'Batch analysis is limited to the first 200 non-empty lines.'
        }
      ]
    : [];

  return {
    mode,
    reports: lines.map((line, index) => ({
      index: index + 1,
      valuePreview: truncate(normalizeInput(line), 60),
      report: analyzeCipherString(line)
    })),
    warnings
  };
}

export function inspectionSummaryText(report: CipherInspectionReport): string {
  return `${report.topMatch.name} (${report.topMatch.confidence}/100, ${report.topMatch.band})`;
}

export function toInspectionJson(report: CipherInspectionReport): string {
  return JSON.stringify(report, null, 2);
}