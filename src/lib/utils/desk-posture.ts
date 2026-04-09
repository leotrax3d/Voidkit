import { HysteresisStabilizer, MovingAverageSmoother } from './smoothing';
import type { Landmark } from './finger-counting';
import {
  scoreDeskPostureWithDualCalibration,
  type DeskPostureDualCalibrationModel,
  type DeskPostureDualScoreResult,
} from './desk-posture-calibration';

export type DeskPostureSensitivity = 'gentle' | 'balanced' | 'strict';
export type DeskPosturePhase = 'idle' | 'calibrating' | 'monitoring' | 'error';
export type DeskPostureState = 'good' | 'slightly-off' | 'poor' | 'no-person';
export type DeskPostureSetupIssue = 'frontal-angle' | 'camera-too-close' | 'camera-too-far' | 'low-confidence';
export type DeskPostureError =
  | 'permission-denied'
  | 'camera-unavailable'
  | 'not-supported'
  | 'model-load-failed'
  | 'notification-denied'
  | 'low-confidence'
  | 'unknown';

export interface DeskPostureLandmarks {
  landmarks: Landmark[];
}

export interface DeskPostureMetrics {
  headForward: number;
  neckTilt: number;
  shoulderImbalance: number;
  torsoLean: number;
  confidence: number;
  profileQuality: number;
  cameraScale: number;
  profileSide: 'left' | 'right' | 'unknown';
}

export interface DeskPostureBaseline {
  headForward: number;
  neckTilt: number;
  shoulderImbalance: number;
  torsoLean: number;
  confidence: number;
  profileQuality: number;
  cameraScale: number;
  sampleCount: number;
}

export type DeskPostureCalibrationModel = DeskPostureDualCalibrationModel;
export type DeskPostureCalibrationScoreResult = DeskPostureDualScoreResult;

export interface DeskPostureCalibrationSample extends DeskPostureMetrics {
  timestampMs: number;
}

export interface DeskPostureFrame extends DeskPostureLandmarks {
  timestampMs: number;
}

export interface DeskPostureAssessment extends DeskPostureMetrics {
  rawScore: number;
  score: number;
  postureState: DeskPostureState;
  phase: DeskPosturePhase;
  setupIssue: DeskPostureSetupIssue | null;
  baselineUsed: boolean;
  personVisible: boolean;
  trackingReliable: boolean;
  shouldWarn: boolean;
  warningEvents: number;
  poorStreakMs: number;
  longestPoorStreakMs: number;
  sessionDurationMs: number;
  goodPosturePercentage: number;
  timeline: number[];
}

export interface DeskPostureSummary {
  sessionDurationMs: number;
  goodPosturePercentage: number;
  warningEvents: number;
  longestPoorStreakMs: number;
}

export interface DeskPostureEngineOptions {
  sensitivity?: DeskPostureSensitivity;
  alertDelayMs?: number;
  cooldownMs?: number;
  occlusionGraceMs?: number;
  minReliableConfidence?: number;
  timelineSize?: number;
  stabilityWindow?: number;
}

interface SensitivityConfig {
  scoreThresholds: {
    headForward: number;
    neckTilt: number;
    shoulderImbalance: number;
    torsoLean: number;
  };
  profileThreshold: number;
  minCameraScale: number;
  maxCameraScale: number;
  goodScore: number;
  poorScore: number;
}

const LANDMARK_INDEX = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24
} as const;

const SENSITIVITY_CONFIG: Record<DeskPostureSensitivity, SensitivityConfig> = {
  gentle: {
    scoreThresholds: {
      headForward: 0.22,
      neckTilt: 12,
      shoulderImbalance: 0.12,
      torsoLean: 12
    },
    profileThreshold: 0.28,
    minCameraScale: 0.13,
    maxCameraScale: 0.36,
    goodScore: 82,
    poorScore: 68
  },
  balanced: {
    scoreThresholds: {
      headForward: 0.16,
      neckTilt: 9,
      shoulderImbalance: 0.085,
      torsoLean: 9
    },
    profileThreshold: 0.34,
    minCameraScale: 0.12,
    maxCameraScale: 0.33,
    goodScore: 78,
    poorScore: 66
  },
  strict: {
    scoreThresholds: {
      headForward: 0.12,
      neckTilt: 6,
      shoulderImbalance: 0.06,
      torsoLean: 6
    },
    profileThreshold: 0.4,
    minCameraScale: 0.11,
    maxCameraScale: 0.3,
    goodScore: 74,
    poorScore: 60
  }
};

