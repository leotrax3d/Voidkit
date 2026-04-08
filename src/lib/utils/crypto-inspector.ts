import { decodeBase32, decodeBase64, decodeJwt } from './crypto-modern';

export type ValidationStatus = 'valid' | 'suspicious' | 'invalid';

export type DetectionKind =
  | 'jwt'
  | 'pem'
  | 'openssh-key'
  | 'uuid'
  | 'hash-like'
  | 'hmac-like'
  | 'hex'
  | 'base64'
  | 'base64url'
  | 'base32'
  | 'url-safe-token'
  | 'ciphertext-blob'
  | 'plain-text'
  | 'unknown';

export type WarningMessage = {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
};

export type SuggestedAction = {
  id: string;
  label: string;
  description: string;
  available: boolean;
  toolSlug?: string;
};

export type DetectionMetadata = {
  length: number;
  charset: string;
  entropy: number;
  hasPadding: boolean;
  segments: number;
  prefixPattern?: string;
  probableAlgorithms?: string[];
  decodedPreview?: string;
  jwt?: {
    hasExp: boolean;
    hasNbf: boolean;
    hasIat: boolean;
    signatureUnverified: boolean;
    header: Record<string, unknown> | null;
    payload: Record<string, unknown> | null;
  };
};

export type DetectionCandidate = {
  kind: DetectionKind;
  typeName: string;
  score: number;
  reasons: string[];
  validation: ValidationStatus;
  metadata: DetectionMetadata;
};

export type InputSummary = {
  length: number;
  lines: number;
  trimmedLength: number;
  batchMode: boolean;
  normalizedPreview: string;
};

export type InspectionReport = {
  inputSummary: InputSummary;
  candidates: DetectionCandidate[];
  topMatch: DetectionCandidate;
  warnings: WarningMessage[];
  suggestions: SuggestedAction[];
};

export type BatchInspectionEntry = {
  index: number;
  valuePreview: string;
  report: InspectionReport;
};

export type BatchInspectionReport = {
  mode: 'single' | 'multi' | 'batch';
  reports: BatchInspectionEntry[];
  warnings: WarningMessage[];
};

export type InspectorMode = 'single' | 'multi' | 'batch';

const HASH_LENGTHS: Record<number, string[]> = {
  32: ['MD5'],
  40: ['SHA-1'],
  56: ['SHA-224'],
  64: ['SHA-256'],
  96: ['SHA-384'],
  128: ['SHA-512']
};

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function truncate(value: string, limit = 160): string {
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function charsetProfile(input: string): string {
  let letters = 0;
  let numbers = 0;
  let whitespace = 0;
  let symbols = 0;

  for (const char of input) {
    if (/[a-z]/i.test(char)) letters += 1;
    else if (/[0-9]/.test(char)) numbers += 1;
    else if (/\s/.test(char)) whitespace += 1;
    else symbols += 1;
  }

  return `letters:${letters} numbers:${numbers} whitespace:${whitespace} symbols:${symbols}`;
}

export function estimateEntropy(input: string): number {
  if (!input.length) return 0;

  const counts = new Map<string, number>();
  for (const char of input) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }

  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / input.length;
    entropy -= p * Math.log2(p);
  }

  return Number(entropy.toFixed(4));
}

function baseMetadata(input: string): DetectionMetadata {
  return {
    length: input.length,
    charset: charsetProfile(input),
    entropy: estimateEntropy(input),
    hasPadding: /=+$/.test(input),
    segments: input.split('.').length,
    prefixPattern: input.slice(0, 24)
  };
}

function looksLikeHex(input: string): boolean {
  return /^[a-f0-9]+$/i.test(input);
}

function isValidBase64(input: string): boolean {
  if (!/^[A-Za-z0-9+/=\s]+$/.test(input)) return false;
  const compact = input.replace(/\s+/g, '');
  if (compact.length === 0 || compact.length % 4 !== 0) return false;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) {
    return false;
  }

  try {
    decodeBase64(compact);
    return true;
  } catch {
    return false;
  }
}

function normalizeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (normalized.length % 4)) % 4;
  return normalized + '='.repeat(pad);
}

function isValidBase64Url(input: string): boolean {
  if (!/^[A-Za-z0-9\-_]+$/.test(input)) return false;
  if (input.length < 8) return false;
  const normalized = normalizeBase64Url(input);
  return isValidBase64(normalized);
}

function decodeBase64UrlPreview(input: string): string | null {
  try {
    return truncate(decodeBase64(normalizeBase64Url(input)), 120);
  } catch {
    return null;
  }
}

function decodeBase64Preview(input: string): string | null {
  try {
    return truncate(decodeBase64(input.replace(/\s+/g, '')), 120);
  } catch {
    return null;
  }
}

