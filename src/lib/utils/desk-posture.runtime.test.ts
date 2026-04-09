import { describe, expect, it } from 'vitest';
import { requestDeskPostureNotificationPermission, buildDeskPostureNotificationText } from './desk-posture-notifications';

describe('desk-posture notifications', () => {
  it('formats supportive notification copy', () => {
    const message = buildDeskPostureNotificationText({ score: 41, postureState: 'poor', streakSeconds: 75 });
    expect(message.title).toBe('Desk Posture Coach');
    expect(message.body).toContain('Please sit up straight');
    expect(message.body).toContain('41/100');
  });

  it('does not request permission in non-browser test environment', async () => {
    await expect(requestDeskPostureNotificationPermission()).resolves.toBe('denied');
  });
});