export const DESK_POSTURE_ERROR_MESSAGES: Record<DeskPostureError, string> = {
  'permission-denied': 'Camera permission was denied. Please allow access in your browser settings.',
  'camera-unavailable': 'No camera was found on your device. Connect or enable a camera and try again.',
  'not-supported': 'Your browser does not support the required camera or pose APIs.',
  'model-load-failed': 'Failed to load the posture model. Check your connection and try again.',
  'notification-denied': 'Browser notifications were denied. You can still use in-app warnings.',
  'low-confidence': 'Tracking confidence is too low for reliable analysis right now.',
  unknown: 'An unexpected posture error occurred. Please try again.'
};

export const DESK_POSTURE_SETUP_MESSAGES: Record<DeskPostureSetupIssue, string> = {
  'frontal-angle': 'The camera looks too frontal. Move it to the side of your body and capture a clear profile view.',
  'camera-too-close': 'The camera is too close. Move it farther away so your shoulders and hips fit comfortably in frame.',
  'camera-too-far': 'The camera is too far away. Move it closer so your side profile is clearly visible.',
  'low-confidence': 'Tracking confidence is too low for reliable side-view analysis. Improve lighting and keep the profile visible.'
};

export function getDeskPostureSetupMessage(issue: DeskPostureSetupIssue | null | undefined): string {
  if (!issue) return '';
  return DESK_POSTURE_SETUP_MESSAGES[issue];
}

export function getDeskPosturePhaseLabel(phase: DeskPosturePhase): string {
  switch (phase) {
    case 'idle':
      return 'Idle';
    case 'calibrating':
      return 'Calibrating';
    case 'monitoring':
      return 'Monitoring';
    case 'error':
      return 'Error';
    default:
      return 'Idle';
  }
}

export function getDeskPostureStatusMessage(phase: DeskPosturePhase, error?: DeskPostureError): string {
  if (phase === 'error') {
    return error ? DESK_POSTURE_ERROR_MESSAGES[error] : DESK_POSTURE_ERROR_MESSAGES.unknown;
  }

  switch (phase) {
    case 'idle':
      return 'Click "Start Camera" to begin side-view monitoring.';
    case 'calibrating':
      return 'Hold a neutral side profile while baseline calibration runs.';
    case 'monitoring':
      return 'Monitoring side-view posture locally in your browser.';
    default:
      return 'Click "Start Camera" to begin side-view monitoring.';
  }
}

export function canTransitionDeskPosturePhase(from: DeskPosturePhase, to: DeskPosturePhase): boolean {
  const transitions: Record<DeskPosturePhase, DeskPosturePhase[]> = {
    idle: ['calibrating', 'error'],
    calibrating: ['monitoring', 'idle', 'error'],
    monitoring: ['idle', 'calibrating', 'error'],
    error: ['idle', 'calibrating']
  };

  return transitions[from].includes(to);
}

export function mapDeskPostureError(error: unknown): DeskPostureError {
  const value = error as { name?: string; message?: string };
  const name = (value?.name ?? '').toLowerCase();
  const message = (value?.message ?? '').toLowerCase();

  if (name === 'notallowederror' || message.includes('permission') || message.includes('denied')) {
    return 'permission-denied';
  }
  if (name === 'notfounderror' || message.includes('camera') || message.includes('device')) {
    return 'camera-unavailable';
  }
  if (name === 'notsupportederror' || message.includes('not supported')) {
    return 'not-supported';
  }
  if (message.includes('model') || message.includes('landmarker') || message.includes('pose')) {
    return 'model-load-failed';
  }
  if (message.includes('notification')) {
    return 'notification-denied';
  }
  return 'unknown';
}