function decodeBase32Preview(input: string): string | null {
  try {
    return truncate(decodeBase32(input), 120);
  } catch {
    return null;
  }
}

function isUuid(input: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
}

function detectPem(input: string): { valid: boolean; family?: string; brokenBoundary: boolean } | null {
  const begin = input.match(/-----BEGIN ([^-]+)-----/);
  const end = input.match(/-----END ([^-]+)-----/);

  if (!begin && !end) return null;
  if (!begin || !end) {
    return { valid: false, brokenBoundary: true };
  }

  const family = begin[1];
  const valid = family === end[1];
  return { valid, family, brokenBoundary: !valid };
}

function detectOpenSsh(input: string): string | null {
  const prefixes = ['ssh-ed25519', 'ssh-rsa', 'ecdsa-sha2-', 'sk-ssh-ed25519', 'sk-ecdsa-sha2'];
  for (const prefix of prefixes) {
    if (input.startsWith(prefix)) return prefix;
  }
  return null;
}

function detectHashLike(input: string): string[] {
  if (!looksLikeHex(input)) return [];
  return HASH_LENGTHS[input.length] ?? [];
}

function detectHmacLike(input: string): boolean {
  if (!looksLikeHex(input)) return false;
  return [64, 96, 128].includes(input.length);
}

function isBase32Like(input: string): boolean {
  return /^[A-Z2-7=\s]+$/i.test(input) && input.replace(/\s+/g, '').length >= 8;
}

function isUrlSafeToken(input: string): boolean {
  return /^[A-Za-z0-9\-_]+$/.test(input) && input.length >= 16;
}

function isCiphertextBlob(input: string, entropy: number): boolean {
  if (input.length < 24) return false;
  const spaces = (input.match(/\s/g) ?? []).length;
  const spaceRatio = input.length ? spaces / input.length : 0;
  return entropy >= 3.8 && spaceRatio < 0.05;
}

function isPlainTextLikely(input: string, entropy: number): boolean {
  const words = input.trim().split(/\s+/).filter(Boolean).length;
  const vowelCount = (input.match(/[aeiou]/gi) ?? []).length;
  const letterCount = (input.match(/[a-z]/gi) ?? []).length;
  const vowelRatio = letterCount ? vowelCount / letterCount : 0;

  return words >= 2 && entropy < 4.5 && vowelRatio > 0.18;
}

function buildCandidate(
  kind: DetectionKind,
  typeName: string,
  score: number,
  reasons: string[],
  validation: ValidationStatus,
  metadata: DetectionMetadata
): DetectionCandidate {
  return {
    kind,
    typeName,
    score: clampScore(score),
    reasons,
    validation,
    metadata
  };
}

function candidateSuggestions(kind: DetectionKind): SuggestedAction[] {
  switch (kind) {
    case 'jwt':
      return [
        {
          id: 'jwt-decoder',
          label: 'Open JWT Decoder',
          description: 'Inspect token header, payload, and signature segments.',
          available: true,
          toolSlug: 'jwt-decoder'
        },
        {
          id: 'jwt-validator-planned',
          label: 'JWT Validator (planned)',
          description: 'Signature verification and claim validation are not available yet.',
          available: false
        }
      ];
    case 'hash-like':
    case 'hmac-like':
      return [
        {
          id: 'hash-generator',
          label: 'Open Hash Generator',
          description: 'Create and compare hash outputs for test strings.',
          available: true,
          toolSlug: 'hash-generator'
        },
        {
          id: 'hmac-tool-planned',
          label: 'HMAC Tool (planned)',
          description: 'Dedicated HMAC verification flow is planned but unavailable.',
          available: false
        }
      ];
    case 'base64':
    case 'base64url':
      return [
        {
          id: 'base64',
          label: 'Open Base64 Encoder/Decoder',
          description: 'Decode or re-encode values in a dedicated view.',
          available: true,
          toolSlug: 'base64'
        }
      ];
    case 'base32':
      return [
        {
          id: 'base32-base58',
          label: 'Open Base32/Base58 Converter',
          description: 'Decode and normalize Base32 values.',
          available: true,
          toolSlug: 'base32-base58'
        }
      ];
    case 'pem':
    case 'openssh-key':
      return [
        {
          id: 'key-inspector-planned',
          label: 'Key Inspector (planned)',
          description: 'Detailed key/certificate inspection is planned but not available yet.',
          available: false
        }
      ];
    default:
      return [
        {
          id: 'entropy-analyzer-planned',
          label: 'Entropy Analyzer (planned)',
          description: 'Dedicated entropy diagnostics are planned but not available yet.',
          available: false
        },
        {
          id: 'regex-tester-planned',
          label: 'Regex Tester (planned)',
          description: 'Pattern testing workflow is planned but not available yet.',
          available: false
        }
      ];
  }
}

