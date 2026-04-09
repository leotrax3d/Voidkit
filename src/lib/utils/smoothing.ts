/**
 * Smoothing and stabilization utilities for temporally noisy finger counts.
 */

export interface SmoothedCount {
  raw: number;
  smoothed: number;
  stabilized: number;
}

/**
 * Moving average smoothing over a window of recent values.
 */
export class MovingAverageSmoother {
  private window: number[] = [];
  private capacity: number;

  constructor(windowSize: number = 5) {
    this.capacity = Math.max(1, windowSize);
  }

  update(value: number): number {
    this.window.push(value);
    if (this.window.length > this.capacity) {
      this.window.shift();
    }
    return this.window.reduce((a, b) => a + b, 0) / this.window.length;
  }

  reset(): void {
    this.window = [];
  }
}

/**
 * Majority-vote stabilizer: returns the most common value in a window.
 * Useful for reducing flicker when discrete counts are primary concern.
 */
export class MajorityVoteStabilizer {
  private window: number[] = [];
  private capacity: number;

  constructor(windowSize: number = 7) {
    this.capacity = Math.max(1, windowSize);
  }

  update(value: number): number {
    this.window.push(value);
    if (this.window.length > this.capacity) {
      this.window.shift();
    }

    const counts = new Map<number, number>();
    for (const v of this.window) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }

    let maxCount = 0;
    let mostCommon = value;
    for (const [v, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = v;
      }
    }

    return mostCommon;
  }

  reset(): void {
    this.window = [];
  }
}

/**
 * Exponential moving average: smooth while responsive to recent changes.
 * alpha in (0, 1]; higher alpha = more responsive to new values.
 */
export class ExponentialSmoother {
  private current: number | null = null;
  private alpha: number;

  constructor(alpha: number = 0.3) {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  update(value: number): number {
    if (this.current === null) {
      this.current = value;
    } else {
      this.current = this.alpha * value + (1 - this.alpha) * this.current;
    }
    return this.current;
  }

  reset(): void {
    this.current = null;
  }
}

/**
 * Hysteresis-based count stabilizer: suppresses small changes below threshold.
 * Useful for preventing single-frame flicker while still tracking real transitions.
 */
export class HysteresisStabilizer {
  private last: number | null = null;
  private threshold: number;

  constructor(threshold: number = 0.5) {
    this.threshold = Math.max(0, threshold);
  }

  update(value: number): number {
    if (this.last === null) {
      this.last = value;
      return value;
    }

    const diff = Math.abs(value - this.last);
    if (diff > this.threshold) {
      this.last = value;
    }

    return this.last;
  }

  reset(): void {
    this.last = null;
  }
}