export function measureDeskPosture(landmarks: Landmark[] | null | undefined): DeskPostureMetrics | null {
  if (!landmarks || landmarks.length <= LANDMARK_INDEX.rightHip) {
    return null;
  }

  const nose = landmarks[LANDMARK_INDEX.nose];
  const leftEye = landmarks[1];
  const rightEye = landmarks[2];
  const leftEar = landmarks[3];
  const rightEar = landmarks[4];
  const leftShoulder = landmarks[LANDMARK_INDEX.leftShoulder];
  const rightShoulder = landmarks[LANDMARK_INDEX.rightShoulder];
  const leftHip = landmarks[LANDMARK_INDEX.leftHip];
  const rightHip = landmarks[LANDMARK_INDEX.rightHip];

  if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return null;
  }

  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);
  const shoulderSpan = distance(leftShoulder, rightShoulder);
  const torsoSpan = distance(shoulderMid, hipMid);
  const shoulderWidth = Math.max(shoulderSpan, 0.12);
  const torsoLength = Math.max(torsoSpan, 0.18);

  const headAnchor = chooseHeadAnchor([leftEye, rightEye, leftEar, rightEar]);
  const sideOffset = Math.abs(nose.x - shoulderMid.x) / shoulderWidth;
  const anchorOffset = headAnchor ? Math.abs(headAnchor.x - shoulderMid.x) / shoulderWidth : sideOffset;
  const depthLead = Math.max(0, (shoulderMid.z ?? 0) - (nose.z ?? 0)) / shoulderWidth;
  const anchorDepthLead = headAnchor ? Math.max(0, (shoulderMid.z ?? 0) - (headAnchor.z ?? 0)) / shoulderWidth : depthLead;

  const headForward = clamp01(sideOffset * 0.48 + anchorOffset * 0.22 + depthLead * 0.22 + anchorDepthLead * 0.08);

  const neckTilt = clamp01(
    degrees(Math.atan2(Math.abs(nose.x - shoulderMid.x), Math.abs(shoulderMid.y - nose.y) + 0.0001)) / 45
  );

  const shoulderImbalance = clamp01(Math.abs(leftShoulder.y - rightShoulder.y) / shoulderWidth);
  const torsoLean = clamp01(
    degrees(Math.atan2(Math.abs(hipMid.x - shoulderMid.x), Math.abs(hipMid.y - shoulderMid.y) + 0.0001)) / 45
  );

  const profileQuality = clamp01((sideOffset * 0.7 + anchorOffset * 0.3) / 0.28);
  const cameraScale = shoulderSpan * 0.58 + torsoSpan * 0.42;
  const confidence = clamp01(confidenceFromLandmarks([nose, leftEye, rightEye, leftEar, rightEar, leftShoulder, rightShoulder, leftHip, rightHip]) * 0.85 + profileQuality * 0.15);

  const profileSide = inferProfileSide(leftEye, rightEye, leftEar, rightEar);

  return {
    headForward,
    neckTilt,
    shoulderImbalance,
    torsoLean,
    confidence,
    profileQuality,
    cameraScale,
    profileSide
  };
}

export function buildDeskPostureBaseline(samples: DeskPostureCalibrationSample[]): DeskPostureBaseline | null {
  const reliableSamples = samples.filter((sample) => sample.confidence >= 0.5 && sample.profileQuality >= 0.35);
  if (reliableSamples.length === 0) {
    return null;
  }

  return {
    headForward: median(reliableSamples.map((sample) => sample.headForward)),
    neckTilt: median(reliableSamples.map((sample) => sample.neckTilt)),
    shoulderImbalance: median(reliableSamples.map((sample) => sample.shoulderImbalance)),
    torsoLean: median(reliableSamples.map((sample) => sample.torsoLean)),
    profileQuality: median(reliableSamples.map((sample) => sample.profileQuality)),
    cameraScale: median(reliableSamples.map((sample) => sample.cameraScale)),
    confidence: average(reliableSamples.map((sample) => sample.confidence)),
    sampleCount: reliableSamples.length
  };
}

