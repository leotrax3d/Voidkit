<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy } from 'svelte';
  import type { Tool } from '$lib/types';
  import {
    ERROR_MESSAGES,
    getStateMessage,
    mapCameraError,
    type CameraError,
    type CameraState
  } from '$lib/utils/camera-state';
  import { countRaisedFingers, validateFingerCount, type FingerCountResult } from '$lib/utils/finger-counting';
  import { MajorityVoteStabilizer, MovingAverageSmoother } from '$lib/utils/smoothing';
  import { MediaPipeHandDetector, type DetectorHand } from '$lib/utils/hand-detector';

  export let tool: Tool;

  const HAND_CONNECTIONS: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17]
  ];

  let videoEl: HTMLVideoElement | null = null;
  let overlayEl: HTMLCanvasElement | null = null;
  let stream: MediaStream | null = null;
  let detector = new MediaPipeHandDetector();

  let cameraState: CameraState = 'camera-off';
  let cameraError: CameraError | undefined = undefined;
  let statusOverride = '';

  let rawFingerCount = 0;
  let smoothedFingerCount = 0;
  let detectionConfidence = 0;
  let fps = 0;
  let inferenceMs = 0;

  let mirroredPreview = true;
  let singleHandMode = true;
  let snapshotFrozen = false;
  let frozenFrameDataUrl = '';

  let stabilizationWindow = 7;
  let movingAverage = new MovingAverageSmoother(5);
  let voteStabilizer = new MajorityVoteStabilizer(stabilizationWindow);
  let stabilizationWindowInternal = stabilizationWindow;

  let availableCameras: MediaDeviceInfo[] = [];
  let activeCameraIndex = 0;

  let rafId: number | null = null;
  let lastInferenceAt = 0;
  let lastFrameAt = 0;
  let frameCount = 0;
  let fpsWindowStart = 0;
  let loopRunning = false;
  let modelReady = false;

  let lastHand: DetectorHand | null = null;
  let lastCount: FingerCountResult = {
    count: 0,
    confidence: 0,
    details: {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false
    }
  };

  const INFERENCE_INTERVAL_MS = 50;

  $: browserSupport = hasRequiredBrowserApis();
  $: canSwitchCamera = availableCameras.length > 1;
  $: statusMessage = statusOverride || getStateMessage(cameraState, cameraError);
  $: statusLabel = getStatusLabel(cameraState);
  $: if (stabilizationWindow !== stabilizationWindowInternal) {
    stabilizationWindowInternal = stabilizationWindow;
    voteStabilizer = new MajorityVoteStabilizer(stabilizationWindowInternal);
  }

  function hasRequiredBrowserApis(): boolean {
    if (!browser) return false;
    return Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);
  }

  function isLocalhostContext(): boolean {
    if (!browser) return false;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }

  function ensureSecureContext(): boolean {
    if (!browser) return false;
    if (window.isSecureContext) return true;
    return isLocalhostContext();
  }

  function getStatusLabel(state: CameraState): string {
    switch (state) {
      case 'camera-off':
        return 'Camera off';
      case 'requesting-permission':
      case 'requesting-camera':
        return 'Requesting permission';
      case 'detecting-hand':
        return 'Detecting hand';
      case 'no-hand-detected':
      case 'camera-active':
        return 'No hand detected';
      case 'error':
        return 'Camera off';
      default:
        return 'Camera off';
    }
  }

  async function refreshCameras(): Promise<void> {
    if (!browser || !navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    availableCameras = devices.filter((device) => device.kind === 'videoinput');

    if (availableCameras.length === 0) {
      activeCameraIndex = 0;
      return;
    }

    if (activeCameraIndex >= availableCameras.length) {
      activeCameraIndex = 0;
    }
  }

  function resetCounters(): void {
    rawFingerCount = 0;
    smoothedFingerCount = 0;
    detectionConfidence = 0;
    fps = 0;
    inferenceMs = 0;
    frameCount = 0;
    lastFrameAt = 0;
    fpsWindowStart = 0;
    lastInferenceAt = 0;
    movingAverage.reset();
    voteStabilizer.reset();
    lastHand = null;
    lastCount = {
      count: 0,
      confidence: 0,
      details: {
        thumb: false,
        index: false,
        middle: false,
        ring: false,
        pinky: false
      }
    };
  }

  function clearOverlay(): void {
    if (!overlayEl) return;
    const ctx = overlayEl.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlayEl.width, overlayEl.height);
  }

  function getPreferredVideoConstraints(deviceId?: string): Array<MediaTrackConstraints | true> {
    const base: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 }
    };

    if (deviceId) {
      return [
        { ...base, deviceId: { exact: deviceId } },
        { ...base, deviceId: { ideal: deviceId } }
      ];
    }

    return [
      { ...base, facingMode: { ideal: 'user' } },
      { ...base, facingMode: { ideal: 'environment' } },
      true
    ];
  }

  async function requestCameraStream(deviceId?: string): Promise<MediaStream> {
    const attempts = getPreferredVideoConstraints(deviceId);
    let lastError: unknown = undefined;

    for (const videoConstraint of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: false
        });
      } catch (error) {
        lastError = error;
      }
    }

    throw (lastError ?? new Error('Unable to acquire camera stream'));
  }

  async function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Video metadata could not be loaded'));
      };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
      };

      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });
    });
  }

  function drawOverlay(hand: DetectorHand | null, countResult: FingerCountResult): void {
    if (!overlayEl || !videoEl) return;
    const width = videoEl.videoWidth || 640;
    const height = videoEl.videoHeight || 480;

    if (overlayEl.width !== width || overlayEl.height !== height) {
      overlayEl.width = width;
      overlayEl.height = height;
    }

    const ctx = overlayEl.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    if (!hand) return;

    ctx.strokeStyle = 'rgba(163, 230, 53, 0.65)';
    ctx.lineWidth = 2;

    for (const [a, b] of HAND_CONNECTIONS) {
      const p1 = hand.landmarks[a];
      const p2 = hand.landmarks[b];
      if (!p1 || !p2) continue;

      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }

    for (let i = 0; i < hand.landmarks.length; i++) {
      const lm = hand.landmarks[i];
      const x = lm.x * width;
      const y = lm.y * height;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(163, 230, 53, 0.95)';
      ctx.fill();
    }

    const highlightedTips: Array<{ idx: number; raised: boolean }> = [
      { idx: 4, raised: countResult.details.thumb },
      { idx: 8, raised: countResult.details.index },
      { idx: 12, raised: countResult.details.middle },
      { idx: 16, raised: countResult.details.ring },
      { idx: 20, raised: countResult.details.pinky }
    ];

    for (const tip of highlightedTips) {
      if (!tip.raised) continue;
      const point = hand.landmarks[tip.idx];
      if (!point) continue;
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(120, 217, 146, 0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function startLoop(): void {
    if (!browser || loopRunning) return;
    loopRunning = true;
    rafId = requestAnimationFrame(processFrame);
  }

  function stopLoop(): void {
    loopRunning = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function updateFps(now: number): void {
    if (!fpsWindowStart) {
      fpsWindowStart = now;
      frameCount = 0;
    }

    frameCount += 1;
    const elapsed = now - fpsWindowStart;
    if (elapsed >= 1000) {
      fps = Math.round((frameCount * 1000) / elapsed);
      frameCount = 0;
      fpsWindowStart = now;
    }
  }

  function captureFrozenFrame(): void {
    if (!videoEl) return;
    const canvas = document.createElement('canvas');
    const width = videoEl.videoWidth || 640;
    const height = videoEl.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, width, height);
    frozenFrameDataUrl = canvas.toDataURL('image/png');
  }

  async function processFrame(now: number): Promise<void> {
    if (!loopRunning || !videoEl) return;

    updateFps(now);

    if (snapshotFrozen) {
      drawOverlay(lastHand, lastCount);
      rafId = requestAnimationFrame(processFrame);
      return;
    }

    if (now - lastInferenceAt < INFERENCE_INTERVAL_MS) {
      rafId = requestAnimationFrame(processFrame);
      return;
    }

    lastInferenceAt = now;
    const start = performance.now();

    try {
      if (!modelReady) {
        cameraState = 'error';
        cameraError = 'model-load-failed';
        statusOverride = ERROR_MESSAGES['model-load-failed'];
        stopLoop();
        return;
      }

      const detected = detector.detect(videoEl, now);
      const hand = detected.hands[0] ?? null;
      lastHand = hand;

      if (!hand) {
        cameraState = 'no-hand-detected';
        rawFingerCount = 0;
        const averaged = movingAverage.update(0);
        smoothedFingerCount = validateFingerCount(voteStabilizer.update(Math.round(averaged)));
        detectionConfidence = 0;
        drawOverlay(null, lastCount);
      } else {
        const counted = countRaisedFingers(
          {
            landmarks: hand.landmarks,
            handedness: hand.handedness
          },
          { mirrored: mirroredPreview }
        );

        const raw = validateFingerCount(counted.count);
        const averaged = movingAverage.update(raw);
        const stabilized = voteStabilizer.update(Math.round(averaged));

        rawFingerCount = raw;
        smoothedFingerCount = validateFingerCount(stabilized);
        detectionConfidence = Math.max(0, Math.min(1, (counted.confidence + hand.score) / 2));
        cameraState = 'detecting-hand';
        lastCount = counted;
        drawOverlay(hand, counted);
      }
    } catch {
      cameraState = 'error';
      cameraError = 'unknown';
      statusOverride = ERROR_MESSAGES.unknown;
      stopLoop();
      return;
    } finally {
      inferenceMs = Math.round(performance.now() - start);
    }

    rafId = requestAnimationFrame(processFrame);
  }

  async function startCamera(): Promise<void> {
    if (!browser) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      cameraState = 'error';
      cameraError = 'not-supported';
      statusOverride = ERROR_MESSAGES['not-supported'];
      return;
    }

    if (!ensureSecureContext()) {
      cameraState = 'error';
      cameraError = 'insecure-context';
      statusOverride = ERROR_MESSAGES['insecure-context'];
      return;
    }

    cameraError = undefined;
    statusOverride = '';
    modelReady = false;
    resetCounters();
    cameraState = 'requesting-permission';

    await refreshCameras();

    const selectedDevice = availableCameras[activeCameraIndex];
    if (!selectedDevice && availableCameras.length === 0) {
      cameraState = 'error';
      cameraError = 'no-camera-available';
      statusOverride = ERROR_MESSAGES['no-camera-available'];
      return;
    }

    try {
      cameraState = 'requesting-camera';
      stream = await requestCameraStream(selectedDevice?.deviceId);

      if (!videoEl) {
        throw new Error('Video element unavailable');
      }

      videoEl.muted = true;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.srcObject = stream;
      await waitForVideoReady(videoEl);
      await videoEl.play();

      await refreshCameras();

      cameraState = 'camera-active';

      try {
        await detector.load({
          maxHands: singleHandMode ? 1 : 2,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5
        });
        modelReady = true;
      } catch {
        cameraState = 'error';
        cameraError = 'model-load-failed';
        statusOverride = ERROR_MESSAGES['model-load-failed'];
        modelReady = false;
        return;
      }

      cameraState = 'no-hand-detected';
      startLoop();
    } catch (error) {
      cameraState = 'error';
      cameraError = mapCameraError(error as Error | DOMException);
      statusOverride = ERROR_MESSAGES[cameraError];
      await stopCamera(false);
    }
  }

  async function stopCamera(resetState: boolean = true): Promise<void> {
    stopLoop();
    modelReady = false;

    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      stream = null;
    }

    if (videoEl) {
      videoEl.pause();
      videoEl.srcObject = null;
    }

    clearOverlay();
    snapshotFrozen = false;
    frozenFrameDataUrl = '';

    if (resetState) {
      cameraState = 'camera-off';
      cameraError = undefined;
      statusOverride = '';
      resetCounters();
    }
  }

  async function switchCamera(): Promise<void> {
    if (!canSwitchCamera) return;
    activeCameraIndex = (activeCameraIndex + 1) % availableCameras.length;

    if (cameraState === 'camera-off' || cameraState === 'error') {
      return;
    }

    await stopCamera(false);
    await startCamera();
  }

  async function toggleSingleHandMode(): Promise<void> {
    singleHandMode = !singleHandMode;
    if (cameraState === 'camera-off' || cameraState === 'error') return;
    await detector.setMaxHands(singleHandMode ? 1 : 2);
  }

  function toggleMirror(): void {
    mirroredPreview = !mirroredPreview;
  }

  function toggleSnapshotFreeze(): void {
    if (!snapshotFrozen) {
      captureFrozenFrame();
      snapshotFrozen = true;
      return;
    }

    snapshotFrozen = false;
    frozenFrameDataUrl = '';
  }

  onDestroy(() => {
    void stopCamera(false);
    detector.dispose();
  });
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  {#if !browserSupport}
    <section class="panel" aria-label="Unsupported environment">
      <h2>Browser support</h2>
      <p class="error">Browser API not supported.</p>
      <p>
        This tool needs camera APIs, secure context, and modern browser features.
        Try modern Chrome/Edge or recent mobile Safari over HTTPS (or localhost).
      </p>
    </section>
  {:else}
    <div class="tool-layout">
      <section class="panel preview" aria-label="Live camera preview">
        <div class="preview-shell" class:mirrored={mirroredPreview}>
          <video bind:this={videoEl} autoplay playsinline muted></video>
          {#if snapshotFrozen && frozenFrameDataUrl}
            <img class="frozen" src={frozenFrameDataUrl} alt="Frozen frame" />
          {/if}
          <canvas bind:this={overlayEl}></canvas>
        </div>
      </section>

      <div class="analysis-column">
        <section class="panel controls" aria-label="Camera controls">
          <div class="actions">
            <button type="button" class="primary" on:click={startCamera} disabled={cameraState !== 'camera-off' && cameraState !== 'error'}>
              Start Camera
            </button>
            <button type="button" on:click={() => stopCamera()} disabled={cameraState === 'camera-off'}>
              Stop Camera
            </button>
            <button type="button" on:click={switchCamera} disabled={!canSwitchCamera || cameraState === 'camera-off'}>
              Switch Camera
            </button>
          </div>

          <div class="actions toggles">
            <button type="button" class:active={mirroredPreview} on:click={toggleMirror}>
              Mirrored Preview: {mirroredPreview ? 'On' : 'Off'}
            </button>
            <button type="button" class:active={!singleHandMode} on:click={toggleSingleHandMode}>
              Single-hand Mode: {singleHandMode ? 'On' : 'Off'}
            </button>
            <button type="button" class:active={snapshotFrozen} on:click={toggleSnapshotFreeze} disabled={cameraState === 'camera-off'}>
              Snapshot Freeze: {snapshotFrozen ? 'On' : 'Off'}
            </button>
          </div>

          <div class="field">
            <label for="stabilization-window">Stabilization window ({stabilizationWindow})</label>
            <input
              id="stabilization-window"
              type="range"
              min="3"
              max="15"
              step="2"
              bind:value={stabilizationWindow}
            />
          </div>
        </section>

        <section class="panel status" aria-live="polite" aria-atomic="true" aria-label="Detection status">
          <div class="status-row">
            <p><strong>Status:</strong> {statusLabel}</p>
            <p><strong>State:</strong> {statusMessage}</p>
          </div>

          {#if cameraState === 'error'}
            <p class="error">{cameraError ? ERROR_MESSAGES[cameraError] : ERROR_MESSAGES.unknown}</p>
          {/if}

          <div class="stats-grid">
            <div class="stat-box">
              <p class="label">Current finger count</p>
              <p class="value">{rawFingerCount}</p>
            </div>
            <div class="stat-box">
              <p class="label">Smoothed finger count</p>
              <p class="value">{smoothedFingerCount}</p>
            </div>
            <div class="stat-box">
              <p class="label">Detection confidence</p>
              <p class="value">{Math.round(detectionConfidence * 100)}%</p>
              <div class="meter" aria-hidden="true">
                <span style={`width: ${Math.round(detectionConfidence * 100)}%`}></span>
              </div>
            </div>
            <div class="stat-box">
              <p class="label">FPS</p>
              <p class="value">{fps}</p>
            </div>
            <div class="stat-box">
              <p class="label">Inference time</p>
              <p class="value">{inferenceMs} ms</p>
            </div>
          </div>
        </section>

        <section class="panel panel-subtle" aria-label="Privacy note">
          <p><strong>Privacy:</strong> Video is processed locally in your browser and is not uploaded.</p>
        </section>

        <section class="panel tips" aria-label="Tips for better results">
          <h2>How to get better results</h2>
          <ul>
            <li>Good lighting</li>
            <li>Keep one hand fully visible</li>
            <li>Avoid motion blur</li>
            <li>Keep distance to camera moderate</li>
          </ul>
        </section>
      </div>
    </div>
  {/if}
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
  }

  .tool-layout {
    display: grid;
    gap: var(--space-2);
  }

  .analysis-column {
    display: grid;
    gap: var(--space-2);
    align-content: start;
  }

  .tool-header {
    display: grid;
    gap: var(--space-1);
  }

  .controls {
    display: grid;
    gap: var(--space-2);
  }

  .preview-shell {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: #000;
  }

  .preview-shell video,
  .preview-shell canvas,
  .preview-shell .frozen {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .preview-shell canvas {
    pointer-events: none;
  }

  .preview-shell.mirrored video,
  .preview-shell.mirrored canvas,
  .preview-shell.mirrored .frozen {
    transform: scaleX(-1);
  }

  .status {
    display: grid;
    gap: var(--space-2);
  }

  .status-row {
    display: grid;
    gap: var(--space-1);
  }

  .stats-grid {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-box {
    background: var(--surface-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-1);
    display: grid;
    gap: var(--space-half);
  }

  .label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .value {
    font-size: 18px;
    font-weight: 700;
  }

  .meter {
    height: 8px;
    width: 100%;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .meter span {
    display: block;
    height: 100%;
    background: var(--accent);
  }

  ul {
    margin: 0;
    padding-left: 20px;
    display: grid;
    gap: var(--space-half);
  }

  .tips {
    margin-bottom: 0;
  }

  @media (min-width: 1024px) {
    .tool-layout {
      grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
      align-items: start;
    }

    .preview-shell {
      aspect-ratio: auto;
      height: clamp(420px, 62vh, 720px);
    }

    .analysis-column {
      max-height: clamp(420px, 62vh, 720px);
      overflow: auto;
      padding-right: 2px;
    }
  }

  @media (max-width: 900px) {
    .stats-grid {
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    }

    .value {
      font-size: 16px;
    }
  }
</style>
