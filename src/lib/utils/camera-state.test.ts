import { describe, expect, it } from 'vitest';
import { mapCameraError, getStateMessage, canTransitionTo, ERROR_MESSAGES } from './camera-state';

describe('camera-state', () => {
  describe('mapCameraError', () => {
    it('maps NotAllowedError to permission-denied', () => {
      const err = new DOMException('Permission denied', 'NotAllowedError');
      expect(mapCameraError(err)).toBe('permission-denied');
    });

    it('maps NotFoundError to no-camera-available', () => {
      const err = new DOMException('Requested device not found', 'NotFoundError');
      expect(mapCameraError(err)).toBe('no-camera-available');
    });

    it('maps insecure context message', () => {
      const err = new Error('Secure context required');
      expect(mapCameraError(err)).toBe('insecure-context');
    });

    it('defaults to unknown for unrecognized errors', () => {
      const err = new Error('Some random error');
      expect(mapCameraError(err)).toBe('unknown');
    });
  });

  describe('getStateMessage', () => {
    it('returns message for camera-off state', () => {
      const msg = getStateMessage('camera-off');
      expect(msg).toContain('Start Camera');
    });

    it('returns message for requesting-permission state', () => {
      const msg = getStateMessage('requesting-permission');
      expect(msg).toContain('permission');
    });

    it('returns message for detecting-hand state', () => {
      const msg = getStateMessage('detecting-hand');
      expect(msg).toContain('Detecting');
    });

    it('returns message for no-hand-detected state', () => {
      const msg = getStateMessage('no-hand-detected');
      expect(msg).toContain('No hand');
    });

    it('returns error message for error state with error code', () => {
      const msg = getStateMessage('error', 'permission-denied');
      expect(msg).toBe(ERROR_MESSAGES['permission-denied']);
    });

    it('returns generic error message for error state without code', () => {
      const msg = getStateMessage('error');
      expect(msg).toBe(ERROR_MESSAGES.unknown);
    });
  });

  describe('canTransitionTo', () => {
    it('allows camera-off to requesting-permission', () => {
      expect(canTransitionTo('camera-off', 'requesting-permission')).toBe(true);
    });

    it('allows detecting-hand to no-hand-detected', () => {
      expect(canTransitionTo('detecting-hand', 'no-hand-detected')).toBe(true);
    });

    it('allows no-hand-detected back to detecting-hand', () => {
      expect(canTransitionTo('no-hand-detected', 'detecting-hand')).toBe(true);
    });

    it('disallows invalid transition', () => {
      expect(canTransitionTo('camera-off', 'detecting-hand')).toBe(false);
    });

    it('allows any state to error', () => {
      expect(canTransitionTo('camera-active', 'error')).toBe(true);
      expect(canTransitionTo('camera-off', 'error')).toBe(true);
    });

    it('allows error to camera-off only', () => {
      expect(canTransitionTo('error', 'camera-off')).toBe(true);
      expect(canTransitionTo('error', 'detecting-hand')).toBe(false);
    });
  });
});