export function calculateDeskPostureScore(
  metrics: DeskPostureMetrics,
  baseline: DeskPostureBaseline | null,
  sensitivity: DeskPostureSensitivity = 'balanced'
): number {
  const config = SENSITIVITY_CONFIG[sensitivity];
  const values = baseline
    ? {
        headForward: Math.abs(metrics.headForward - baseline.headForward),
        neckTilt: Math.abs(metrics.neckTilt - baseline.neckTilt),
        shoulderImbalance: Math.abs(metrics.shoulderImbalance - baseline.shoulderImbalance),
        torsoLean: Math.abs(metrics.torsoLean - baseline.torsoLean)
      }
    : {
        headForward: metrics.headForward,
        neckTilt: metrics.neckTilt,
        shoulderImbalance: metrics.shoulderImbalance,
        torsoLean: metrics.torsoLean
      };

  const severity =
    clamp01(values.headForward / config.scoreThresholds.headForward) * 0.35 +
    clamp01(values.neckTilt / config.scoreThresholds.neckTilt) * 0.3 +
    clamp01(values.shoulderImbalance / config.scoreThresholds.shoulderImbalance) * 0.15 +
    clamp01(values.torsoLean / config.scoreThresholds.torsoLean) * 0.2;

  return clamp0To100(Math.round(100 - severity * 100));
}

export function calculateDeskPostureScoreFromCalibration(
  metrics: DeskPostureMetrics,
  calibrationModel: DeskPostureCalibrationModel,
  sensitivity: DeskPostureSensitivity = 'balanced'
): DeskPostureCalibrationScoreResult {
  return scoreDeskPostureWithDualCalibration(metrics, calibrationModel, sensitivity);
}

export function getDeskPostureSetupIssue(
  metrics: DeskPostureMetrics,
  personVisible: boolean,
  sensitivity: DeskPostureSensitivity = 'balanced'
): DeskPostureSetupIssue | null {
  if (!personVisible) {
    return 'low-confidence';
  }

  const config = SENSITIVITY_CONFIG[sensitivity];
  if (metrics.profileQuality < config.profileThreshold) {
    return 'frontal-angle';
  }
  if (metrics.cameraScale < config.minCameraScale) {
    return 'camera-too-far';
  }
  if (metrics.cameraScale > config.maxCameraScale) {
    return 'camera-too-close';
  }

  return null;
}

export interface DeskPostureAlertPolicyOptions {
  sensitivity?: DeskPostureSensitivity;
  alertDelayMs?: number;
  cooldownMs?: number;
  occlusionGraceMs?: number;
  minReliableConfidence?: number;
  timelineSize?: number;
}

export interface DeskPostureUpdate {
  timestampMs: number;
  phase: DeskPosturePhase;
  postureState: DeskPostureState;
  rawScore: number;
  score: number;
  confidence: number;
  personVisible: boolean;
  trackingReliable: boolean;
  shouldWarn: boolean;
  warningEvents: number;
  poorStreakMs: number;
  longestPoorStreakMs: number;
  sessionDurationMs: number;
  goodPosturePercentage: number;
  timeline: number[];
  metrics: DeskPostureMetrics | null;
  setupIssue: DeskPostureSetupIssue | null;
}

export interface CalibrationState {
  phase: DeskPosturePhase;
  sampleCount: number;
  startedAt: number | null;
}

export class DeskPostureEngine {
  private sensitivity: DeskPostureSensitivity;
  private alertDelayMs: number;
  private readonly cooldownMs: number;
  private readonly occlusionGraceMs: number;
  private readonly minReliableConfidence: number;
  private readonly timelineSize: number;
  private readonly scoreSmoother: MovingAverageSmoother;
  private readonly scoreStabilizer: HysteresisStabilizer;

