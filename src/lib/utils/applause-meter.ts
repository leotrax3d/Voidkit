export type MeterState =
  | 'idle'
  | 'requesting-permission'
  | 'listening'
  | 'mic-error'
  | 'permission-denied';

export type MicError =
  | 'permission-denied'
  | 'no-microphone'
  | 'not-supported'
  | 'audio-context-failed'
  | 'stream-interrupted'
  | 'unknown';

export type SensitivityPreset = 'low' | 'medium' | 'high';

export interface ClapFrame {
  timestampMs: number;
  rms: number;
  peak: number;
}

export interface ClapDetectionResult {
  clapDetected: boolean;
  liveLevel: number;
  clapCount: number;
  clapsPerMinute: number;
  score: number;
  sessionMaxPeak: number;
  noiseFloor: number;
  threshold: number;
  transient: number;
  peakHold: number;
  timeline: number[];
}

export interface ClapDetectorOptions {
  preset?: SensitivityPreset;
  crowdMode?: boolean;
  timelineSize?: number;
}

interface PresetConfig {
  minPeak: number;
  riseThreshold: number;
  cooldownMs: number;
  thresholdMultiplier: number;
  smoothingWindow: number;
}

const PRESET_CONFIG: Record<SensitivityPreset, PresetConfig> = {
  low: {
    minPeak: 0.3,
    riseThreshold: 0.085,
    cooldownMs: 220,
    thresholdMultiplier: 2.8,
    smoothingWindow: 7
  },
  medium: {
    minPeak: 0.2,
    riseThreshold: 0.06,
    cooldownMs: 170,
    thresholdMultiplier: 2.3,
    smoothingWindow: 5
  },
  high: {
    minPeak: 0.13,
    riseThreshold: 0.04,
    cooldownMs: 120,
    thresholdMultiplier: 1.9,
    smoothingWindow: 3
  }
};

export const METER_ERROR_MESSAGES: Record<MicError, string> = {
  'permission-denied': 'Microphone access was denied. Please allow microphone access in your browser settings.',
  'no-microphone': 'No microphone device found. Connect a microphone and try again.',
  'not-supported': 'Your browser does not support required audio APIs. Try a modern browser.',
  'audio-context-failed': 'Failed to initialize audio context. Please try again.',
  'stream-interrupted': 'Microphone stream was interrupted. Start listening again.',
  unknown: 'An unexpected microphone error occurred. Please try again.'
};

export function getMeterStateLabel(state: MeterState): string {
  switch (state) {
    case 'idle':
      return 'Idle';
    case 'requesting-permission':
      return 'Requesting permission';
    case 'listening':
      return 'Listening';
    case 'mic-error':
      return 'Mic error';
    case 'permission-denied':
      return 'Permission denied';
    default:
      return 'Idle';
  }
}

export function getMeterStateMessage(state: MeterState, error?: MicError): string {
  if (state === 'mic-error' || state === 'permission-denied') {
    if (error) {
      return METER_ERROR_MESSAGES[error];
    }
  }

  switch (state) {
    case 'idle':
      return 'Click "Start Listening" to begin.';
    case 'requesting-permission':
      return 'Requesting microphone permission…';
    case 'listening':
      return 'Listening for clap peaks…';
    case 'mic-error':
      return METER_ERROR_MESSAGES.unknown;
    case 'permission-denied':
      return METER_ERROR_MESSAGES['permission-denied'];
    default:
      return 'Click "Start Listening" to begin.';
  }
}

export function canTransitionMeterState(from: MeterState, to: MeterState): boolean {
  const transitions: Record<MeterState, MeterState[]> = {
    idle: ['requesting-permission', 'permission-denied', 'mic-error'],
    'requesting-permission': ['listening', 'permission-denied', 'mic-error', 'idle'],
    listening: ['idle', 'mic-error', 'permission-denied'],
    'mic-error': ['idle', 'requesting-permission'],
    'permission-denied': ['idle', 'requesting-permission']
  };

  return transitions[from].includes(to);
}

export function mapMicError(error: unknown): MicError {
  const e = error as { name?: string; message?: string };
  const name = (e?.name ?? '').toLowerCase();
  const message = (e?.message ?? '').toLowerCase();

  if (name === 'notallowederror' || message.includes('permission') || message.includes('denied')) {
    return 'permission-denied';
  }
  if (name === 'notfounderror' || message.includes('no microphone') || message.includes('input device')) {
    return 'no-microphone';
  }
  if (message.includes('audiocontext') || message.includes('audio context')) {
    return 'audio-context-failed';
  }
  if (message.includes('interrupted') || message.includes('ended')) {
    return 'stream-interrupted';
  }
  if (name === 'notsupportederror' || message.includes('not supported')) {
    return 'not-supported';
  }
  return 'unknown';
}

export function calculateScore(params: {
  liveLevel: number;
  clapsPerMinute: number;
  sessionMaxPeak: number;
  crowdMode?: boolean;
}): number {
  const level = clamp01(params.liveLevel);
  const maxPeak = clamp01(params.sessionMaxPeak);
  const cpmTarget = params.crowdMode ? 360 : 220;
  const cpmNorm = clamp01(params.clapsPerMinute / cpmTarget);

  const weighted = params.crowdMode
    ? level * 0.35 + cpmNorm * 0.5 + maxPeak * 0.15
    : level * 0.45 + cpmNorm * 0.4 + maxPeak * 0.15;

  return clamp0To100(Math.round(weighted * 100));
}

