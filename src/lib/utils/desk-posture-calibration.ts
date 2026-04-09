import type {
  DeskPostureBaseline,
  DeskPostureCalibrationSample,
  DeskPostureMetrics,
  DeskPostureSensitivity,
} from './desk-posture';

export type DeskPostureCalibrationStep = 'setup' | 'neutral' | 'slouched' | 'review' | 'complete';
export type DeskPostureCalibrationCaptureType = 'neutral' | 'slouched';
export type DeskPostureCalibrationWizardAction = 'start' | 'next' | 'back' | 'retry' | 'restart' | 'finish';
export type DeskPostureCalibrationIssue =
  | 'insufficient-frames'
  | 'low-confidence'
  | 'noisy-sample'
  | 'too-similar'
  | 'bad-posture-not-distinct'
  | 'incomplete-model';

export interface DeskPostureCalibrationSummary {
  sampleCount: number;
  confidence: number;
  profileQuality: number;
  noise: number;
  spread: number;
}

export interface DeskPostureCalibrationValidationResult {
  valid: boolean;
  issue: DeskPostureCalibrationIssue | null;
  message: string;
  summary: DeskPostureCalibrationSummary;
}

export interface DeskPostureCalibrationComparison {
  headForwardDelta: number;
  neckTiltDelta: number;
  shoulderImbalanceDelta: number;
  torsoLeanDelta: number;
  profileQualityDelta: number;
  cameraScaleDelta: number;
  separation: number;
}

export interface DeskPostureDualCalibrationModel {
  version: 2;
  good: DeskPostureBaseline;
  bad: DeskPostureBaseline;
  comparison: DeskPostureCalibrationComparison;
  createdAt: number;
}

export interface DeskPostureCalibrationWizardState {
  step: DeskPostureCalibrationStep;
  complete: boolean;
}

export interface DeskPostureDualScoreResult {
  score: number;
  goodDistance: number;
  badDistance: number;
  separation: number;
}

const MIN_SAMPLE_COUNT = 5;
const MIN_CONFIDENCE = 0.58;
const MIN_PROFILE_QUALITY = 0.32;
const MAX_NOISE = 0.14;
const MIN_SPREAD = 0.12;
const MIN_SEPARATION = 0.03;

export function summarizeDeskPostureCalibrationSamples(samples: DeskPostureCalibrationSample[]): DeskPostureCalibrationSummary {
  const sampleCount = samples.length;
  const confidence = average(samples.map((sample) => sample.confidence));
  const profileQuality = average(samples.map((sample) => sample.profileQuality));
  const noise = averagePairwiseDistance(samples);
  const spread = weightedMetricDistance(samples[0], samples.at(-1) ?? samples[0]);

  return {
    sampleCount,
    confidence,
    profileQuality,
    noise,
    spread
  };
}

export function validateDeskPostureCalibrationSamples(
  samples: DeskPostureCalibrationSample[],
  captureType: DeskPostureCalibrationCaptureType,
  goodBaseline?: DeskPostureBaseline | null
): DeskPostureCalibrationValidationResult {
  const summary = summarizeDeskPostureCalibrationSamples(samples);

  if (summary.sampleCount < MIN_SAMPLE_COUNT) {
    return {
      valid: false,
      issue: 'insufficient-frames',
      message:
        captureType === 'neutral'
          ? 'Collect a few more steady upright frames before continuing.'
          : 'Collect a few more steady slouched frames before continuing.',
      summary
    };
  }

  if (summary.confidence < MIN_CONFIDENCE || summary.profileQuality < MIN_PROFILE_QUALITY) {
    return {
      valid: false,
      issue: 'low-confidence',
      message:
        captureType === 'neutral'
          ? 'The upright sample is too uncertain. Keep your side profile fully visible and try again.'
          : 'The slouched sample is too uncertain. Keep your side profile visible and try again.',
      summary
    };
  }

  if (summary.noise > MAX_NOISE) {
    return {
      valid: false,
      issue: 'noisy-sample',
      message:
        captureType === 'neutral'
          ? 'The upright capture moved too much. Hold still for a moment and retry.'
          : 'The slouched capture moved too much. Hold the slouched posture steady and retry.',
      summary
    };
  }

  if (captureType === 'slouched' && goodBaseline) {
    const comparison = compareDeskPostureBaselines(goodBaseline, buildBaselineFromSamples(samples));
    if (comparison.separation < MIN_SEPARATION) {
      return {
        valid: false,
        issue: 'bad-posture-not-distinct',
        message:
          'The slouched sample is too close to the upright sample. Lean a bit more clearly forward, but keep it comfortable.',
        summary
      };
    }
  }

  if (captureType === 'slouched' && summary.spread < MIN_SPREAD) {
    return {
      valid: false,
      issue: 'too-similar',
      message: 'The slouched sample is too close to the upright sample. Try a more noticeable slump and retry.',
      summary
    };
  }

  return {
    valid: true,
    issue: null,
    message: captureType === 'neutral' ? 'Upright posture capture looks stable.' : 'Slouched posture capture looks stable.',
    summary
  };
}

