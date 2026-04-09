import { describe, expect, it } from 'vitest';
import {
  DeskPostureEngine,
  buildDeskPostureBaseline,
  canTransitionDeskPosturePhase,
  getDeskPosturePhaseLabel,
  getDeskPostureSetupMessage,
  mapDeskPostureError,
  measureDeskPosture,
  type DeskPostureFrame,
  type DeskPostureMetrics
} from './desk-posture';
import {
  buildDeskPostureDualCalibrationModel,
  createDeskPostureCalibrationWizardState,
  scoreDeskPostureWithDualCalibration,
  transitionDeskPostureCalibrationWizard,
  validateDeskPostureCalibrationSamples,
} from './desk-posture-calibration';
import type { Landmark } from './finger-counting';

function createSideProfilePose(overrides: Partial<Record<number, Partial<Landmark>>> = {}): Landmark[] {
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 }));

  const defaults: Record<number, Landmark> = {
    0: { x: 0.66, y: 0.24, z: -0.04, visibility: 0.98 },
    1: { x: 0.63, y: 0.22, z: -0.03, visibility: 0.98 },
    2: { x: 0.67, y: 0.22, z: -0.03, visibility: 0.72 },
    3: { x: 0.70, y: 0.23, z: -0.02, visibility: 0.97 },
    4: { x: 0.74, y: 0.23, z: -0.02, visibility: 0.70 },
    11: { x: 0.53, y: 0.40, z: 0.02, visibility: 0.96 },
    12: { x: 0.56, y: 0.41, z: 0.03, visibility: 0.88 },
    23: { x: 0.54, y: 0.72, z: 0.04, visibility: 0.95 },
    24: { x: 0.57, y: 0.73, z: 0.05, visibility: 0.9 }
  };

  for (const [index, landmark] of Object.entries(defaults)) {
    const idx = Number(index);
    landmarks[idx] = { ...landmarks[idx], ...landmark };
  }

  for (const [index, patch] of Object.entries(overrides)) {
    const idx = Number(index);
    landmarks[idx] = { ...landmarks[idx], ...patch };
  }

  return landmarks;
}

function createSlouchedPose(overrides: Partial<Record<number, Partial<Landmark>>> = {}): Landmark[] {
  return createSideProfilePose({
    0: { x: 0.9, y: 0.27, z: -0.01, visibility: 0.98 },
    1: { x: 0.86, y: 0.24, z: -0.01, visibility: 0.95 },
    2: { x: 0.91, y: 0.24, z: -0.01, visibility: 0.72 },
    3: { x: 0.93, y: 0.25, z: 0, visibility: 0.94 },
    4: { x: 0.96, y: 0.25, z: 0, visibility: 0.68 },
    11: { x: 0.46, y: 0.44, z: 0.02, visibility: 0.95 },
    12: { x: 0.68, y: 0.47, z: 0.03, visibility: 0.87 },
    23: { x: 0.44, y: 0.77, z: 0.05, visibility: 0.94 },
    24: { x: 0.7, y: 0.81, z: 0.08, visibility: 0.89 },
    ...overrides
  });
}

function makeFrame(timestampMs: number, pose: Landmark[]): DeskPostureFrame {
  return { timestampMs, landmarks: pose };
}

function buildSamples(
  poseFactory: () => Landmark[]
): Array<DeskPostureMetrics & { timestampMs: number }> {
  return [0, 60, 120, 180, 240].map((timestampMs) => ({
    ...measureDeskPosture(poseFactory())!,
    timestampMs
  }));
}