  private baseline: DeskPostureBaseline | null = null;
  private calibrationModel: DeskPostureCalibrationModel | null = null;
  private calibrationSamples: DeskPostureCalibrationSample[] = [];
  private calibrationStartedAt: number | null = null;
  private phase: DeskPosturePhase = 'idle';
  private lastTimestampMs = -1;
  private lastReliableAt = -Infinity;
  private lastGoodState: DeskPostureState = 'good';
  private poorSinceMs: number | null = null;
  private lastWarningAt = -Infinity;
  private warningEvents = 0;
  private longestPoorStreakMs = 0;
  private sessionStartAt = -1;
  private goodMs = 0;
  private slightMs = 0;
  private poorMs = 0;
  private noPersonMs = 0;
  private timeline: number[] = [];

  constructor(options: DeskPostureEngineOptions = {}) {
    this.sensitivity = options.sensitivity ?? 'balanced';
    this.alertDelayMs = options.alertDelayMs ?? 90_000;
    this.cooldownMs = options.cooldownMs ?? 300_000;
    this.occlusionGraceMs = options.occlusionGraceMs ?? 1_500;
    this.minReliableConfidence = options.minReliableConfidence ?? 0.5;
    this.timelineSize = Math.max(16, options.timelineSize ?? 90);
    this.scoreSmoother = new MovingAverageSmoother(5);
    this.scoreStabilizer = new HysteresisStabilizer(3);
  }

  setSensitivity(sensitivity: DeskPostureSensitivity): void {
    this.sensitivity = sensitivity;
  }

  setAlertDelayMs(alertDelayMs: number): void {
    this.alertDelayMs = Math.max(0, alertDelayMs);
  }

  getBaseline(): DeskPostureBaseline | null {
    return this.baseline;
  }

  setBaseline(baseline: DeskPostureBaseline | null): void {
    this.baseline = baseline;
  }

  setCalibrationModel(calibrationModel: DeskPostureCalibrationModel | null): void {
    this.calibrationModel = calibrationModel;
  }

  getCalibrationModel(): DeskPostureCalibrationModel | null {
    return this.calibrationModel;
  }

  startCalibration(timestampMs: number): void {
    this.calibrationSamples = [];
    this.calibrationStartedAt = timestampMs;
    this.phase = 'calibrating';
  }

  captureCalibrationFrame(frame: DeskPostureFrame): boolean {
    const metrics = measureDeskPosture(frame.landmarks);
    if (!metrics || metrics.confidence < this.minReliableConfidence) {
      return false;
    }

    this.calibrationSamples.push({ ...metrics, timestampMs: frame.timestampMs });
    return true;
  }

  finishCalibration(): DeskPostureBaseline | null {
    const baseline = buildDeskPostureBaseline(this.calibrationSamples);
    if (!baseline) {
      this.phase = 'idle';
      this.calibrationStartedAt = null;
      return null;
    }

    this.baseline = baseline;
    this.phase = 'monitoring';
    this.calibrationStartedAt = null;
    this.resetRuntime();
    return baseline;
  }

  resetSession(): void {
    this.resetRuntime();
    this.phase = 'idle';
    this.baseline = this.baseline;
    this.calibrationSamples = [];
    this.calibrationStartedAt = null;
  }

