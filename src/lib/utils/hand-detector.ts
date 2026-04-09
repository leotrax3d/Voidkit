import type { Landmark } from './finger-counting';

export interface DetectorHand {
  landmarks: Landmark[];
  handedness?: 'Left' | 'Right';
  score: number;
}

export interface DetectorResult {
  hands: DetectorHand[];
}

export interface HandDetectorOptions {
  maxHands?: number;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

type VisionModule = typeof import('@mediapipe/tasks-vision');

const TASKS_VISION_VERSION = '0.10.34';
const WASM_BASE_URLS = [
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`,
  `https://unpkg.com/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`
];
const MODEL_ASSET_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

type HandLandmarkerLike = {
  detectForVideo(video: HTMLVideoElement, timestampMs: number): {
    landmarks?: Array<Array<{ x: number; y: number; z?: number; visibility?: number }>>;
    handedness?: Array<Array<{ categoryName: string; score: number }>>;
  };
  setOptions(options: { numHands?: number }): Promise<void>;
  close(): void;
};

export class MediaPipeHandDetector {
  private handLandmarker: HandLandmarkerLike | null = null;
  private loaded = false;

  async load(options: HandDetectorOptions = {}): Promise<void> {
    if (this.loaded && this.handLandmarker) {
      if (typeof options.maxHands === 'number') {
        await this.handLandmarker.setOptions({ numHands: Math.max(1, Math.min(2, options.maxHands)) });
      }
      return;
    }

    const vision = (await import('@mediapipe/tasks-vision')) as VisionModule;

    let detector: unknown = null;
    let lastError: unknown = null;

    for (const wasmBaseUrl of WASM_BASE_URLS) {
      try {
        const fileset = await vision.FilesetResolver.forVisionTasks(wasmBaseUrl);
        detector = await vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL
          },
          runningMode: 'VIDEO',
          numHands: Math.max(1, Math.min(2, options.maxHands ?? 1)),
          minHandDetectionConfidence: options.minDetectionConfidence ?? 0.6,
          minTrackingConfidence: options.minTrackingConfidence ?? 0.5
        });
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!detector) {
      throw (lastError ?? new Error('Unable to initialize MediaPipe HandLandmarker'));
    }

    this.handLandmarker = detector as unknown as HandLandmarkerLike;
    this.loaded = true;
  }

  async setMaxHands(maxHands: number): Promise<void> {
    if (!this.handLandmarker) return;
    await this.handLandmarker.setOptions({ numHands: Math.max(1, Math.min(2, maxHands)) });
  }

  detect(video: HTMLVideoElement, timestampMs: number): DetectorResult {
    if (!this.handLandmarker) {
      return { hands: [] };
    }

    const result = this.handLandmarker.detectForVideo(video, timestampMs);
    const hands: DetectorHand[] = [];
    const landmarks = result.landmarks ?? [];
    const handedness = result.handedness ?? [];

    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i] ?? [];
      const handed = handedness[i]?.[0];
      const rawCategory = handed?.categoryName;
      const mappedHandedness = rawCategory === 'Left' || rawCategory === 'Right' ? rawCategory : undefined;

      hands.push({
        landmarks: lm.map((point) => ({ x: point.x, y: point.y, z: point.z, visibility: point.visibility })),
        handedness: mappedHandedness,
        score: handed?.score ?? 0
      });
    }

    return { hands };
  }

  dispose(): void {
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
    this.loaded = false;
  }
}