describe('desk-posture', () => {
  it('measures posture metrics from side-profile landmarks', () => {
    const metrics = measureDeskPosture(createSideProfilePose());
    expect(metrics).not.toBeNull();
    expect(metrics?.confidence).toBeGreaterThan(0.75);
    expect(metrics?.profileQuality).toBeGreaterThan(0.6);
    expect(metrics?.profileSide).toBe('left');
  });

  it('validates and builds a neutral calibration baseline', () => {
    const samples = buildSamples(() => createSideProfilePose());
    const validation = validateDeskPostureCalibrationSamples(samples, 'neutral');
    const baseline = buildDeskPostureBaseline(samples);

    expect(validation.valid).toBe(true);
    expect(validation.issue).toBeNull();
    expect(validation.summary.sampleCount).toBe(5);
    expect(validation.summary.noise).toBeLessThan(0.14);
    expect(baseline).not.toBeNull();
    expect(baseline?.sampleCount).toBe(5);
    expect(baseline?.confidence).toBeGreaterThan(0.8);
  });

  it('validates and scores a distinct slouched calibration', () => {
    const neutralSamples = buildSamples(() => createSideProfilePose());
    const slouchedSamples = buildSamples(() => createSlouchedPose());
    const neutralBaseline = buildDeskPostureBaseline(neutralSamples);
    const slouchedBaseline = buildDeskPostureBaseline(slouchedSamples);

    expect(neutralBaseline).not.toBeNull();
    expect(slouchedBaseline).not.toBeNull();

    const validation = validateDeskPostureCalibrationSamples(slouchedSamples, 'slouched', neutralBaseline);
    const model = buildDeskPostureDualCalibrationModel(neutralBaseline!, slouchedBaseline!, 0);
    const uprightScore = scoreDeskPostureWithDualCalibration(measureDeskPosture(createSideProfilePose())!, model, 'balanced');
    const slouchedScore = scoreDeskPostureWithDualCalibration(measureDeskPosture(createSlouchedPose())!, model, 'balanced');
    const midPose = createSideProfilePose({
      0: { x: 0.71, y: 0.24, z: -0.03 },
      3: { x: 0.75, y: 0.23, z: -0.02 },
      11: { x: 0.53, y: 0.41, z: 0.02 },
      23: { x: 0.54, y: 0.73, z: 0.05 }
    });
    const midpointScore = scoreDeskPostureWithDualCalibration(measureDeskPosture(midPose)!, model, 'balanced');

    expect(validation.valid).toBe(false);
    expect(['too-similar', 'bad-posture-not-distinct']).toContain(validation.issue);
    expect(uprightScore.score).toBeGreaterThan(slouchedScore.score);
    expect(uprightScore.score).toBeGreaterThan(80);
    expect(slouchedScore.score).toBeLessThan(30);
    expect(midpointScore.score).toBeGreaterThan(20);
    expect(midpointScore.score).toBeLessThan(80);
  });

  it('rejects weak calibration samples and supports wizard retry and restart transitions', () => {
    const neutralSamples = buildSamples(() => createSideProfilePose());
    const neutralBaseline = buildDeskPostureBaseline(neutralSamples)!;

    const tooSimilar = buildSamples(() =>
      createSideProfilePose({
        0: { x: 0.67, y: 0.235 },
        3: { x: 0.71, y: 0.23 },
        11: { x: 0.54, y: 0.40 },
        23: { x: 0.55, y: 0.72 }
      })
    );
    const noisy = [0, 60, 120, 180, 240].map((timestampMs, index) => ({
      ...measureDeskPosture(index % 2 === 0 ? createSideProfilePose() : createSlouchedPose())!,
      timestampMs
    }));

    const tooSimilarValidation = validateDeskPostureCalibrationSamples(tooSimilar, 'slouched', neutralBaseline);
    const noisyValidation = validateDeskPostureCalibrationSamples(noisy, 'neutral');

    let wizard = createDeskPostureCalibrationWizardState();
    wizard = transitionDeskPostureCalibrationWizard(wizard, 'next');
    expect(wizard.step).toBe('neutral');
    wizard = transitionDeskPostureCalibrationWizard(wizard, 'retry');
    expect(wizard.step).toBe('neutral');
    expect(wizard.complete).toBe(false);
    wizard = transitionDeskPostureCalibrationWizard(wizard, 'next');
    expect(wizard.step).toBe('slouched');
    wizard = transitionDeskPostureCalibrationWizard(wizard, 'back');
    expect(wizard.step).toBe('neutral');
    wizard = transitionDeskPostureCalibrationWizard(wizard, 'restart');
    expect(wizard.step).toBe('setup');
    wizard = transitionDeskPostureCalibrationWizard({ step: 'review', complete: false }, 'finish');
    expect(wizard.step).toBe('review');
    expect(wizard.complete).toBe(true);

    expect(tooSimilarValidation.valid).toBe(false);
    expect(['too-similar', 'bad-posture-not-distinct']).toContain(tooSimilarValidation.issue);
    expect(noisyValidation.valid).toBe(false);
    expect(noisyValidation.issue).toBe('noisy-sample');
  });

  it('supports state transitions and error mapping', () => {
    expect(canTransitionDeskPosturePhase('idle', 'calibrating')).toBe(true);
    expect(canTransitionDeskPosturePhase('calibrating', 'monitoring')).toBe(true);
    expect(canTransitionDeskPosturePhase('monitoring', 'idle')).toBe(true);
    expect(canTransitionDeskPosturePhase('monitoring', 'monitoring')).toBe(false);

    expect(getDeskPosturePhaseLabel('idle')).toBe('Idle');
    expect(mapDeskPostureError({ name: 'NotAllowedError', message: 'Permission denied' })).toBe('permission-denied');
    expect(getDeskPostureSetupMessage('frontal-angle')).toContain('side of your body');
  });

  it('treats confidence dropouts as no person without immediate punishment', () => {
    const neutralBaseline = buildDeskPostureBaseline(buildSamples(() => createSideProfilePose()));
    const slouchedBaseline = buildDeskPostureBaseline(buildSamples(() => createSlouchedPose()));
    const model = buildDeskPostureDualCalibrationModel(neutralBaseline!, slouchedBaseline!, 0);
    const engine = new DeskPostureEngine({ occlusionGraceMs: 1000, minReliableConfidence: 0.45 });
    engine.setCalibrationModel(model);
    engine.setBaseline(neutralBaseline);

    const visible = engine.update(makeFrame(0, createSideProfilePose()));
    expect(visible.postureState).toBe('good');

    const lowConfidencePose = createSideProfilePose({
      0: { visibility: 0.1 },
      1: { visibility: 0.08 },
      2: { visibility: 0.08 },
      3: { visibility: 0.08 },
      4: { visibility: 0.08 },
      11: { visibility: 0.1 },
      12: { visibility: 0.1 },
      23: { visibility: 0.1 },
      24: { visibility: 0.1 }
    });

    const grace = engine.update(makeFrame(300, lowConfidencePose));
    expect(grace.personVisible).toBe(false);
    expect(grace.postureState).toBe('good');

    const lost = engine.update(makeFrame(1600, lowConfidencePose));
    expect(lost.personVisible).toBe(false);
    expect(lost.postureState).toBe('no-person');
  });

  it('respects sensitivity presets on the dual model', () => {
    const neutralBaseline = buildDeskPostureBaseline(buildSamples(() => createSideProfilePose()));
    const slouchedBaseline = buildDeskPostureBaseline(buildSamples(() => createSlouchedPose()));
    const model = buildDeskPostureDualCalibrationModel(neutralBaseline!, slouchedBaseline!, 0);
    const shifted = measureDeskPosture(
      createSideProfilePose({
        0: { x: 0.73, y: 0.25, z: -0.02 },
        1: { x: 0.70, y: 0.23 },
        3: { x: 0.76, y: 0.24 },
        11: { x: 0.52, y: 0.41 },
        12: { x: 0.55, y: 0.42 }
      })
    )!;

    const gentle = scoreDeskPostureWithDualCalibration(shifted, model, 'gentle').score;
    const strict = scoreDeskPostureWithDualCalibration(shifted, model, 'strict').score;
    expect(strict).toBeLessThanOrEqual(gentle);
  });
});