  update(frame: DeskPostureFrame): DeskPostureUpdate {
    const metrics = measureDeskPosture(frame.landmarks);
    const timestampMs = frame.timestampMs;

    if (this.sessionStartAt < 0) {
      this.sessionStartAt = timestampMs;
      this.lastTimestampMs = timestampMs;
    }

    const deltaMs = Math.max(0, timestampMs - this.lastTimestampMs);
    if (deltaMs > 0) {
      this.accumulateDuration(this.lastGoodState, deltaMs);
      if (this.lastGoodState === 'poor' && this.poorSinceMs !== null) {
        this.longestPoorStreakMs = Math.max(this.longestPoorStreakMs, timestampMs - this.poorSinceMs);
      }
    }

    this.lastTimestampMs = timestampMs;

    if (!metrics) {
      return this.buildUpdate({
        timestampMs,
        metrics: null,
        score: this.scoreStabilizer.update(this.scoreSmoother.update(0)),
        rawScore: 0,
        confidence: 0,
        postureState: 'no-person',
        personVisible: false,
        trackingReliable: false,
        shouldWarn: false,
        setupIssue: 'low-confidence'
      });
    }

    const personVisible = metrics.confidence >= this.minReliableConfidence;
    const setupIssue = getDeskPostureSetupIssue(metrics, personVisible, this.sensitivity);
    if (personVisible) {
      this.lastReliableAt = timestampMs;
    }

    if (!personVisible || setupIssue) {
      const withinGrace = Number.isFinite(this.lastReliableAt) && timestampMs - this.lastReliableAt <= this.occlusionGraceMs;
      const fallbackState = withinGrace ? this.lastGoodState : 'no-person';
      const fallbackScore = this.scoreStabilizer.update(this.scoreSmoother.update(this.currentScore()));

      if (!withinGrace) {
        this.poorSinceMs = null;
      }

      return this.buildUpdate({
        timestampMs,
        metrics,
        score: fallbackScore,
        rawScore: this.currentScore(),
        confidence: metrics.confidence,
        postureState: fallbackState,
        personVisible: personVisible,
        trackingReliable: false,
        shouldWarn: false,
        setupIssue: setupIssue ?? (!personVisible ? 'low-confidence' : null)
      });
    }

    const scoreResult = this.calibrationModel
      ? calculateDeskPostureScoreFromCalibration(metrics, this.calibrationModel, this.sensitivity)
      : { score: calculateDeskPostureScore(metrics, this.baseline, this.sensitivity), goodDistance: 0, badDistance: 0, separation: 0 };
    const rawScore = scoreResult.score;
    const smoothScore = this.scoreSmoother.update(rawScore);
    const score = this.scoreStabilizer.update(Math.round(smoothScore));
    const postureState = this.resolvePostureState(score, metrics.confidence);

    if (postureState === 'poor') {
      if (this.poorSinceMs === null) {
        this.poorSinceMs = timestampMs;
      }
    } else {
      this.poorSinceMs = null;
    }

    const poorStreakMs = this.poorSinceMs ? timestampMs - this.poorSinceMs : 0;
    const shouldWarn =
      postureState === 'poor' &&
      poorStreakMs >= this.alertDelayMs &&
      timestampMs - this.lastWarningAt >= this.cooldownMs;

    if (shouldWarn) {
      this.warningEvents += 1;
      this.lastWarningAt = timestampMs;
    }

    this.lastGoodState = postureState;

    return this.buildUpdate({
      timestampMs,
      metrics,
      score,
      rawScore,
      confidence: metrics.confidence,
      postureState,
      personVisible: true,
      trackingReliable: true,
      shouldWarn,
      setupIssue: null,
      poorStreakMs
    });
  }

  getCalibrationState(): CalibrationState {
    return {
      phase: this.phase,
      sampleCount: this.calibrationSamples.length,
      startedAt: this.calibrationStartedAt
    };
  }

  getSummary(currentTimestampMs?: number): DeskPostureSummary {
    const timestampMs = currentTimestampMs ?? this.lastTimestampMs;
    const duration = this.sessionStartAt ? Math.max(0, timestampMs - this.sessionStartAt) : 0;
    return {
      sessionDurationMs: duration,
      goodPosturePercentage: duration > 0 ? Math.round((this.goodMs / duration) * 100) : 0,
      warningEvents: this.warningEvents,
      longestPoorStreakMs: this.longestPoorStreakMs
    };
  }

  private resetRuntime(): void {
    this.phase = 'monitoring';
    this.lastTimestampMs = -1;
    this.lastReliableAt = -Infinity;
    this.lastGoodState = 'good';
    this.poorSinceMs = null;
    this.lastWarningAt = -Infinity;
    this.warningEvents = 0;
    this.longestPoorStreakMs = 0;
    this.sessionStartAt = -1;
    this.goodMs = 0;
    this.slightMs = 0;
    this.poorMs = 0;
    this.noPersonMs = 0;
    this.timeline = [];
    this.scoreSmoother.reset();
    this.scoreStabilizer.reset();
  }