export class ClapDetector {
  private preset: SensitivityPreset;
  private crowdMode: boolean;
  private lastLevel = 0;
  private smoothWindow: number[] = [];
  private clapTimestamps: number[] = [];
  private timeline: number[] = [];
  private noiseFloor = 0.02;
  private threshold = 0.18;
  private lastClapAt = -Infinity;
  private sessionMaxPeak = 0;
  private clapCount = 0;
  private peakHold = 0;
  private readonly timelineSize: number;

  constructor(options: ClapDetectorOptions = {}) {
    this.preset = options.preset ?? 'medium';
    this.crowdMode = Boolean(options.crowdMode);
    this.timelineSize = Math.max(24, options.timelineSize ?? 60);
  }

  setPreset(preset: SensitivityPreset): void {
    this.preset = preset;
    this.smoothWindow = [];
  }

  setCrowdMode(enabled: boolean): void {
    this.crowdMode = enabled;
  }

  calibrateNoiseFloor(samples?: number[]): void {
    if (!samples || samples.length === 0) {
      this.noiseFloor = Math.max(0.005, this.noiseFloor * 1.05);
      this.recomputeThreshold();
      return;
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    this.noiseFloor = clamp01(Math.max(0.003, median));
    this.recomputeThreshold();
  }

  resetSession(): void {
    this.lastLevel = 0;
    this.smoothWindow = [];
    this.clapTimestamps = [];
    this.timeline = [];
    this.lastClapAt = -Infinity;
    this.sessionMaxPeak = 0;
    this.clapCount = 0;
    this.peakHold = 0;
  }

  update(frame: ClapFrame): ClapDetectionResult {
    const config = PRESET_CONFIG[this.preset];
    const level = clamp01(Math.max(frame.rms, frame.peak * 0.65));

    this.smoothWindow.push(level);
    if (this.smoothWindow.length > config.smoothingWindow) {
      this.smoothWindow.shift();
    }

    const smoothed = this.smoothWindow.reduce((sum, value) => sum + value, 0) / this.smoothWindow.length;
    const transient = smoothed - this.lastLevel;

    if (frame.peak > this.sessionMaxPeak) {
      this.sessionMaxPeak = frame.peak;
    }

    this.adaptNoiseFloor(smoothed, frame.peak);
    this.recomputeThreshold();

    const now = frame.timestampMs;
    const cooldownMs = this.crowdMode ? Math.round(config.cooldownMs * 0.75) : config.cooldownMs;
    const overCooldown = now - this.lastClapAt >= cooldownMs;
    const clapDetected = overCooldown && frame.peak >= Math.max(config.minPeak, this.threshold) && transient >= config.riseThreshold;

    if (clapDetected) {
      this.lastClapAt = now;
      this.clapCount += 1;
      this.clapTimestamps.push(now);
      this.peakHold = Math.max(this.peakHold * 0.92, frame.peak);
    } else {
      this.peakHold = Math.max(frame.peak, this.peakHold * 0.96);
    }

    const minuteAgo = now - 60_000;
    this.clapTimestamps = this.clapTimestamps.filter((ts) => ts >= minuteAgo);
    const clapsPerMinute = this.clapTimestamps.length;

    const liveLevel = clamp01((smoothed - this.noiseFloor) / Math.max(0.1, 1 - this.noiseFloor));
    const score = calculateScore({
      liveLevel,
      clapsPerMinute,
      sessionMaxPeak: this.sessionMaxPeak,
      crowdMode: this.crowdMode
    });

    this.timeline.push(liveLevel);
    if (this.timeline.length > this.timelineSize) {
      this.timeline.shift();
    }

    this.lastLevel = smoothed;

    return {
      clapDetected,
      liveLevel,
      clapCount: this.clapCount,
      clapsPerMinute,
      score,
      sessionMaxPeak: clamp01(this.sessionMaxPeak),
      noiseFloor: this.noiseFloor,
      threshold: this.threshold,
      transient,
      peakHold: clamp01(this.peakHold),
      timeline: [...this.timeline]
    };
  }

  private adaptNoiseFloor(smoothed: number, peak: number): void {
    // Learn background only when current signal looks like ambient noise.
    if (peak <= this.threshold * 0.75) {
      const alpha = this.crowdMode ? 0.025 : 0.035;
      this.noiseFloor = clamp01((1 - alpha) * this.noiseFloor + alpha * smoothed);
      this.noiseFloor = Math.max(0.003, this.noiseFloor);
    }
  }

  private recomputeThreshold(): void {
    const config = PRESET_CONFIG[this.preset];
    const crowdBoost = this.crowdMode ? 0.92 : 1;
    this.threshold = clamp01(Math.max(config.minPeak, this.noiseFloor * config.thresholdMultiplier * crowdBoost));
  }
}

function clamp01(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clamp0To100(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}