export function analyzeCryptoString(rawInput: string): InspectionReport {
  const input = rawInput.trim();
  const metadata = baseMetadata(input);
  const warnings: WarningMessage[] = [
    {
      code: 'probabilistic-detection',
      severity: 'warning',
      message: 'Detection is probabilistic and should not be treated as cryptographic proof.'
    },
    {
      code: 'secret-handling',
      severity: 'warning',
      message: 'Do not paste real secrets in untrusted environments.'
    }
  ];

  const inputSummary: InputSummary = {
    length: rawInput.length,
    lines: rawInput.split(/\r?\n/).length,
    trimmedLength: input.length,
    batchMode: false,
    normalizedPreview: truncate(input, 120)
  };

  if (!input.length) {
    const fallback = buildCandidate(
      'unknown',
      'Unknown / Empty',
      0,
      ['Input is empty after trimming.'],
      'invalid',
      metadata
    );

    return {
      inputSummary,
      candidates: [fallback],
      topMatch: fallback,
      warnings,
      suggestions: candidateSuggestions('unknown')
    };
  }

  const candidates: DetectionCandidate[] = [];
  const entropy = metadata.entropy;

  if (input.includes('.') && input.split('.').length === 3) {
    const jwt = decodeJwt(input);
    const valid = jwt.validShape && !!jwt.header && !!jwt.payload;
    const payload = (jwt.payload ?? {}) as Record<string, unknown>;
    const hasExp = Object.prototype.hasOwnProperty.call(payload, 'exp');
    const hasNbf = Object.prototype.hasOwnProperty.call(payload, 'nbf');
    const hasIat = Object.prototype.hasOwnProperty.call(payload, 'iat');

    candidates.push(
      buildCandidate(
        'jwt',
        'JWT (JSON Web Token)',
        valid ? 96 : 54,
        valid
          ? ['Has three JWT segments.', 'Header and payload decode as JSON.']
          : ['Has JWT-like segmentation but JSON decoding failed.'],
        valid ? 'valid' : 'suspicious',
        {
          ...metadata,
          segments: 3,
          jwt: {
            hasExp,
            hasNbf,
            hasIat,
            signatureUnverified: true,
            header: jwt.header,
            payload: jwt.payload
          }
        }
      )
    );

    warnings.push({
      code: 'jwt-unverified',
      severity: 'critical',
      message: 'JWT decoding does not imply signature verification.'
    });
  }

  const pem = detectPem(input);
  if (pem) {
    candidates.push(
      buildCandidate(
        'pem',
        'PEM Block',
        pem.valid ? 94 : 42,
        pem.valid
          ? ['Detected matching BEGIN/END PEM boundaries.']
          : ['Found PEM boundary markers but they appear broken or mismatched.'],
        pem.valid ? 'valid' : 'invalid',
        {
          ...metadata,
          prefixPattern: pem.family
        }
      )
    );
  }

  const sshPrefix = detectOpenSsh(input);
  if (sshPrefix) {
    candidates.push(
      buildCandidate(
        'openssh-key',
        'OpenSSH Public Key',
        95,
        ['Starts with a known OpenSSH key prefix.'],
        'valid',
        {
          ...metadata,
          prefixPattern: sshPrefix
        }
      )
    );
  }

  if (isUuid(input)) {
    candidates.push(
      buildCandidate('uuid', 'UUID', 97, ['Matches canonical UUID format.'], 'valid', metadata)
    );
  }

  const hashAlgorithms = detectHashLike(input);
  if (hashAlgorithms.length > 0) {
    candidates.push(
      buildCandidate(
        'hash-like',
        'Hash-like Hex Digest',
        88,
        ['Hex-only string with length matching common digest sizes.', 'Length-based hash detection is not proof.'],
        'suspicious',
        {
          ...metadata,
          probableAlgorithms: hashAlgorithms
        }
      )
    );
  }

  if (detectHmacLike(input)) {
    candidates.push(
      buildCandidate(
        'hmac-like',
        'HMAC-like Digest',
        72,
        ['Hex digest length matches common HMAC output sizes.', 'Cannot confirm keyed origin without verification context.'],
        'suspicious',
        {
          ...metadata,
          probableAlgorithms: hashAlgorithms.length ? hashAlgorithms : ['SHA-256', 'SHA-384', 'SHA-512']
        }
      )
    );
  }

  if (looksLikeHex(input) && input.length % 2 === 0 && input.length >= 6) {
    candidates.push(
      buildCandidate(
        'hex',
        'Hexadecimal String',
        86,
        ['Contains only hexadecimal characters.', 'Length is even, consistent with byte encoding.'],
        'valid',
        metadata
      )
    );
  }

  if (isValidBase64(input)) {
    candidates.push(
      buildCandidate(
        'base64',
        'Base64',
        84,
        ['Matches Base64 alphabet and padding rules.', 'Value can be decoded successfully.'],
        'valid',
        {
          ...metadata,
          decodedPreview: decodeBase64Preview(input) ?? undefined
        }
      )
    );
  } else if (/^[A-Za-z0-9+/=\s]+$/.test(input) && input.length >= 4) {
    candidates.push(
      buildCandidate(
        'base64',
        'Base64-like (invalid)',
        32,
        ['Character set resembles Base64, but validation failed.'],
        'invalid',
        metadata
      )
    );
  }

  if (isValidBase64Url(input)) {
    candidates.push(
      buildCandidate(
        'base64url',
        'Base64URL',
        82,
        ['Uses URL-safe Base64 alphabet.', 'Value can be normalized and decoded.'],
        'valid',
        {
          ...metadata,
          decodedPreview: decodeBase64UrlPreview(input) ?? undefined
        }
      )
    );
  }

  if (isBase32Like(input)) {
    const preview = decodeBase32Preview(input);
    candidates.push(
      buildCandidate(
        'base32',
        preview ? 'Base32' : 'Base32-like',
        preview ? 78 : 40,
        preview
          ? ['Matches Base32 alphabet and decode succeeded.']
          : ['Matches Base32 alphabet but decoding failed.'],
        preview ? 'valid' : 'suspicious',
        {
          ...metadata,
          decodedPreview: preview ?? undefined
        }
      )
    );
  }

  if (isUrlSafeToken(input)) {
    candidates.push(
      buildCandidate(
        'url-safe-token',
        'URL-safe Token',
        66,
        ['Contains only URL-safe token characters.', 'Length suggests generated token material.'],
        'suspicious',
        metadata
      )
    );
  }

  if (isCiphertextBlob(input, entropy)) {
    candidates.push(
      buildCandidate(
        'ciphertext-blob',
        'Random-looking Ciphertext Blob',
        64,
        ['High entropy and low whitespace indicate random-looking data.', 'Could be encrypted data, key material, or compressed payload.'],
        'suspicious',
        metadata
      )
    );
  }

  const base58CharsOnly = input.length > 6 && [...input].every((char) => BASE58_ALPHABET.includes(char));
  if (base58CharsOnly) {
    candidates.push(
      buildCandidate(
        'url-safe-token',
        'Base58-like Token',
        58,
        ['Matches Base58 alphabet.', 'Token may be address or compact identifier format.'],
        'suspicious',
        metadata
      )
    );
  }

  if (isPlainTextLikely(input, entropy)) {
    candidates.push(
      buildCandidate(
        'plain-text',
        'Plain Text',
        70,
        ['Contains natural language spacing and vowel distribution.', 'Entropy profile looks human-readable.'],
        'valid',
        metadata
      )
    );
  }

  if (candidates.length === 0) {
    candidates.push(
      buildCandidate(
        'unknown',
        'Unknown',
        18,
        ['No strong signature matched known crypto-related formats.'],
        'suspicious',
        metadata
      )
    );
  }

  const deduped = candidates
    .sort((a, b) => b.score - a.score)
    .filter((candidate, index, array) =>
      array.findIndex((item) => item.kind === candidate.kind && item.typeName === candidate.typeName) === index
    )
    .slice(0, 8);

  const topMatch = deduped[0];

  return {
    inputSummary,
    candidates: deduped,
    topMatch,
    warnings,
    suggestions: candidateSuggestions(topMatch.kind)
  };
}

export function analyzeCryptoBatch(input: string, mode: InspectorMode): BatchInspectionReport {
  if (mode !== 'batch') {
    return {
      mode,
      reports: [
        {
          index: 1,
          valuePreview: truncate(input.trim(), 60),
          report: analyzeCryptoString(input)
        }
      ],
      warnings: []
    };
  }

  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const warnings: WarningMessage[] = [];
  const limited = lines.slice(0, 200);
  if (lines.length > limited.length) {
    warnings.push({
      code: 'batch-truncated',
      severity: 'info',
      message: 'Batch analysis is limited to the first 200 non-empty lines.'
    });
  }

  return {
    mode,
    reports: limited.map((line, index) => ({
      index: index + 1,
      valuePreview: truncate(line, 60),
      report: analyzeCryptoString(line)
    })),
    warnings
  };
}

export function inspectionSummaryText(report: InspectionReport): string {
  return `${report.topMatch.typeName} (${report.topMatch.score}/100, ${report.topMatch.validation})`;
}

export function toInspectionJson(report: InspectionReport): string {
  return JSON.stringify(report, null, 2);
}