  private currentScore(): number {
    return this.timeline.at(-1) ?? 0;
  }

  private accumulateDuration(state: DeskPostureState, deltaMs: number): void {
    switch (state) {
      case 'good':
        this.goodMs += deltaMs;
        break;
      case 'slightly-off':
        this.slightMs += deltaMs;
        break;
      case 'poor':
        this.poorMs += deltaMs;
        break;
      case 'no-person':
        this.noPersonMs += deltaMs;
        break;
    }
  }

  private resolvePostureState(score: number, confidence: number): DeskPostureState {
    if (confidence < this.minReliableConfidence) {
      return 'no-person';
    }

    const config = SENSITIVITY_CONFIG[this.sensitivity];
    if (score >= config.goodScore) {
      return 'good';
    }
    if (score >= config.poorScore) {
      return 'slightly-off';
    }
    return 'poor';
  }

  private buildUpdate(input: {
    timestampMs: number;
    metrics: DeskPostureMetrics | null;
    score: number;
    rawScore: number;
    confidence: number;
    postureState: DeskPostureState;
    personVisible: boolean;
    trackingReliable: boolean;
    shouldWarn: boolean;
    setupIssue: DeskPostureSetupIssue | null;
    poorStreakMs?: number;
  }): DeskPostureUpdate {
    const timelineScore = clamp0To100(input.score);
    this.timeline.push(timelineScore);
    if (this.timeline.length > this.timelineSize) {
      this.timeline.shift();
    }

    const state = input.postureState;
    if (state === 'poor') {
      this.longestPoorStreakMs = Math.max(this.longestPoorStreakMs, input.poorStreakMs ?? 0);
    }

    const summary = this.getSummary(input.timestampMs);

    return {
      timestampMs: input.timestampMs,
      phase: this.phase,
      postureState: state,
      rawScore: clamp0To100(input.rawScore),
      score: clamp0To100(input.score),
      confidence: clamp01(input.confidence),
      personVisible: input.personVisible,
      trackingReliable: input.trackingReliable,
      shouldWarn: input.shouldWarn,
      warningEvents: this.warningEvents,
      poorStreakMs: input.poorStreakMs ?? 0,
      longestPoorStreakMs: summary.longestPoorStreakMs,
      sessionDurationMs: summary.sessionDurationMs,
      goodPosturePercentage: summary.goodPosturePercentage,
      timeline: [...this.timeline],
      metrics: input.metrics,
      setupIssue: input.setupIssue
    };
  }
}

function chooseHeadAnchor(points: Array<Landmark | undefined>): Landmark | null {
  const visiblePoints = points.filter((point): point is Landmark => Boolean(point));
  if (visiblePoints.length === 0) {
    return null;
  }

  return visiblePoints.reduce((best, point) => {
    const bestVisibility = best.visibility ?? 0;
    const pointVisibility = point.visibility ?? 0;
    return pointVisibility > bestVisibility ? point : best;
  });
}

function inferProfileSide(
  leftEye: Landmark | undefined,
  rightEye: Landmark | undefined,
  leftEar: Landmark | undefined,
  rightEar: Landmark | undefined
): 'left' | 'right' | 'unknown' {
  const leftScore = average([leftEye?.visibility, leftEar?.visibility]);
  const rightScore = average([rightEye?.visibility, rightEar?.visibility]);
  if (Math.abs(leftScore - rightScore) < 0.08) {
    return 'unknown';
  }
  return leftScore > rightScore ? 'left' : 'right';
}

function midpoint(a: Landmark, b: Landmark): Landmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
    visibility: average([a.visibility, b.visibility])
  };
}

function distance(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function confidenceFromLandmarks(landmarks: Landmark[]): number {
  const visible = landmarks
    .map((lm) => lm.visibility)
    .filter((visibility): visibility is number => typeof visibility === 'number');

  if (visible.length === 0) {
    return 0.5;
  }

  return clamp01(average(visible));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function average(values: Array<number | undefined>): number {
  const filtered = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function degrees(radians: number): number {
  return radians * (180 / Math.PI);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clamp0To100(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}
