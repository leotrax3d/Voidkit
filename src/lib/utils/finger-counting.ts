/**
 * Pure finger counting heuristic from MediaPipe hand landmarks.
 * Works with normalized landmarks [0-1] in image space.
 * Returns count 0-5 based on tip-vs-joint height comparison.
 */

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface HandLandmarks {
  landmarks: Landmark[];
  handedness?: 'Left' | 'Right';
}

export interface FingerCountOptions {
  mirrored?: boolean;
}

export interface FingerCountResult {
  count: number;
  confidence: number; // 0-1 measure of detection certainty
  details: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
}

/**
 * MediaPipe hand landmark indices:
 * 0: wrist
 * 1-4: thumb (cmc, pip, dip, tip)
 * 5-8: index (mcp, pip, dip, tip)
 * 9-12: middle (mcp, pip, dip, tip)
 * 13-16: ring (mcp, pip, dip, tip)
 * 17-20: pinky (mcp, pip, dip, tip)
 */

const LANDMARK_GROUPS = {
  thumb: { mcp: 2, ip: 3, tip: 4 },
  index: { mcp: 5, pip: 6, tip: 8 },
  middle: { mcp: 9, pip: 10, tip: 12 },
  ring: { mcp: 13, pip: 14, tip: 16 },
  pinky: { mcp: 17, pip: 18, tip: 20 }
};

function normalizedHandedness(
  handedness: 'Left' | 'Right' | undefined,
  mirrored: boolean
): 'Left' | 'Right' {
  if (!handedness) return mirrored ? 'Left' : 'Right';
  if (!mirrored) return handedness;
  return handedness === 'Left' ? 'Right' : 'Left';
}

function isThumbRaised(
  landmarks: Landmark[],
  handedness: 'Left' | 'Right',
  mirrored: boolean
): boolean {
  const mcp = landmarks[LANDMARK_GROUPS.thumb.mcp];
  const ip = landmarks[LANDMARK_GROUPS.thumb.ip];
  const tip = landmarks[LANDMARK_GROUPS.thumb.tip];

  if (!mcp || !ip || !tip) return false;

  const adjusted = normalizedHandedness(handedness, mirrored);
  const horizontalGap = Math.abs(tip.x - ip.x);
  const verticalLift = mcp.y - tip.y;
  const expectedDirection = adjusted === 'Right' ? tip.x < ip.x : tip.x > ip.x;

  return expectedDirection && horizontalGap > 0.02 && verticalLift > -0.01;
}

/**
 * Check if non-thumb finger tip is above intermediate joints.
 */
function isNonThumbRaised(
  landmarks: Landmark[],
  mcpIdx: number,
  pipIdx: number,
  tipIdx: number,
  minLift: number = 0.025
): boolean {
  const mcp = landmarks[mcpIdx];
  const pip = landmarks[pipIdx];
  const tip = landmarks[tipIdx];

  if (!mcp || !pip || !tip) return false;

  const tipAbovePip = tip.y < pip.y - minLift;
  const pipAboveMcp = pip.y < mcp.y - 0.005;
  return tipAbovePip && pipAboveMcp;
}

/**
 * Count raised fingers from hand landmarks.
 * Robust heuristic with fallback handling.
 */
export function countRaisedFingers(
  hands: HandLandmarks | null | undefined,
  options: FingerCountOptions = {}
): FingerCountResult {
  if (!hands || !hands.landmarks || hands.landmarks.length < 21) {
    return {
      count: 0,
      confidence: 0,
      details: { thumb: false, index: false, middle: false, ring: false, pinky: false },
    };
  }

  const { landmarks } = hands;
  const handedness = hands.handedness || 'Right';
  const mirrored = options.mirrored ?? false;

  // Check each finger
  const details = {
    thumb: isThumbRaised(landmarks, handedness, mirrored),
    index: isNonThumbRaised(landmarks, LANDMARK_GROUPS.index.mcp, LANDMARK_GROUPS.index.pip, LANDMARK_GROUPS.index.tip),
    middle: isNonThumbRaised(landmarks, LANDMARK_GROUPS.middle.mcp, LANDMARK_GROUPS.middle.pip, LANDMARK_GROUPS.middle.tip),
    ring: isNonThumbRaised(landmarks, LANDMARK_GROUPS.ring.mcp, LANDMARK_GROUPS.ring.pip, LANDMARK_GROUPS.ring.tip),
    pinky: isNonThumbRaised(landmarks, LANDMARK_GROUPS.pinky.mcp, LANDMARK_GROUPS.pinky.pip, LANDMARK_GROUPS.pinky.tip),
  };

  const count = Object.values(details).filter(Boolean).length;

  // Confidence: higher if all landmarks have good visibility
  let visibilitySum = 0;
  let visibleCount = 0;
  for (const lm of landmarks) {
    if (lm.visibility !== undefined) {
      visibilitySum += lm.visibility;
      visibleCount++;
    }
  }
  const confidence = visibleCount > 0 ? visibilitySum / visibleCount : 0.5;

  return { count, confidence, details };
}

/**
 * Clamp count to 0-5 range.
 */
export function validateFingerCount(count: number): number {
  return Math.max(0, Math.min(5, Math.round(count)));
}
