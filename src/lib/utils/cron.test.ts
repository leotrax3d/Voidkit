import { describe, expect, it } from 'vitest';
import {
  buildCronExpression,
  canonicalizeCronExpression,
  describeCronExpression,
  getNextCronExecutions,
  parseCronExpression,
  parseCronField,
  validateCronExpression
} from './cron';

describe('cron utils', () => {
  it('parses and builds cron expressions', () => {
    const fields = parseCronExpression('*/5 * * * *');
    expect(buildCronExpression(fields)).toBe('*/5 * * * *');
    expect(validateCronExpression('*/5 * * * *')).toEqual(fields);
  });

  it('canonicalizes day of week seven to zero', () => {
    const canonical = canonicalizeCronExpression('0 0 * * 7');
    expect(canonical.dayOfWeek).toBe('0');
  });

  it('validates field ranges', () => {
    expect(() => parseCronField('minute', '61')).toThrow('Value out of range');
    expect(() => parseCronField('month', '0')).toThrow('Value out of range');
  });

  it('describes common presets', () => {
    expect(describeCronExpression('* * * * *')).toBe('Every minute');
    expect(describeCronExpression('*/5 * * * *')).toBe('Every 5 minutes');
    expect(describeCronExpression('0 * * * *')).toBe('Hourly');
  });

  it('calculates the next executions in local time', () => {
    const nextRuns = getNextCronExecutions('*/5 * * * *', new Date(2026, 0, 1, 12, 0, 0), 3);

    expect(nextRuns).toHaveLength(3);
    expect(nextRuns[0].getMinutes()).toBe(5);
    expect(nextRuns[1].getMinutes()).toBe(10);
    expect(nextRuns[2].getMinutes()).toBe(15);
  });

  it('rejects invalid cron width', () => {
    expect(() => parseCronExpression('0 0 * *')).toThrow('Cron expressions must contain exactly 5 fields');
  });
});
