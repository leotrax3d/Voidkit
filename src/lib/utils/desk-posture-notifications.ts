import { browser } from '$app/environment';
import type { DeskPostureState } from './desk-posture';

export interface DeskPostureNotificationPayload {
  score: number;
  postureState: DeskPostureState;
  streakSeconds: number;
}

export function canUseDeskPostureNotifications(): boolean {
  return browser && typeof Notification !== 'undefined';
}

export async function requestDeskPostureNotificationPermission(): Promise<NotificationPermission> {
  if (!canUseDeskPostureNotifications()) {
    return 'denied';
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

export function buildDeskPostureNotificationText(payload: DeskPostureNotificationPayload): { title: string; body: string } {
  const title = 'Desk Posture Coach';
  const body =
    payload.postureState === 'poor'
      ? `Please sit up straight. Score ${payload.score}/100 after ${payload.streakSeconds}s.`
      : `Take a quick posture reset. Score ${payload.score}/100.`;

  return { title, body };
}

export function showDeskPostureNotification(payload: DeskPostureNotificationPayload): boolean {
  if (!canUseDeskPostureNotifications() || Notification.permission !== 'granted') {
    return false;
  }

  const { title, body } = buildDeskPostureNotificationText(payload);
  new Notification(title, {
    body,
    silent: true,
    tag: 'desk-posture-coach'
  });
  return true;
}
