import { describe, expect, it } from 'vitest';
import { countRaisedFingers, validateFingerCount, type HandLandmarks } from './finger-counting';

function buildNeutralLandmarks(): Array<{ x: number; y: number; visibility: number }> {
  return Array.from({ length: 21 }, () => ({
    x: 0.5,
    y: 0.6,
    visibility: 0.99
  }));
}

describe('finger-counting', () => {
  it('returns 0 count for null/undefined input', () => {
    expect(countRaisedFingers(null).count).toBe(0);
    expect(countRaisedFingers(undefined).count).toBe(0);
  });

  it('returns 0 count for insufficient landmarks', () => {
    const result = countRaisedFingers({ landmarks: Array(10).fill({ x: 0, y: 0 }) });
    expect(result.count).toBe(0);
  });

  it('counts raised fingers from synthetic landmarks', () => {
    const neutralLandmarks = buildNeutralLandmarks();

    const raisedLandmarks = [...neutralLandmarks];
    raisedLandmarks[2] = { ...raisedLandmarks[2], x: 0.48, y: 0.55, visibility: 0.99 };
    raisedLandmarks[3] = { ...raisedLandmarks[3], x: 0.46, y: 0.54, visibility: 0.99 };
    raisedLandmarks[4] = { ...raisedLandmarks[4], x: 0.42, y: 0.53, visibility: 0.99 };
    raisedLandmarks[5] = { ...raisedLandmarks[5], y: 0.58, visibility: 0.99 };
    raisedLandmarks[6] = { ...raisedLandmarks[6], y: 0.5, visibility: 0.99 };
    raisedLandmarks[8] = { ...raisedLandmarks[8], y: 0.38, visibility: 0.99 };
    raisedLandmarks[9] = { ...raisedLandmarks[9], y: 0.58, visibility: 0.99 };
    raisedLandmarks[10] = { ...raisedLandmarks[10], y: 0.5, visibility: 0.99 };
    raisedLandmarks[12] = { ...raisedLandmarks[12], y: 0.36, visibility: 0.99 };
    raisedLandmarks[13] = { ...raisedLandmarks[13], y: 0.58, visibility: 0.99 };
    raisedLandmarks[14] = { ...raisedLandmarks[14], y: 0.5, visibility: 0.99 };
    raisedLandmarks[16] = { ...raisedLandmarks[16], y: 0.38, visibility: 0.99 };
    raisedLandmarks[17] = { ...raisedLandmarks[17], y: 0.58, visibility: 0.99 };
    raisedLandmarks[18] = { ...raisedLandmarks[18], y: 0.5, visibility: 0.99 };
    raisedLandmarks[20] = { ...raisedLandmarks[20], y: 0.4, visibility: 0.99 };

    const hand: HandLandmarks = { landmarks: raisedLandmarks, handedness: 'Right' };
    const result = countRaisedFingers(hand);

    expect(result.count).toBe(5);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('counts only index and middle fingers raised', () => {
    const landmarks = buildNeutralLandmarks();

    landmarks[5] = { ...landmarks[5], y: 0.58, visibility: 0.99 };
    landmarks[6] = { ...landmarks[6], y: 0.5, visibility: 0.99 };
    landmarks[8] = { ...landmarks[8], y: 0.38, visibility: 0.99 };
    landmarks[9] = { ...landmarks[9], y: 0.58, visibility: 0.99 };
    landmarks[10] = { ...landmarks[10], y: 0.5, visibility: 0.99 };
    landmarks[12] = { ...landmarks[12], y: 0.36, visibility: 0.99 };

    const hand: HandLandmarks = { landmarks };
    const result = countRaisedFingers(hand);

    expect(result.details.index).toBe(true);
    expect(result.details.middle).toBe(true);
    expect(result.details.thumb).toBe(false);
    expect(result.details.ring).toBe(false);
    expect(result.details.pinky).toBe(false);
  });

  it('detects low visibility and reduces confidence', () => {
    const landmarks = Array(21)
      .fill(null)
      .map((_, i) => ({ x: 0.5, y: 0.5, visibility: 0.3 }));

    const hand: HandLandmarks = { landmarks };
    const result = countRaisedFingers(hand);

    expect(result.confidence).toBeLessThan(0.5);
  });

  it('handles mirrored thumb logic by inverting handedness interpretation', () => {
    const landmarks = buildNeutralLandmarks();
    landmarks[2] = { ...landmarks[2], x: 0.52, y: 0.55, visibility: 0.99 };
    landmarks[3] = { ...landmarks[3], x: 0.54, y: 0.54, visibility: 0.99 };
    landmarks[4] = { ...landmarks[4], x: 0.58, y: 0.53, visibility: 0.99 };

    const hand: HandLandmarks = { landmarks, handedness: 'Right' };
    const nonMirrored = countRaisedFingers(hand, { mirrored: false });
    const mirrored = countRaisedFingers(hand, { mirrored: true });

    expect(nonMirrored.details.thumb).toBe(false);
    expect(mirrored.details.thumb).toBe(true);
  });

  it('validates finger count stays in 0-5 range', () => {
    expect(validateFingerCount(-5)).toBe(0);
    expect(validateFingerCount(0)).toBe(0);
    expect(validateFingerCount(2.7)).toBe(3);
    expect(validateFingerCount(5)).toBe(5);
    expect(validateFingerCount(10)).toBe(5);
  });
});
