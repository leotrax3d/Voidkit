<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';
  import type { Tool } from '$lib/types';
  import {
    DESK_POSTURE_ERROR_MESSAGES,
    canTransitionDeskPosturePhase,
    getDeskPostureSetupIssue,
    getDeskPostureSetupMessage,
    buildDeskPostureBaseline,
    measureDeskPosture,
    mapDeskPostureError,
    type DeskPostureCalibrationSample,
    type DeskPostureBaseline,
    type DeskPostureError,
    type DeskPosturePhase,
    type DeskPostureSetupIssue,
    type DeskPostureState,
    type DeskPostureSensitivity,
    type DeskPostureUpdate,
    DeskPostureEngine,
  } from '$lib/utils/desk-posture';
  import {
    buildDeskPostureDualCalibrationModel,
    compareDeskPostureBaselines,
    validateDeskPostureCalibrationSamples,
    type DeskPostureCalibrationComparison,
    type DeskPostureCalibrationCaptureType,
    type DeskPostureCalibrationValidationResult,
    type DeskPostureDualCalibrationModel,
  } from '$lib/utils/desk-posture-calibration';
  import {
    canUseDeskPostureNotifications,
    requestDeskPostureNotificationPermission,
    showDeskPostureNotification,
  } from '$lib/utils/desk-posture-notifications';
  import { MediaPipePoseDetector, type DetectedPose } from '$lib/utils/pose-detector';
  import type { Landmark } from '$lib/utils/finger-counting';

  export let tool: Tool;

  const POSE_CONNECTIONS: Array<[number, number]> = [
    [0, 11],
    [0, 12],
    [11, 12],
    [11, 23],
    [12, 24],
    [23, 24],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
    [23, 25],
    [25, 27],
    [24, 26],
    [26, 28]
  ];

  const BASELINE_STORAGE_KEY = 'voidkit_desk_posture_baseline';
  const CALIBRATION_STORAGE_KEY = 'voidkit_desk_posture_calibration_v2';
  const BASELINE_OPT_IN_KEY = 'voidkit_desk_posture_baseline_opt_in';
  const MIRROR_STORAGE_KEY = 'voidkit_desk_posture_mirror_preview';

  type SetupStep = 'setup' | 'neutral' | 'slouched' | 'review';

  let videoEl: HTMLVideoElement | null = null;
  let overlayEl: HTMLCanvasElement | null = null;
  let stream: MediaStream | null = null;
  let detector = new MediaPipePoseDetector();
  let engine = new DeskPostureEngine({ sensitivity: 'balanced', alertDelayMs: 90_000 });

  let phase: DeskPosturePhase = 'idle';
  let cameraError: DeskPostureError | undefined = undefined;
  let statusOverride = '';
  let notificationPermission: NotificationPermission | 'unsupported' = 'default';
  let notificationEnabled = false;
  let soundAlertEnabled = false;
  let mirrorPreview = true;
  let rememberBaseline = false;
  let useSavedBaseline = true;
  let selectedSensitivity: DeskPostureSensitivity = 'balanced';
  let alertDelaySeconds = 90;
  let availableCameras: MediaDeviceInfo[] = [];
  let selectedDeviceId = '';
  let selectedDeviceIndex = 0;
  let cameraReady = false;
  let modelReady = false;
  let loopRunning = false;
  let rafId: number | null = null;
  let lastInferenceAt = 0;
  let lastCaptureAt = 0;
  let assistantStep: SetupStep = 'setup';
  let assistantCaptureActive = false;
  let assistantCaptureType: DeskPostureCalibrationCaptureType | null = null;
  let assistantCaptureStartedAt = 0;
  let assistantCaptureDurationMs = 8000;
  let assistantCaptureProgress = 0;
  let assistantAcceptedFrames = 0;
  let assistantComplete = false;
  let assistantStatus = 'Click Start setup to begin the guided calibration.';
  let assistantIssueMessage = '';
  let assistantReviewMessage = '';
  let liveBaseline: DeskPostureBaseline | null = null;
  let liveCalibrationModel: DeskPostureDualCalibrationModel | null = null;
  let updateSnapshot: DeskPostureUpdate | null = null;
  let savedBaseline: DeskPostureBaseline | null = null;
  let savedCalibrationModel: DeskPostureDualCalibrationModel | null = null;
  let neutralSamples: DeskPostureCalibrationSample[] = [];
  let slouchedSamples: DeskPostureCalibrationSample[] = [];
  let neutralValidation: DeskPostureCalibrationValidationResult | null = null;
  let slouchedValidation: DeskPostureCalibrationValidationResult | null = null;
  let calibrationComparison: DeskPostureCalibrationComparison | null = null;

  let postureScore = 0;
  let rawPostureScore = 0;
  let postureState: DeskPostureState = 'good';
  let postureConfidence = 0;
  let trackingReliable = true;
  let personVisible = false;
  let shouldWarn = false;
  let warningEvents = 0;
  let poorStreakMs = 0;
  let longestPoorStreakMs = 0;
  let sessionDurationMs = 0;
  let goodPosturePercentage = 0;
  let timeline: number[] = [];
  let liveMetrics: {
    headForward: number;
    neckTilt: number;
    shoulderImbalance: number;
    torsoLean: number;
    profileQuality: number;
    cameraScale: number;
    profileSide: 'left' | 'right' | 'unknown';
  } | null = null;

  let sessionSummary = {
    sessionDurationMs: 0,
    goodPosturePercentage: 0,
    warningEvents: 0,
    longestPoorStreakMs: 0
  };

  $: browserSupport = hasSupportedEnvironment();
  $: statusLabel = getStatusChipLabel();
  $: statusMessage = statusOverride || getCameraStateHint();
  $: setupIssueMessage = assistantIssueMessage || getDeskPostureSetupMessage(updateSnapshot?.setupIssue as DeskPostureSetupIssue | null | undefined);
  $: assistantStepIndex = getAssistantStepIndex(assistantStep);
  $: assistantProgress = assistantCaptureActive
    ? Math.min(1, (assistantStepIndex + assistantCaptureProgress) / 4)
    : (assistantStepIndex + 1) / 4;
  $: assistantStepLabel = getAssistantStepLabel(assistantStep);
  $: assistantInstruction = getAssistantInstruction(assistantStep);
  $: assistantActionLabel = getAssistantActionLabel(assistantStep, assistantCaptureActive);
  $: canSwitchCamera = availableCameras.length > 1;
  $: if (selectedSensitivity) {
    engine.setSensitivity(selectedSensitivity);
  }
  $: engine.setAlertDelayMs(alertDelaySeconds * 1000);

  onMount(() => {
    if (!browser) return;

    mirrorPreview = readBooleanStorage(MIRROR_STORAGE_KEY, true);
    rememberBaseline = readBooleanStorage(BASELINE_OPT_IN_KEY, false);
    savedCalibrationModel = readCalibrationStorage();
    savedBaseline = readBaselineStorage();
    notificationPermission = canUseDeskPostureNotifications() ? Notification.permission : 'unsupported';
    if (rememberBaseline && savedCalibrationModel) {
      applyCalibrationModel(savedCalibrationModel);
    } else if (rememberBaseline && savedBaseline) {
      liveBaseline = savedBaseline;
      engine.setBaseline(savedBaseline);
    }
  });

  function hasSupportedEnvironment(): boolean {
    if (!browser) return false;
    const isSecure = window.isSecureContext || isLocalhostContext();
    const hasMediaDevices = typeof navigator.mediaDevices?.getUserMedia === 'function';
    const hasAudioContext = typeof window.AudioContext !== 'undefined' || typeof (window as Window & { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined';
    return Boolean(isSecure && hasMediaDevices && hasAudioContext && window.requestAnimationFrame);
  }

  function isLocalhostContext(): boolean {
    if (!browser) return false;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }

  function readBooleanStorage(key: string, fallback: boolean): boolean {
    if (!browser) return fallback;
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return stored === 'true';
  }

  function readBaselineStorage(): DeskPostureBaseline | null {
    if (!browser) return null;
    try {
      const stored = localStorage.getItem(BASELINE_STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as DeskPostureBaseline;
    } catch {
      return null;
    }
  }

  function readCalibrationStorage(): DeskPostureDualCalibrationModel | null {
    if (!browser) return null;
    try {
      const stored = localStorage.getItem(CALIBRATION_STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as Partial<DeskPostureDualCalibrationModel>;
      if (parsed.version !== 2 || !parsed.good || !parsed.bad || !parsed.comparison) {
        return null;
      }
      return parsed as DeskPostureDualCalibrationModel;
    } catch {
      return null;
    }
  }

  function persistSettings(): void {
    if (!browser) return;
    localStorage.setItem(MIRROR_STORAGE_KEY, String(mirrorPreview));
    localStorage.setItem(BASELINE_OPT_IN_KEY, String(rememberBaseline));
    if (rememberBaseline && liveBaseline) {
      localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(liveBaseline));
    }
    if (!rememberBaseline) {
      localStorage.removeItem(BASELINE_STORAGE_KEY);
      localStorage.removeItem(CALIBRATION_STORAGE_KEY);
    }
  }

  function persistCalibrationModel(model: DeskPostureDualCalibrationModel): void {
    if (!browser) return;
    localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(model));
    localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(model.good));
  }

  function clearAssistantCapture(): void {
    assistantCaptureActive = false;
    assistantCaptureType = null;
    assistantCaptureStartedAt = 0;
    assistantCaptureProgress = 0;
    assistantAcceptedFrames = 0;
    assistantIssueMessage = '';
  }

  function resetAssistantState(clearSavedModel = false): void {
    assistantStep = 'setup';
    clearAssistantCapture();
    assistantComplete = false;
    assistantStatus = 'Review the checklist, then continue to upright calibration.';
    assistantReviewMessage = '';
    updateSnapshot = null;
    neutralSamples = [];
    slouchedSamples = [];
    neutralValidation = null;
    slouchedValidation = null;
    calibrationComparison = null;
    if (clearSavedModel) {
      liveCalibrationModel = null;
      liveBaseline = null;
    }
  }

  function getAssistantStepIndex(step: SetupStep): number {
    switch (step) {
      case 'setup':
        return 0;
      case 'neutral':
        return 1;
      case 'slouched':
        return 2;
      case 'review':
        return 3;
      default:
        return 0;
    }
  }

  function getAssistantStepLabel(step: SetupStep): string {
    switch (step) {
      case 'setup':
        return 'Camera and seating setup';
      case 'neutral':
        return 'Capture neutral upright posture';
      case 'slouched':
        return 'Capture poor slouched posture';
      case 'review':
        return 'Review and finalize calibration';
      default:
        return 'Calibration setup';
    }
  }

  function getAssistantInstruction(step: SetupStep): string {
    switch (step) {
      case 'setup':
        return 'Place the camera beside your body, keep your side profile visible, and make sure you can sit comfortably for both captures.';
      case 'neutral':
        return 'Sit upright now. Keep your ear over your shoulder and stay still while we collect a clean neutral sample.';
      case 'slouched':
        return 'Lean into a clearly slouched but still comfortable posture. Do not exaggerate so far that it feels painful.';
      case 'review':
        return 'Review the learned difference between upright and slouched posture, then finish calibration to start monitoring.';
      default:
        return '';
    }
  }

  function getAssistantActionLabel(step: SetupStep, captureActive: boolean): string {
    if (captureActive) {
      return 'Capturing';
    }

    switch (step) {
      case 'setup':
        return 'Next step';
      case 'neutral':
        return 'Next step';
      case 'slouched':
        return 'Next step';
      case 'review':
        return 'Finish calibration';
      default:
        return 'Next step';
    }
  }

  function startAssistantCapture(type: DeskPostureCalibrationCaptureType): void {
    assistantCaptureActive = true;
    assistantCaptureType = type;
    assistantCaptureStartedAt = performance.now();
    assistantCaptureProgress = 0;
    assistantAcceptedFrames = 0;
    assistantComplete = false;
    assistantIssueMessage = '';
    assistantStatus = type === 'neutral'
      ? 'Hold your upright posture. We are collecting the neutral sample.'
      : 'Lean into the slouched posture. We are collecting the poor-posture sample.';
  }

  function beginAssistant(): void {
    if (!cameraReady) return;
    resetAssistantState(false);
    assistantStatus = 'Calibration setup ready. Continue to the first capture when you are positioned correctly.';
  }

  function goToNextAssistantStep(): void {
    if (assistantCaptureActive) return;

    switch (assistantStep) {
      case 'setup':
        assistantStep = 'neutral';
        startAssistantCapture('neutral');
        break;
      case 'neutral':
        startAssistantCapture('neutral');
        break;
      case 'slouched':
        startAssistantCapture('slouched');
        break;
      case 'review':
        finishAssistantCalibration();
        break;
    }
  }

  function retryAssistantStep(): void {
    if (assistantStep === 'setup') {
      assistantStatus = 'Review the checklist and continue when the side view is ready.';
      return;
    }

    clearAssistantCapture();
    if (assistantStep === 'neutral') {
      neutralSamples = [];
      neutralValidation = null;
      assistantStatus = 'Retry the upright capture when you are steady and fully visible.';
      startAssistantCapture('neutral');
      return;
    }

    if (assistantStep === 'slouched') {
      slouchedSamples = [];
      slouchedValidation = null;
      assistantStatus = 'Retry the slouched capture with a clearer, more obvious slump.';
      startAssistantCapture('slouched');
    }
  }

  function restartAssistant(): void {
    resetAssistantState(false);
    assistantComplete = false;
    setPhase('idle');
    assistantStatus = 'Setup restarted. Follow the checklist, then capture upright posture again.';
    statusOverride = assistantStatus;
  }

  function backAssistantStep(): void {
    if (assistantCaptureActive) return;
    clearAssistantCapture();
    assistantComplete = false;

    if (assistantStep === 'neutral') {
      setPhase('idle');
      assistantStep = 'setup';
      assistantStatus = 'Recheck camera placement before you continue.';
      return;
    }

    if (assistantStep === 'slouched') {
      setPhase('idle');
      assistantStep = 'neutral';
      assistantStatus = 'Return to the upright capture if you want to rework the neutral sample.';
      return;
    }

    if (assistantStep === 'review') {
      setPhase('idle');
      assistantStep = 'slouched';
      assistantStatus = 'Return to the slouched sample if you want to capture it again.';
    }
  }

  function applyCalibrationModel(model: DeskPostureDualCalibrationModel): void {
    liveCalibrationModel = model;
    savedCalibrationModel = model;
    liveBaseline = model.good;
    savedBaseline = model.good;
    engine.setCalibrationModel(model);
    engine.setBaseline(model.good);
    if (rememberBaseline) {
      persistCalibrationModel(model);
    }
  }

  function finishAssistantCalibration(): void {
    if (!neutralValidation?.valid || !slouchedValidation?.valid) {
      assistantReviewMessage = 'Both calibration samples must be valid before finishing.';
      return;
    }

    if (neutralSamples.length === 0 || slouchedSamples.length === 0) {
      assistantReviewMessage = 'Capture both samples before finishing calibration.';
      return;
    }

    const goodBaseline = buildDeskPostureBaseline(neutralSamples);
    const badBaseline = buildDeskPostureBaseline(slouchedSamples);

    if (!goodBaseline || !badBaseline) {
      assistantReviewMessage = 'The calibration model could not be built reliably. Restart the setup and try again.';
      return;
    }

    const model = buildDeskPostureDualCalibrationModel(goodBaseline, badBaseline, performance.now());
    calibrationComparison = compareDeskPostureBaselines(model.good, model.bad);
    applyCalibrationModel(model);
    persistCurrentCalibration();
    assistantStep = 'review';
    assistantStatus = 'Calibration finished. The dual posture model is ready for monitoring.';
    assistantReviewMessage = 'Calibration finished. You can restart setup anytime to recalibrate.';
    assistantComplete = true;
    clearAssistantCapture();
    setPhase('monitoring');
    statusOverride = 'Calibration complete. Monitoring with the dual posture model.';
  }

  function getStatusChipLabel(): string {
    if (cameraError) {
      return 'Error';
    }

    if (assistantCaptureActive) {
      return 'Capturing';
    }

    if (assistantStep !== 'setup' && phase !== 'monitoring') {
      return 'Setup';
    }

    switch (phase) {
      case 'idle':
        return 'Idle';
      case 'calibrating':
        return 'Calibrating';
      case 'monitoring':
        return !personVisible ? 'No person detected' : 'Monitoring';
      case 'error':
        return 'Error';
      default:
        return 'Idle';
    }
  }

  function getCameraStateHint(): string {
    if (cameraError) {
      return DESK_POSTURE_ERROR_MESSAGES[cameraError];
    }

    if (updateSnapshot?.setupIssue) {
      return getDeskPostureSetupMessage(updateSnapshot.setupIssue);
    }

    if (assistantCaptureActive || (assistantStep !== 'setup' && phase !== 'monitoring')) {
      return assistantStatus;
    }

    if (!modelReady) {
      return 'Loading pose model…';
    }

    if (phase === 'monitoring' && !personVisible) {
      return trackingReliable
        ? 'No person detected. Keep your upper body visible.'
        : 'Tracking confidence is too low for reliable analysis right now.';
    }

    if (phase === 'monitoring') {
      return postureState === 'poor'
        ? 'Poor posture detected. Please reset your sitting position.'
        : postureState === 'slightly-off'
          ? 'Your posture is slightly off. Try to sit a bit taller.'
          : 'Good side-view posture detected.';
    }

    return 'Click "Start Camera" to begin side-view posture monitoring.';
  }

  function setPhase(next: DeskPosturePhase): void {
    if (canTransitionDeskPosturePhase(phase, next) || phase === next) {
      phase = next;
    } else {
      phase = next;
    }
  }

  async function refreshCameras(): Promise<void> {
    if (!browser || !navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    availableCameras = devices.filter((device) => device.kind === 'videoinput');

    if (availableCameras.length === 0) {
      selectedDeviceIndex = 0;
      selectedDeviceId = '';
      return;
    }

    if (selectedDeviceIndex >= availableCameras.length) {
      selectedDeviceIndex = 0;
    }

    selectedDeviceId = availableCameras[selectedDeviceIndex]?.deviceId ?? selectedDeviceId;
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
        return await navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: false });
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

  function resetMetrics(): void {
    postureScore = 0;
    rawPostureScore = 0;
    postureState = 'good';
    postureConfidence = 0;
    trackingReliable = true;
    personVisible = false;
    shouldWarn = false;
    warningEvents = 0;
    poorStreakMs = 0;
    longestPoorStreakMs = 0;
    sessionDurationMs = 0;
    goodPosturePercentage = 0;
    timeline = [];
    liveMetrics = null;
    sessionSummary = {
      sessionDurationMs: 0,
      goodPosturePercentage: 0,
      warningEvents: 0,
      longestPoorStreakMs: 0
    };
    updateSnapshot = null;
  }

  function clearOverlay(): void {
    if (!overlayEl) return;
    const ctx = overlayEl.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlayEl.width, overlayEl.height);
  }

  function drawOverlay(pose: DetectedPose | null, analysis: DeskPostureUpdate | null): void {
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

    if (!pose) return;

    const stateColor = analysis?.postureState === 'poor'
      ? '#ef4444'
      : analysis?.postureState === 'slightly-off'
        ? '#e8b256'
        : '#a3e635';

    ctx.strokeStyle = stateColor;
    ctx.fillStyle = stateColor;
    ctx.lineWidth = 2;

    for (const [a, b] of POSE_CONNECTIONS) {
      const p1 = pose.landmarks[a];
      const p2 = pose.landmarks[b];
      if (!p1 || !p2) continue;
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }

    const points = [0, 11, 12, 23, 24];
    for (const index of points) {
      const point = pose.landmarks[index];
      if (!point) continue;
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, index === 0 ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const shoulderLeft = pose.landmarks[11];
    const shoulderRight = pose.landmarks[12];
    const hipLeft = pose.landmarks[23];
    const hipRight = pose.landmarks[24];
    const nose = pose.landmarks[0];
    if (shoulderLeft && shoulderRight && hipLeft && hipRight && nose) {
      const shoulderMidX = (shoulderLeft.x + shoulderRight.x) / 2;
      const shoulderMidY = (shoulderLeft.y + shoulderRight.y) / 2;
      const hipMidX = (hipLeft.x + hipRight.x) / 2;
      const hipMidY = (hipLeft.y + hipRight.y) / 2;

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(shoulderMidX * width, shoulderMidY * height);
      ctx.lineTo(hipMidX * width, hipMidY * height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = stateColor;
      ctx.beginPath();
      ctx.moveTo(nose.x * width, nose.y * height);
      ctx.lineTo(shoulderMidX * width, shoulderMidY * height);
      ctx.stroke();
    }
  }

  function updateSessionSummary(analysis: DeskPostureUpdate): void {
    sessionSummary = {
      sessionDurationMs: analysis.sessionDurationMs,
      goodPosturePercentage: analysis.goodPosturePercentage,
      warningEvents: analysis.warningEvents,
      longestPoorStreakMs: analysis.longestPoorStreakMs
    };
  }

  function triggerSoundAlert(): void {
    if (!soundAlertEnabled || !browser) return;

    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const context = new AudioCtx();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 660;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
    oscillator.stop(context.currentTime + 0.2);
    oscillator.onended = () => {
      void context.close();
    };
  }

  function persistCurrentCalibration(): void {
    if (!rememberBaseline || !browser) return;

    if (liveCalibrationModel) {
      persistCalibrationModel(liveCalibrationModel);
      return;
    }

    if (liveBaseline) {
      localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(liveBaseline));
    }
  }

  function applyMonitoringResult(analysis: DeskPostureUpdate, pose: DetectedPose | null): void {
    updateSnapshot = analysis;
    postureScore = analysis.score;
    rawPostureScore = analysis.rawScore;
    postureState = analysis.postureState;
    postureConfidence = analysis.confidence;
    trackingReliable = analysis.trackingReliable;
    personVisible = analysis.personVisible;
    shouldWarn = analysis.shouldWarn;
    warningEvents = analysis.warningEvents;
    poorStreakMs = analysis.poorStreakMs;
    longestPoorStreakMs = analysis.longestPoorStreakMs;
    sessionDurationMs = analysis.sessionDurationMs;
    goodPosturePercentage = analysis.goodPosturePercentage;
    timeline = analysis.timeline;
    liveMetrics = analysis.metrics
      ? {
          headForward: analysis.metrics.headForward,
          neckTilt: analysis.metrics.neckTilt,
          shoulderImbalance: analysis.metrics.shoulderImbalance,
          torsoLean: analysis.metrics.torsoLean,
          profileQuality: analysis.metrics.profileQuality,
          cameraScale: analysis.metrics.cameraScale,
          profileSide: analysis.metrics.profileSide
        }
      : null;
    updateSessionSummary(analysis);
    drawOverlay(pose, analysis);

    if (analysis.shouldWarn) {
      const streakSeconds = Math.max(1, Math.round(analysis.poorStreakMs / 1000));
      if (notificationEnabled && notificationPermission === 'granted') {
        showDeskPostureNotification({
          score: analysis.score,
          postureState: analysis.postureState,
          streakSeconds
        });
      }
      triggerSoundAlert();
    }
  }

  function captureAssistantSample(timestampMs: number, pose: DetectedPose): void {
    if (!assistantCaptureActive || !assistantCaptureType) return;

    const metrics = measureDeskPosture(pose.landmarks);
    if (!metrics) {
      assistantIssueMessage = 'Tracking is unstable. Keep your side profile visible and try again.';
      drawOverlay(pose, null);
      return;
    }

    const setupIssue = getDeskPostureSetupIssue(metrics, metrics.confidence >= 0.5, selectedSensitivity);
    if (setupIssue) {
      assistantIssueMessage = getDeskPostureSetupMessage(setupIssue);
      drawOverlay(pose, null);
      return;
    }

    const sample: DeskPostureCalibrationSample = { ...metrics, timestampMs };
    if (assistantCaptureType === 'neutral') {
      neutralSamples.push(sample);
      assistantAcceptedFrames = neutralSamples.length;
    } else {
      slouchedSamples.push(sample);
      assistantAcceptedFrames = slouchedSamples.length;
    }

    assistantCaptureProgress = Math.max(0, Math.min(1, (timestampMs - assistantCaptureStartedAt) / assistantCaptureDurationMs));
    assistantStatus = assistantCaptureType === 'neutral'
      ? 'Collecting a stable upright sample.'
      : 'Collecting a stable slouched sample.';
  }

  function finalizeAssistantCapture(timestampMs: number): void {
    if (!assistantCaptureActive || !assistantCaptureType) return;

    const currentSamples = assistantCaptureType === 'neutral' ? neutralSamples : slouchedSamples;
    const goodBaseline = neutralSamples.length > 0 ? buildDeskPostureBaseline(neutralSamples) : null;
    const validation = validateDeskPostureCalibrationSamples(
      currentSamples,
      assistantCaptureType,
      assistantCaptureType === 'slouched' ? goodBaseline : undefined
    );

    if (assistantCaptureType === 'neutral') {
      neutralValidation = validation;
    } else {
      slouchedValidation = validation;
    }

    if (!validation.valid) {
      assistantIssueMessage = validation.message;
      assistantReviewMessage = validation.message;
      clearAssistantCapture();
      return;
    }

    assistantIssueMessage = '';
    assistantReviewMessage = validation.message;
    clearAssistantCapture();

    if (assistantCaptureType === 'neutral') {
      assistantStep = 'slouched';
      assistantStatus = 'Upright posture captured. Now move into a clearly slouched posture, then continue.';
      statusOverride = assistantStatus;
      return;
    }

    const updatedGoodBaseline = buildDeskPostureBaseline(neutralSamples);
    const updatedBadBaseline = buildDeskPostureBaseline(slouchedSamples);
    if (!updatedGoodBaseline || !updatedBadBaseline) {
      assistantIssueMessage = 'The calibration model could not be built reliably. Restart setup and try again.';
      assistantReviewMessage = assistantIssueMessage;
      return;
    }

    const model = buildDeskPostureDualCalibrationModel(updatedGoodBaseline, updatedBadBaseline, timestampMs);
    calibrationComparison = compareDeskPostureBaselines(model.good, model.bad);
    liveCalibrationModel = model;
    liveBaseline = model.good;
    assistantStep = 'review';
    assistantStatus = 'Both samples were captured. Review the learned difference, then finish calibration.';
    assistantReviewMessage = 'The calibration model is ready to finalize.';
  }

  function handleFrame(timestampMs: number, pose: DetectedPose | null): void {
    if (assistantCaptureActive) {
      if (pose) {
        captureAssistantSample(timestampMs, pose);
      } else {
        assistantIssueMessage = 'Tracking is lost. Keep your side profile in frame and try again.';
        drawOverlay(pose, null);
      }

      if (timestampMs - assistantCaptureStartedAt >= assistantCaptureDurationMs) {
        finalizeAssistantCapture(timestampMs);
      }

      return;
    }

    if (phase !== 'monitoring') {
      drawOverlay(pose, null);
      return;
    }

    const analysis = engine.update({ timestampMs, landmarks: pose?.landmarks ?? [] });
    applyMonitoringResult(analysis, pose);

    if (analysis.setupIssue) {
      statusOverride = getDeskPostureSetupMessage(analysis.setupIssue);
    } else if (!analysis.trackingReliable && analysis.personVisible === false) {
      statusOverride = DESK_POSTURE_ERROR_MESSAGES['low-confidence'];
    } else if (analysis.postureState === 'poor') {
      statusOverride = 'Poor posture detected. Sit up a bit and reset your shoulders.';
    } else if (analysis.postureState === 'slightly-off') {
      statusOverride = 'Your posture is slightly off. Try to sit a little taller.';
    } else if (analysis.postureState === 'good') {
      statusOverride = '';
    }
  }

  function scheduleLoop(): void {
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

  async function startCamera(enterSetup = false): Promise<void> {
    if (!browserSupport) {
      cameraError = 'not-supported';
      statusOverride = DESK_POSTURE_ERROR_MESSAGES['not-supported'];
      setPhase('error');
      return;
    }

    cameraError = undefined;
    statusOverride = '';
    resetMetrics();
    engine.resetSession();
    engine.setCalibrationModel(null);
    setPhase('idle');

    await refreshCameras();
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraError = 'not-supported';
      statusOverride = DESK_POSTURE_ERROR_MESSAGES['not-supported'];
      setPhase('error');
      return;
    }

    if (availableCameras.length === 0 && selectedDeviceId) {
      cameraError = 'camera-unavailable';
      statusOverride = DESK_POSTURE_ERROR_MESSAGES['camera-unavailable'];
      setPhase('error');
      return;
    }

    try {
      setPhase('idle');
      phase = 'idle';
      stream = await requestCameraStream(selectedDeviceId || undefined);
      if (!videoEl) {
        throw new Error('Video element unavailable');
      }

      videoEl.muted = true;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.srcObject = stream;
      await waitForVideoReady(videoEl);
      await videoEl.play();
      cameraReady = true;

      await detector.load({ maxPoses: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
      modelReady = true;

      await refreshCameras();
      if (enterSetup) {
        resetAssistantState(false);
        assistantStatus = 'Camera ready. Review the checklist, then press Next step to capture your upright posture.';
        statusOverride = assistantStatus;
        setPhase('idle');
      } else if (rememberBaseline && savedCalibrationModel && useSavedBaseline) {
        applyCalibrationModel(savedCalibrationModel);
        setPhase('monitoring');
        statusOverride = 'Monitoring with saved calibration.';
      } else if (rememberBaseline && savedBaseline && useSavedBaseline) {
        liveBaseline = savedBaseline;
        engine.setBaseline(savedBaseline);
        setPhase('monitoring');
        statusOverride = 'Monitoring with saved baseline.';
      } else {
        setPhase('idle');
        assistantStep = 'setup';
        assistantStatus = 'Camera ready. Start setup to calibrate the dual posture model.';
        statusOverride = assistantStatus;
      }

      scheduleLoop();
    } catch (error) {
      cameraError = mapDeskPostureError(error);
      statusOverride = DESK_POSTURE_ERROR_MESSAGES[cameraError];
      setPhase('error');
      await stopCamera(false);
    }
  }

  async function stopCamera(resetState: boolean = true): Promise<void> {
    stopLoop();

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
    cameraReady = false;
    modelReady = false;
    assistantCaptureProgress = 0;
    assistantAcceptedFrames = 0;

    if (resetState) {
      setPhase('idle');
      cameraError = undefined;
      statusOverride = '';
      resetMetrics();
      resetAssistantState(false);
    }
  }

  async function toggleNotifications(): Promise<void> {
    if (!canUseDeskPostureNotifications()) {
      notificationPermission = 'unsupported';
      cameraError = 'not-supported';
      statusOverride = DESK_POSTURE_ERROR_MESSAGES['not-supported'];
      return;
    }

    const permission = await requestDeskPostureNotificationPermission();
    notificationPermission = permission;
    if (permission === 'granted') {
      notificationEnabled = true;
      statusOverride = 'Browser notifications enabled.';
      cameraError = undefined;
      return;
    }

    notificationEnabled = false;
    cameraError = 'notification-denied';
    statusOverride = DESK_POSTURE_ERROR_MESSAGES['notification-denied'];
  }

  function toggleSoundAlerts(): void {
    soundAlertEnabled = !soundAlertEnabled;
  }

  function toggleMirrorPreview(): void {
    mirrorPreview = !mirrorPreview;
    persistSettings();
  }

  function toggleRememberBaseline(): void {
    rememberBaseline = !rememberBaseline;
    persistSettings();
  }

  function toggleUseSavedBaseline(): void {
    useSavedBaseline = !useSavedBaseline;
  }

  function setDevice(index: number): void {
    selectedDeviceIndex = index;
    selectedDeviceId = availableCameras[index]?.deviceId ?? '';
    if (cameraReady) {
      void restartCamera();
    }
  }

  async function restartCamera(): Promise<void> {
    await stopCamera(false);
    await startCamera(false);
  }

  function setSensitivity(next: DeskPostureSensitivity): void {
    selectedSensitivity = next;
    engine.setSensitivity(next);
    statusOverride = 'Sensitivity updated.';
  }

  function setAlertDelay(value: number): void {
    alertDelaySeconds = Math.max(60, Math.min(120, value));
  }

  function startSetupWizard(): void {
    if (!cameraReady) {
      void startCamera(true);
      return;
    }

    beginAssistant();
    setPhase('idle');
    assistantStatus = 'Review the checklist, then press Next step to capture your upright posture.';
    assistantStep = 'setup';
    statusOverride = assistantStatus;
  }

  async function processFrame(now: number): Promise<void> {
    if (!loopRunning || !videoEl) return;

    if (now - lastInferenceAt < 50) {
      rafId = requestAnimationFrame(processFrame);
      return;
    }

    lastInferenceAt = now;

    try {
      const detected = detector.detect(videoEl, now);
      const pose = detected.poses[0] ?? null;
      handleFrame(now, pose);
    } catch (error) {
      cameraError = mapDeskPostureError(error);
      statusOverride = DESK_POSTURE_ERROR_MESSAGES[cameraError];
      setPhase('error');
      stopLoop();
      return;
    }

    sessionSummary = engine.getSummary(now);

    rafId = requestAnimationFrame(processFrame);
  }

  function getCameraLabel(device: MediaDeviceInfo, index: number): string {
    return device.label || `Camera ${index + 1}`;
  }

  function onKeyToggle(event: KeyboardEvent, action: () => void): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  onDestroy(() => {
    stopLoop();
    if (stream) {
      void stopCamera(false);
    }
    detector.dispose();
  });
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description} This tool is designed for a side-view camera placed beside you.</p>
  </header>

  {#if !browserSupport}
    <section class="panel" aria-label="Unsupported environment">
      <h2>Browser support</h2>
      <p class="error">Browser API not supported.</p>
      <p>This tool needs camera APIs, a secure context, and a browser with pose tracking support.</p>
    </section>
  {:else}
    <div class="layout">
      <section class="panel preview-panel" aria-label="Live camera preview">
        <div class="preview-shell" class:mirrored={mirrorPreview}>
          <video bind:this={videoEl} autoplay playsinline muted></video>
          <canvas bind:this={overlayEl}></canvas>
        </div>
      </section>

      <div class="analysis-column">
        <section class="panel panel-subtle setup-guide" aria-label="Side-view setup guide">
          <div class="setup-header">
            <h2>Side-view setup</h2>
            <span class="setup-chip">Profile view required</span>
          </div>
          <p>Place the camera beside your body so it sees your left or right profile. This side view is required for forward head posture detection.</p>
          <ul>
            <li>Keep the camera around shoulder height.</li>
            <li>Keep your ear, shoulder, and hip visible in profile.</li>
            <li>Use the same side during calibration and monitoring.</li>
          </ul>
          {#if liveMetrics}
            <p class="helper">Current profile side: {liveMetrics.profileSide === 'unknown' ? 'Unknown' : liveMetrics.profileSide === 'left' ? 'Left profile' : 'Right profile'}</p>
          {/if}
        </section>

        <section class="panel panel-subtle setup-wizard" aria-label="Calibration setup wizard">
          <div class="setup-header">
            <h2>Calibration setup</h2>
            <span class="setup-chip">Step {assistantStepIndex + 1} of 4</span>
          </div>

          <div class="setup-progress" aria-hidden="true">
            <span style={`width:${Math.max(4, Math.round(assistantProgress * 100))}%`}></span>
          </div>

          <p class="setup-title">{assistantStepLabel}</p>
          <p>{assistantInstruction}</p>

          <div class="setup-actions">
            <button type="button" class="primary" on:click={startSetupWizard} disabled={assistantCaptureActive}>
              Start setup
            </button>
            <button type="button" on:click={goToNextAssistantStep} disabled={!cameraReady || assistantCaptureActive || assistantStep === 'review'}>
              Next step
            </button>
            <button type="button" on:click={retryAssistantStep} disabled={!cameraReady || assistantStep === 'setup' || assistantCaptureActive}>
              Retry step
            </button>
            <button type="button" on:click={backAssistantStep} disabled={!cameraReady || assistantStep === 'setup' || assistantCaptureActive}>
              Back
            </button>
            <button type="button" on:click={restartAssistant}>
              Restart setup
            </button>
            <button type="button" class="primary" on:click={finishAssistantCalibration} disabled={assistantStep !== 'review' || assistantComplete}>
              Finish calibration
            </button>
          </div>

          <p class="helper">Primary action: {assistantActionLabel}</p>
          <p class="helper">{assistantStatus}</p>
          {#if assistantCaptureActive}
            <p class="helper">Capture progress: {Math.round(assistantCaptureProgress * 100)}% · Accepted frames: {assistantAcceptedFrames}</p>
          {/if}

          <div class="checklist">
            <h3>Setup checklist</h3>
            <ul>
              <li>Camera at side view</li>
              <li>Sit upright first</li>
              <li>Then lean into a clearly bad posture</li>
              <li>Keep your body visible</li>
              <li>The bad posture should be noticeable, but not painful</li>
            </ul>
          </div>

          {#if setupIssueMessage}
            <div class="setup-warning" role="note">
              <p><strong>Calibration note:</strong> {setupIssueMessage}</p>
            </div>
          {/if}
        </section>

        <section class="panel controls" aria-label="Camera and posture controls">
          <div class="actions">
            <button type="button" class="primary" on:click={startSetupWizard} disabled={assistantCaptureActive}>
              Start setup
            </button>
            <button type="button" on:click={() => stopCamera()} disabled={!cameraReady}>
              Stop Camera
            </button>
          </div>

          {#if canSwitchCamera}
            <div class="field">
              <label for="camera-select">Camera</label>
              <select id="camera-select" bind:value={selectedDeviceIndex} on:change={(event) => setDevice(Number((event.currentTarget as HTMLSelectElement).value))}>
                {#each availableCameras as device, index}
                  <option value={index}>{getCameraLabel(device, index)}</option>
                {/each}
              </select>
            </div>
          {/if}

          <div class="actions toggles">
            <button type="button" class:active={selectedSensitivity === 'gentle'} on:click={() => setSensitivity('gentle')}>
              Gentle
            </button>
            <button type="button" class:active={selectedSensitivity === 'balanced'} on:click={() => setSensitivity('balanced')}>
              Balanced
            </button>
            <button type="button" class:active={selectedSensitivity === 'strict'} on:click={() => setSensitivity('strict')}>
              Strict
            </button>
          </div>

          <div class="field">
            <label for="alert-delay">Alert delay ({alertDelaySeconds}s)</label>
            <input id="alert-delay" type="range" min="60" max="120" step="5" bind:value={alertDelaySeconds} on:change={() => setAlertDelay(alertDelaySeconds)} />
          </div>

          <div class="actions toggles">
            <button type="button" class:active={notificationEnabled} on:click={toggleNotifications}>
              Browser notifications: {notificationEnabled ? 'On' : 'Off'}
            </button>
            <button type="button" class:active={soundAlertEnabled} on:click={toggleSoundAlerts}>
              Sound alert: {soundAlertEnabled ? 'On' : 'Off'}
            </button>
            <button type="button" class:active={mirrorPreview} on:click={toggleMirrorPreview}>
              Mirror preview (preview only): {mirrorPreview ? 'On' : 'Off'}
            </button>
          </div>

          <div class="actions toggles">
            <button type="button" class:active={rememberBaseline} on:click={toggleRememberBaseline}>
              Remember calibration locally: {rememberBaseline ? 'On' : 'Off'}
            </button>
            <button type="button" class:active={useSavedBaseline} on:click={toggleUseSavedBaseline} disabled={!savedBaseline && !savedCalibrationModel}>
              Use saved calibration: {useSavedBaseline ? 'On' : 'Off'}
            </button>
          </div>

          <p class="helper">Notifications permission: {notificationPermission}</p>
          <p class="helper">Pose model: {modelReady ? 'Loaded' : 'Loading…'}</p>
        </section>

        <section class="panel status-panel" aria-live="polite" aria-atomic="true" aria-label="Posture status">
          <div class="status-row">
            <span class="status-chip status-{statusLabel.toLowerCase().replace(/[^a-z]+/g, '-')}" aria-label={statusLabel}>{statusLabel}</span>
            <p class="status-message">{statusMessage}</p>
          </div>

          {#if cameraError}
            <p class="error">{DESK_POSTURE_ERROR_MESSAGES[cameraError]}</p>
          {/if}

          {#if setupIssueMessage}
            <div class="setup-warning" role="note">
              <p><strong>Setup issue:</strong> {setupIssueMessage}</p>
            </div>
          {/if}

          <div class="stats-grid">
            <div class="stat-box">
              <p class="label">Live posture score</p>
              <p class="value">{postureScore}</p>
              <div class="meter" aria-hidden="true">
                <span style={`width:${postureScore}%`}></span>
              </div>
            </div>
            <div class="stat-box">
              <p class="label">Current posture state</p>
              <p class="value">{postureState === 'good' ? 'Good' : postureState === 'slightly-off' ? 'Slightly off' : postureState === 'poor' ? 'Poor' : 'No person detected'}</p>
            </div>
            <div class="stat-box">
              <p class="label">Tracking confidence</p>
              <p class="value">{Math.round(postureConfidence * 100)}%</p>
            </div>
            <div class="stat-box">
              <p class="label">Side profile quality</p>
              <p class="value">{liveMetrics ? Math.round(liveMetrics.profileQuality * 100) : 0}%</p>
            </div>
            <div class="stat-box">
              <p class="label">Warnings</p>
              <p class="value">{warningEvents}</p>
            </div>
          </div>

          <div class="metric-grid">
            <div class="metric-item">
              <p class="label">Head forward</p>
              <p>{liveMetrics ? liveMetrics.headForward.toFixed(2) : '—'}</p>
            </div>
            <div class="metric-item">
              <p class="label">Neck tilt</p>
              <p>{liveMetrics ? liveMetrics.neckTilt.toFixed(2) : '—'}</p>
            </div>
            <div class="metric-item">
              <p class="label">Shoulder imbalance</p>
              <p>{liveMetrics ? liveMetrics.shoulderImbalance.toFixed(2) : '—'}</p>
            </div>
            <div class="metric-item">
              <p class="label">Torso lean</p>
              <p>{liveMetrics ? liveMetrics.torsoLean.toFixed(2) : '—'}</p>
            </div>
            <div class="metric-item">
              <p class="label">Camera spacing</p>
              <p>{liveMetrics ? liveMetrics.cameraScale.toFixed(2) : '—'}</p>
            </div>
            <div class="metric-item">
              <p class="label">Profile side</p>
              <p>{liveMetrics ? (liveMetrics.profileSide === 'unknown' ? 'Unknown' : liveMetrics.profileSide === 'left' ? 'Left' : 'Right') : '—'}</p>
            </div>
          </div>

          <div class="timeline" aria-hidden="true">
            {#each timeline as value}
              <span style={`height:${Math.max(4, Math.round(value))}%`}></span>
            {/each}
          </div>
        </section>

        <section class="panel panel-subtle" aria-label="Session summary">
          <h2>Session summary</h2>
          <div class="summary-grid">
            <div>
              <p class="label">Good posture percentage</p>
              <p class="summary-value">{sessionSummary.goodPosturePercentage}%</p>
            </div>
            <div>
              <p class="label">Total warning events</p>
              <p class="summary-value">{sessionSummary.warningEvents}</p>
            </div>
            <div>
              <p class="label">Longest poor streak</p>
              <p class="summary-value">{Math.round(sessionSummary.longestPoorStreakMs / 1000)}s</p>
            </div>
            <div>
              <p class="label">Session duration</p>
              <p class="summary-value">{Math.round(sessionSummary.sessionDurationMs / 1000)}s</p>
            </div>
          </div>
        </section>

        {#if assistantStep === 'review' || assistantReviewMessage}
          <section class="panel panel-subtle calibration-review" aria-label="Calibration review">
            <div class="setup-header">
              <h2>Review and finalize</h2>
              <span class="setup-chip">Ready to finish</span>
            </div>
            <p>{assistantReviewMessage || 'Review the learned upright and slouched profiles before finalizing.'}</p>
            <div class="comparison-grid">
              <div class="comparison-card good">
                <p class="label">Upright posture</p>
                <p class="summary-value">{neutralValidation?.summary.sampleCount ?? neutralSamples.length} frames</p>
                <p class="helper">Confidence: {Math.round((neutralValidation?.summary.confidence ?? 0) * 100)}%</p>
                <p class="helper">Noise: {(neutralValidation?.summary.noise ?? 0).toFixed(2)}</p>
              </div>
              <div class="comparison-card bad">
                <p class="label">Slouched posture</p>
                <p class="summary-value">{slouchedValidation?.summary.sampleCount ?? slouchedSamples.length} frames</p>
                <p class="helper">Confidence: {Math.round((slouchedValidation?.summary.confidence ?? 0) * 100)}%</p>
                <p class="helper">Noise: {(slouchedValidation?.summary.noise ?? 0).toFixed(2)}</p>
              </div>
            </div>
            {#if calibrationComparison}
              <div class="comparison-grid">
                <div class="comparison-card">
                  <p class="label">Head forward delta</p>
                  <p class="summary-value">{calibrationComparison.headForwardDelta.toFixed(2)}</p>
                </div>
                <div class="comparison-card">
                  <p class="label">Neck tilt delta</p>
                  <p class="summary-value">{calibrationComparison.neckTiltDelta.toFixed(2)}</p>
                </div>
                <div class="comparison-card">
                  <p class="label">Shoulder delta</p>
                  <p class="summary-value">{calibrationComparison.shoulderImbalanceDelta.toFixed(2)}</p>
                </div>
                <div class="comparison-card">
                  <p class="label">Torso delta</p>
                  <p class="summary-value">{calibrationComparison.torsoLeanDelta.toFixed(2)}</p>
                </div>
              </div>
              <p class="helper">Learned separation score: {calibrationComparison.separation.toFixed(2)}</p>
            {/if}
          </section>
        {/if}

        <section class="panel panel-subtle" aria-label="Privacy note">
          <p><strong>Privacy:</strong> Video is processed locally in your browser. No video is uploaded. You can stop camera anytime. Raw landmarks stay local and are not sent to remote services.</p>
        </section>

        <section class="panel tips" aria-label="Coaching tips">
          <h2>Coaching tips</h2>
          <ul>
            <li>Keep ears aligned over shoulders</li>
            <li>Keep chin slightly tucked</li>
            <li>Avoid leaning the head toward the screen</li>
            <li>Keep the upper back tall</li>
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

  .tool-header {
    display: grid;
    gap: var(--space-1);
  }

  .layout {
    display: grid;
    gap: var(--space-2);
  }

  .analysis-column {
    display: grid;
    gap: var(--space-2);
    align-content: start;
  }

  .setup-guide,
  .setup-wizard,
  .calibration-review {
    display: grid;
    gap: var(--space-1);
  }

  .setup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
  }

  .setup-chip {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 11px;
    color: var(--text-muted);
    background: var(--surface);
    white-space: nowrap;
  }

  .setup-title {
    font-weight: 700;
    color: var(--text-primary);
  }

  .setup-progress {
    height: 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    overflow: hidden;
    background: var(--surface);
  }

  .setup-progress span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #587b9c 0%, var(--accent) 100%);
    transition: width 180ms ease;
  }

  .setup-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-half);
  }

  .setup-actions button {
    flex: 1 1 auto;
  }

  .checklist {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-subtle);
    padding: var(--space-1);
    display: grid;
    gap: var(--space-half);
  }

  .checklist h3 {
    font-size: 13px;
    font-weight: 700;
  }

  .checklist ul {
    margin: 0;
    padding-left: 20px;
    display: grid;
    gap: var(--space-half);
    color: var(--text-muted);
    font-size: 13px;
  }

  .setup-warning {
    border: 1px solid rgba(232, 178, 86, 0.45);
    border-radius: var(--radius);
    background: rgba(232, 178, 86, 0.1);
    padding: var(--space-1);
    color: var(--text-primary);
  }

  .comparison-grid {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .comparison-card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-subtle);
    padding: var(--space-1);
    display: grid;
    gap: var(--space-half);
  }

  .comparison-card.good {
    border-color: rgba(163, 230, 53, 0.4);
  }

  .comparison-card.bad {
    border-color: rgba(239, 68, 68, 0.35);
  }

  .preview-shell {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #000;
  }

  .preview-shell video,
  .preview-shell canvas {
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
  .preview-shell.mirrored canvas {
    transform: scaleX(-1);
  }

  .status-panel,
  .controls {
    display: grid;
    gap: var(--space-2);
  }

  .status-row {
    display: grid;
    gap: var(--space-1);
  }

  .status-chip {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid var(--border);
    background: var(--surface-subtle);
    color: var(--text-primary);
  }

  .status-message {
    color: var(--text-muted);
    font-size: 13px;
  }

  .stats-grid,
  .summary-grid,
  .metric-grid {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-box,
  .metric-item {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-subtle);
    padding: var(--space-1);
    display: grid;
    gap: var(--space-half);
  }

  .label {
    color: var(--text-muted);
    font-size: 12px;
  }

  .value,
  .summary-value {
    font-size: 18px;
    font-weight: 700;
  }

  .meter {
    height: 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    overflow: hidden;
    background: var(--surface);
  }

  .meter span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #4f7d4f 0%, var(--accent) 100%);
    transition: width 120ms linear;
  }

  .timeline {
    min-height: 72px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-1);
    display: flex;
    align-items: end;
    gap: 2px;
    background: var(--surface-subtle);
    overflow: hidden;
  }

  .timeline span {
    flex: 1 1 0;
    min-height: 4px;
    border-radius: 2px;
    background: rgba(163, 230, 53, 0.8);
  }

  .helper {
    font-size: 12px;
    color: var(--text-muted);
  }

  .tips ul {
    margin: 0;
    padding-left: 20px;
    display: grid;
    gap: var(--space-half);
  }

  @media (min-width: 1024px) {
    .layout {
      grid-template-columns: minmax(0, 1.25fr) minmax(360px, 0.75fr);
      align-items: start;
    }

    .preview-shell {
      aspect-ratio: auto;
      height: clamp(440px, 64vh, 720px);
    }

    .analysis-column {
      max-height: clamp(440px, 64vh, 720px);
      overflow: auto;
      padding-right: 2px;
    }
  }

  @media (max-width: 900px) {
    .stats-grid,
    .summary-grid,
    .metric-grid,
    .comparison-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
