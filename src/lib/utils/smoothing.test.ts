import { describe, expect, it } from 'vitest';
import {
  MovingAverageSmoother,
  MajorityVoteStabilizer,
  ExponentialSmoother,
  HysteresisStabilizer,
} from './smoothing';

describe('smoothing utilities', () => {
  describe('MovingAverageSmoother', () => {
    it('initializes with default window size', () => {
      const smoother = new MovingAverageSmoother();
      expect(smoother.update(1)).toBe(1);
    });

    it('smooths a jittery sequence', () => {
      const smoother = new MovingAverageSmoother(5);
      const sequence = [2, 2, 3, 2, 4, 3, 2, 3, 2, 3];
      const smoothed = sequence.map((v) => smoother.update(v));

      // Early values should be exact, later ones should be closer to average
      expect(smoothed[0]).toBe(2);
      // After window fills, variance reduces
      expect(smoothed[smoothed.length - 1]).toBeCloseTo(2.6, 1);
    });

    it('resets state', () => {
      const smoother = new MovingAverageSmoother();
      smoother.update(5);
      smoother.reset();
      expect(smoother.update(1)).toBe(1);
    });
  });

  describe('MajorityVoteStabilizer', () => {
    it('returns the most common value', () => {
      const stab = new MajorityVoteStabilizer(5);
      // Feed: 2, 2, 3, 2, 4 => 2 appears 3 times
      stab.update(2);
      stab.update(2);
      stab.update(3);
      const result = stab.update(2);

      expect(result).toBe(2);
    });

    it('handles transition when new value becomes majority', () => {
      const stab = new MajorityVoteStabilizer(5);
      // Initially: 3, 3, 3, 2, 2
      stab.update(3);
      stab.update(3);
      stab.update(3);
      stab.update(2);
      expect(stab.update(2)).toBe(3); // 3 still majority

      // Next: 2, 2, 2, 2, 2
      stab.update(2);
      expect(stab.update(2)).toBe(2); // 2 becomes majority
    });
  });

  describe('ExponentialSmoother', () => {
    it('smooths with alpha=0.5', () => {
      const smoother = new ExponentialSmoother(0.5);
      let result = smoother.update(10);
      expect(result).toBe(10);

      result = smoother.update(20);
      expect(result).toBe(15); // 0.5 * 20 + 0.5 * 10

      result = smoother.update(0);
      expect(result).toBeCloseTo(7.5, 5); // 0.5 * 0 + 0.5 * 15
    });

    it('is responsive with high alpha', () => {
      const smoother = new ExponentialSmoother(0.9);
      smoother.update(0);
      const result = smoother.update(10);
      expect(result).toBe(9); // 0.9 * 10 + 0.1 * 0 = 9
    });

    it('is inert with low alpha', () => {
      const smoother = new ExponentialSmoother(0.1);
      smoother.update(0);
      const result = smoother.update(10);
      expect(result).toBe(1); // 0.1 * 10 + 0.9 * 0 = 1
    });
  });

  describe('HysteresisStabilizer', () => {
    it('suppresses changes below threshold', () => {
      const stab = new HysteresisStabilizer(0.5);
      expect(stab.update(2)).toBe(2);
      expect(stab.update(2.3)).toBe(2); // delta 0.3 < 0.5
      expect(stab.update(2.1)).toBe(2); // delta 0.2 < 0.5
    });

    it('accepts changes above threshold', () => {
      const stab = new HysteresisStabilizer(0.5);
      expect(stab.update(2)).toBe(2);
      expect(stab.update(3)).toBe(3); // delta 1 > 0.5
      expect(stab.update(3.3)).toBe(3); // delta 0.3 < 0.5, stay at 3
    });

    it('resets state', () => {
      const stab = new HysteresisStabilizer(0.5);
      stab.update(5);
      stab.reset();
      expect(stab.update(1)).toBe(1);
    });
  });
});
