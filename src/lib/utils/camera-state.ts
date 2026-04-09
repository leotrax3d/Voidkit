/**
 * Camera and detection state machine.
 */

export type CameraState =
  | 'camera-off'
  | 'requesting-permission'
  | 'requesting-camera'
  | 'camera-active'
  | 'detecting-hand'
  | 'no-hand-detected'
  | 'error';

export type CameraError =
  | 'permission-denied'
  | 'no-camera-available'
  | 'insecure-context'
  | 'not-supported'
  | 'model-load-failed'
  | 'unknown';

export interface CameraStateContext {
  state: CameraState;
  error?: CameraError;
  errorMessage?: string;
}

/**
 * User-friendly error messages.
 */
export const ERROR_MESSAGES: Record<CameraError, string> = {
  'permission-denied': 'Camera access was denied. Please allow camera access in your browser settings.',
  'no-camera-available': 'No camera found on your device. Check if camera is connected and not in use.',
  'insecure-context':
    'Camera access requires HTTPS or localhost. Please use a secure connection.',
  'not-supported':
    'Your browser does not support camera access. Try Chrome, Edge, or Safari on iOS 14.7+.',
  'model-load-failed':
    'Failed to load hand detection model. Check your connection and try again.',
  unknown: 'An unexpected error occurred. Please refresh and try again.',
};

/**
 * Map browser error to user-friendly category.
 */
export function mapCameraError(error: Error | DOMException): CameraError {
  const message = error?.message?.toLowerCase() ?? '';
  const name = error?.name?.toLowerCase() ?? '';

  if (name === 'notallowederror' || message.includes('permission')) {
    return 'permission-denied';
  }
  if (name === 'notfounderror' || message.includes('camera') || message.includes('device')) {
    return 'no-camera-available';
  }
  if (message.includes('secure') || message.includes('http')) {
    return 'insecure-context';
  }
  if (message.includes('not supported') || message.includes('not available')) {
    return 'not-supported';
  }

  return 'unknown';
}

/**
 * Get user-facing message for a state + optional error.
 */
export function getStateMessage(state: CameraState, error?: CameraError): string {
  switch (state) {
    case 'camera-off':
      return 'Click "Start Camera" to begin.';
    case 'requesting-permission':
      return 'Requesting camera permission…';
    case 'requesting-camera':
      return 'Initializing camera…';
    case 'camera-active':
      return 'Camera ready. Loading detection model…';
    case 'detecting-hand':
      return 'Detecting hand…';
    case 'no-hand-detected':
      return 'No hand detected. Ensure one hand is fully visible.';
    case 'error':
      return error ? ERROR_MESSAGES[error] : ERROR_MESSAGES.unknown;
    default:
      return 'Unknown state.';
  }
}

/**
 * State transitions.
 */
export function canTransitionTo(from: CameraState, to: CameraState): boolean {
  const validTransitions: Record<CameraState, CameraState[]> = {
    'camera-off': ['requesting-permission', 'error'],
    'requesting-permission': ['requesting-camera', 'error'],
    'requesting-camera': ['camera-active', 'error'],
    'camera-active': ['detecting-hand', 'camera-off', 'error'],
    'detecting-hand': ['no-hand-detected', 'detecting-hand', 'camera-off', 'error'],
    'no-hand-detected': ['detecting-hand', 'camera-off', 'error'],
    error: ['camera-off'],
  };

  return (validTransitions[from] ?? []).includes(to);
}