export function compareDeskPostureBaselines(
  good: DeskPostureBaseline,
  bad: DeskPostureBaseline
): DeskPostureCalibrationComparison {
  return {
    headForwardDelta: Math.abs(bad.headForward - good.headForward),
    neckTiltDelta: Math.abs(bad.neckTilt - good.neckTilt),
    shoulderImbalanceDelta: Math.abs(bad.shoulderImbalance - good.shoulderImbalance),
    torsoLeanDelta: Math.abs(bad.torsoLean - good.torsoLean),
    profileQualityDelta: Math.abs(bad.profileQuality - good.profileQuality),
    cameraScaleDelta: Math.abs(bad.cameraScale - good.cameraScale),
    separation: weightedMetricDistance(good, bad)
  };
}

export function buildDeskPostureDualCalibrationModel(
  goodBaseline: DeskPostureBaseline,
  badBaseline: DeskPostureBaseline,
  createdAt: number
): DeskPostureDualCalibrationModel {
  return {
    version: 2,
    good: goodBaseline,
    bad: badBaseline,
    comparison: compareDeskPostureBaselines(goodBaseline, badBaseline),
    createdAt
  };
}

export function createDeskPostureCalibrationWizardState(): DeskPostureCalibrationWizardState {
  return { step: 'setup', complete: false };
}

export function transitionDeskPostureCalibrationWizard(
  state: DeskPostureCalibrationWizardState,
  action: DeskPostureCalibrationWizardAction
): DeskPostureCalibrationWizardState {
  if (action === 'start' || action === 'restart') {
    return { step: 'setup', complete: false };
  }

  if (action === 'retry') {
    return { ...state, complete: false };
  }

  if (action === 'back') {
    switch (state.step) {
      case 'neutral':
        return { step: 'setup', complete: false };
      case 'slouched':
        return { step: 'neutral', complete: false };
      case 'review':
        return { step: 'slouched', complete: false };
      default:
        return { ...state, complete: false };
    }
  }

  if (action === 'next') {
    switch (state.step) {
      case 'setup':
        return { step: 'neutral', complete: false };
      case 'neutral':
        return { step: 'slouched', complete: false };
      case 'slouched':
        return { step: 'review', complete: false };
      default:
        return { ...state, complete: false };
    }
  }

  if (action === 'finish' && state.step === 'review') {
    return { step: 'review', complete: true };
  }

  return state;
}

export function scoreDeskPostureWithDualCalibration(
  metrics: DeskPostureMetrics,
  model: DeskPostureDualCalibrationModel,
  sensitivity: DeskPostureSensitivity = 'balanced'
): DeskPostureDualScoreResult {
  const goodDistance = weightedMetricDistance(metrics, model.good);
  const badDistance = weightedMetricDistance(metrics, model.bad);
  const separation = Math.max(model.comparison.separation, MIN_SEPARATION);
  const rawScore = badDistance + goodDistance <= 0 ? 100 : (badDistance / (goodDistance + badDistance)) * 100;
  const spreadAdjusted = rawScore * clamp01(separation / MIN_SEPARATION);
  const sensitivityBias = getSensitivityBias(sensitivity);

  return {
    score: clamp0To100(Math.round(spreadAdjusted * sensitivityBias)),
    goodDistance,
    badDistance,
    separation
  };
}

function weightedMetricDistance(a: Pick<DeskPostureMetrics, 'headForward' | 'neckTilt' | 'shoulderImbalance' | 'torsoLean'>, b: Pick<DeskPostureBaseline, 'headForward' | 'neckTilt' | 'shoulderImbalance' | 'torsoLean'>): number {
  return (
    Math.abs(a.headForward - b.headForward) * 0.4 +
    Math.abs(a.neckTilt - b.neckTilt) * 0.25 +
    Math.abs(a.shoulderImbalance - b.shoulderImbalance) * 0.15 +
    Math.abs(a.torsoLean - b.torsoLean) * 0.2
  );
}

function averagePairwiseDistance(samples: DeskPostureCalibrationSample[]): number {
  if (samples.length < 2) return 0;

  let total = 0;
  for (let index = 1; index < samples.length; index += 1) {
    total += weightedMetricDistance(samples[index], samples[index - 1]);
  }

  return total / (samples.length - 1);
}

function buildBaselineFromSamples(samples: DeskPostureCalibrationSample[]): DeskPostureBaseline {
  return {
    headForward: median(samples.map((sample) => sample.headForward)),
    neckTilt: median(samples.map((sample) => sample.neckTilt)),
    shoulderImbalance: median(samples.map((sample) => sample.shoulderImbalance)),
    torsoLean: median(samples.map((sample) => sample.torsoLean)),
    confidence: average(samples.map((sample) => sample.confidence)),
    profileQuality: average(samples.map((sample) => sample.profileQuality)),
    cameraScale: average(samples.map((sample) => sample.cameraScale)),
    sampleCount: samples.length
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clamp0To100(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getSensitivityBias(sensitivity: DeskPostureSensitivity): number {
  switch (sensitivity) {
    case 'gentle':
      return 1.05;
    case 'strict':
      return 0.95;
    default:
      return 1;
  }
}
