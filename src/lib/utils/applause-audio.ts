import { mapMicError, type MicError } from './applause-meter';

export interface AudioFrameMetrics {
  timestampMs: number;
  rms: number;
  peak: number;
}

export interface ApplauseAudioCallbacks {
  onFrame: (frame: AudioFrameMetrics) => void;
  onInterrupted?: () => void;
  onError?: (error: MicError) => void;
}

export interface ApplauseAudioStartOptions {
  deviceId?: string;
}

export interface AudioRuntimeInfo {
  devices: MediaDeviceInfo[];
  activeDeviceId?: string;
  usingWorklet: boolean;
}

interface WorkletMessage {
  rms: number;
  peak: number;
  timestampMs: number;
}

const WORKLET_NAME = 'applause-level-processor';

const WORKLET_SOURCE = `
class ApplauseLevelProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || channel.length === 0) {
      return true;
    }

    let sumSq = 0;
    let peak = 0;
    for (let i = 0; i < channel.length; i += 1) {
      const sample = channel[i];
      const abs = Math.abs(sample);
      sumSq += sample * sample;
      if (abs > peak) peak = abs;
    }

    const rms = Math.sqrt(sumSq / channel.length);
    this.port.postMessage({
      rms,
      peak,
      timestampMs: currentTime * 1000
    });
    return true;
  }
}
registerProcessor('${WORKLET_NAME}', ApplauseLevelProcessor);
`;

export class ApplauseAudioRuntime {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sinkGain: GainNode | null = null;
  private callbacks: ApplauseAudioCallbacks | null = null;
  private usingWorklet = false;
  private disposed = false;
  private workletBlobUrl: string | null = null;

  async start(callbacks: ApplauseAudioCallbacks, options: ApplauseAudioStartOptions = {}): Promise<AudioRuntimeInfo> {
    this.callbacks = callbacks;

    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      throw new Error('Browser APIs not supported');
    }

    const stream = await this.requestStream(options.deviceId);
    this.stream = stream;

    const context = new AudioContext();
    this.context = context;

    this.source = context.createMediaStreamSource(stream);
    this.sinkGain = context.createGain();
    this.sinkGain.gain.value = 0;
    this.sinkGain.connect(context.destination);

    this.usingWorklet = await this.setupWorkletPipeline(context);
    if (!this.usingWorklet) {
      this.setupScriptProcessorPipeline(context);
    }

    for (const track of stream.getAudioTracks()) {
      track.addEventListener('ended', () => {
        this.callbacks?.onInterrupted?.();
      });
    }

    await this.refreshAndSyncDeviceSelection(options.deviceId);

    const devices = await this.listInputDevices();
    const activeTrack = stream.getAudioTracks()[0];
    return {
      devices,
      activeDeviceId: activeTrack?.getSettings().deviceId,
      usingWorklet: this.usingWorklet
    };
  }

  async stop(): Promise<void> {
    this.disconnectNodes();

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    this.callbacks = null;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    await this.stop();

    if (this.workletBlobUrl) {
      URL.revokeObjectURL(this.workletBlobUrl);
      this.workletBlobUrl = null;
    }
  }

  async listInputDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === 'audioinput');
  }

  private async requestStream(deviceId?: string): Promise<MediaStream> {
    const baseAudio: MediaTrackConstraints = {
      channelCount: { ideal: 1 },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    };

    const attempts: Array<MediaTrackConstraints | true> = deviceId
      ? [{ ...baseAudio, deviceId: { exact: deviceId } }, { ...baseAudio, deviceId: { ideal: deviceId } }, baseAudio]
      : [baseAudio, true];

    let lastError: unknown = null;
    for (const audio of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio, video: false });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('Unable to open microphone');
  }

  private async setupWorkletPipeline(context: AudioContext): Promise<boolean> {
    if (!context.audioWorklet || !this.source || !this.sinkGain) {
      return false;
    }

    try {
      this.workletBlobUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
      await context.audioWorklet.addModule(this.workletBlobUrl);

      const node = new AudioWorkletNode(context, WORKLET_NAME);
      node.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
        this.callbacks?.onFrame({
          timestampMs: event.data.timestampMs,
          rms: event.data.rms,
          peak: event.data.peak
        });
      };

      this.source.connect(node);
      node.connect(this.sinkGain);
      this.workletNode = node;
      return true;
    } catch {
      if (this.workletBlobUrl) {
        URL.revokeObjectURL(this.workletBlobUrl);
        this.workletBlobUrl = null;
      }
      return false;
    }
  }

  private setupScriptProcessorPipeline(context: AudioContext): void {
    if (!this.source || !this.sinkGain) return;

    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.2;

    const processor = context.createScriptProcessor(1024, 1, 1);
    const buffer = new Float32Array(analyser.fftSize);

    processor.onaudioprocess = () => {
      analyser.getFloatTimeDomainData(buffer);
      let sumSq = 0;
      let peak = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const sample = buffer[i];
        const abs = Math.abs(sample);
        sumSq += sample * sample;
        if (abs > peak) peak = abs;
      }

      const rms = Math.sqrt(sumSq / buffer.length);
      this.callbacks?.onFrame({
        timestampMs: performance.now(),
        rms,
        peak
      });
    };

    this.source.connect(analyser);
    analyser.connect(processor);
    processor.connect(this.sinkGain);

    this.analyser = analyser;
    this.scriptProcessor = processor;
  }

  private async refreshAndSyncDeviceSelection(requestedId?: string): Promise<void> {
    const devices = await this.listInputDevices();
    if (devices.length === 0) {
      this.callbacks?.onError?.('no-microphone');
      return;
    }

    if (!requestedId) return;
    const exists = devices.some((device) => device.deviceId === requestedId);
    if (!exists) {
      this.callbacks?.onError?.('stream-interrupted');
    }
  }

  private disconnectNodes(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode.port.onmessage = null;
      this.workletNode = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.sinkGain) {
      this.sinkGain.disconnect();
      this.sinkGain = null;
    }
  }
}

export function mapRuntimeStartError(error: unknown): MicError {
  return mapMicError(error);
}
