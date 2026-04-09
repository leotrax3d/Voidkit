import type { Landmark } from './finger-counting';

export interface DetectedPose {
  landmarks: Landmark[];
  score: number;
}

export interface PoseDetectorResult {
  poses: DetectedPose[];
}

export interface PoseDetectorOptions {
  maxPoses?: number;
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
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

type PoseLandmarkerLike = {
  detectForVideo(video: HTMLVideoElement, timestampMs: number): {
    landmarks?: Array<Array<{ x: number; y: number; z?: number; visibility?: number }>>;
    poseLandmarks?: Array<Array<{ x: number; y: number; z?: number; visibility?: number }>>;
  };
  setOptions(options: { numPoses?: number }): Promise<void>;
  close(): void;
};

export class MediaPipePoseDetector {
  private poseLandmarker: PoseLandmarkerLike | null = null;
  private loaded = false;

  async load(options: PoseDetectorOptions = {}): Promise<void> {
    if (this.loaded && this.poseLandmarker) {
      if (typeof options.maxPoses === 'number') {
        await this.poseLandmarker.setOptions({ numPoses: Math.max(1, Math.min(2, options.maxPoses)) });
      }
      return;
    }

    const vision = (await import('@mediapipe/tasks-vision')) as VisionModule;

    let detector: unknown = null;
    let lastError: unknown = null;

    for (const wasmBaseUrl of WASM_BASE_URLS) {
      try {
        const fileset = await vision.FilesetResolver.forVisionTasks(wasmBaseUrl);
        detector = await vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL
          },
          runningMode: 'VIDEO',
          numPoses: Math.max(1, Math.min(2, options.maxPoses ?? 1)),
          minPoseDetectionConfidence: options.minDetectionConfidence ?? 0.6,
          minPosePresenceConfidence: options.minTrackingConfidence ?? 0.5,
          minTrackingConfidence: options.minTrackingConfidence ?? 0.5
        });
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!detector) {
      throw (lastError ?? new Error('Unable to initialize MediaPipe PoseLandmarker'));
    }

    this.poseLandmarker = detector as unknown as PoseLandmarkerLike;
    this.loaded = true;
  }

  async setMaxPoses(maxPoses: number): Promise<void> {
    if (!this.poseLandmarker) return;
    await this.poseLandmarker.setOptions({ numPoses: Math.max(1, Math.min(2, maxPoses)) });
  }

  detect(video: HTMLVideoElement, timestampMs: number): PoseDetectorResult {
    if (!this.poseLandmarker) {
      return { poses: [] };
    }

    const result = this.poseLandmarker.detectForVideo(video, timestampMs);
    const rawPoses = result.landmarks ?? result.poseLandmarks ?? [];
    const poses: DetectedPose[] = rawPoses.map((landmarks) => ({
      landmarks: landmarks.map((point) => ({
        x: point.x,
        y: point.y,
        z: point.z,
        visibility: point.visibility
      })),
      score: averageVisibility(landmarks.map((point) => point.visibility))
    }));

    return { poses };
  }

  dispose(): void {
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }
    this.loaded = false;
  }
}

function averageVisibility(values: Array<number | undefined>): number {
  const filtered = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (filtered.length === 0) return 0.5;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}
