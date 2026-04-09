import { describe, expect, it } from 'vitest';
import {
  ClapDetector,
  calculateScore,
  canTransitionMeterState,
  getMeterStateLabel,
  mapMicError,
  type ClapFrame
} from './applause-meter';

describe('applause-meter', () => {
  describe('clap peak detection', () => {
    it('detects clap-like transients and rejects flat noise', () => {
      const detector = new ClapDetector({ preset: 'medium' });
      const base = 1000;

      const noiseFrames: ClapFrame[] = [
        { timestampMs: base, rms: 0.015, peak: 0.03 },
        { timestampMs: base + 20, rms: 0.02, peak: 0.035 },
        { timestampMs: base + 40, rms: 0.018, peak: 0.032 }
      ];

      for (const frame of noiseFrames) {
        const result = detector.update(frame);
        expect(result.clapDetected).toBe(false);
      }

      const clap = detector.update({ timestampMs: base + 200, rms: 0.14, peak: 0.48 });
      expect(clap.clapDetected).toBe(true);
      expect(clap.clapCount).toBe(1);
      expect(clap.liveLevel).toBeGreaterThan(0.05);
    });
  });

  describe('cooldown behavior', () => {
    it('avoids double count in cooldown window', () => {
      const detector = new ClapDetector({ preset: 'high' });
      const t0 = 10_000;

      const first = detector.update({ timestampMs: t0, rms: 0.11, peak: 0.42 });
      const second = detector.update({ timestampMs: t0 + 40, rms: 0.12, peak: 0.45 });
      detector.update({ timestampMs: t0 + 260, rms: 0.15, peak: 0.49 });

      expect(first.clapCount).toBe(1);
      expect(second.clapCount).toBe(1);
      expect(second.clapDetected).toBe(false);
    });
  });

  describe('score calculation', () => {
    it('returns bounded score within 0..100', () => {
      expect(calculateScore({ liveLevel: 0, clapsPerMinute: 0, sessionMaxPeak: 0 })).toBe(0);
      expect(calculateScore({ liveLevel: 1, clapsPerMinute: 2000, sessionMaxPeak: 1 })).toBe(100);
    });

    it('increases score for stronger applause', () => {
      const low = calculateScore({ liveLevel: 0.2, clapsPerMinute: 20, sessionMaxPeak: 0.25 });
      const high = calculateScore({ liveLevel: 0.8, clapsPerMinute: 160, sessionMaxPeak: 0.85 });
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('smoothing and threshold adaptation', () => {
    it('adapts threshold from persistent low-level noise', () => {
      const detector = new ClapDetector({ preset: 'medium' });
      let threshold = 0;
      let noiseFloor = 0;

      for (let i = 0; i < 80; i += 1) {
        const result = detector.update({
          timestampMs: i * 20,
          rms: 0.02 + (i % 3) * 0.002,
          peak: 0.04 + (i % 2) * 0.004
        });
        threshold = result.threshold;
        noiseFloor = result.noiseFloor;
      }

      expect(noiseFloor).toBeGreaterThan(0.01);
      expect(threshold).toBeGreaterThan(noiseFloor);
      expect(threshold).toBeLessThanOrEqual(0.2);
    });
  });

  describe('state transitions and error mapping', () => {
    it('allows valid transitions and blocks invalid ones', () => {
      expect(canTransitionMeterState('idle', 'requesting-permission')).toBe(true);
      expect(canTransitionMeterState('requesting-permission', 'listening')).toBe(true);
      expect(canTransitionMeterState('listening', 'requesting-permission')).toBe(false);
    });

    it('maps microphone errors to known categories', () => {
      expect(mapMicError({ name: 'NotAllowedError', message: 'Permission denied' })).toBe('permission-denied');
      expect(mapMicError({ name: 'NotFoundError', message: 'No input device' })).toBe('no-microphone');
      expect(mapMicError({ message: 'AudioContext failed to construct' })).toBe('audio-context-failed');
      expect(mapMicError({ message: 'stream ended' })).toBe('stream-interrupted');
      expect(mapMicError({})).toBe('unknown');
    });

    it('exposes english status labels', () => {
      expect(getMeterStateLabel('idle')).toBe('Idle');
      expect(getMeterStateLabel('requesting-permission')).toBe('Requesting permission');
      expect(getMeterStateLabel('listening')).toBe('Listening');
      expect(getMeterStateLabel('mic-error')).toBe('Mic error');
      expect(getMeterStateLabel('permission-denied')).toBe('Permission denied');
    });
  });
});
