<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy } from 'svelte';
  import type { Tool } from '$lib/types';
  import {
    ClapDetector,
    METER_ERROR_MESSAGES,
    canTransitionMeterState,
    getMeterStateLabel,
    getMeterStateMessage,
    type ClapDetectionResult,
    type MeterState,
    type MicError,
    type SensitivityPreset
  } from '$lib/utils/applause-meter';
  import { ApplauseAudioRuntime, mapRuntimeStartError, type AudioFrameMetrics } from '$lib/utils/applause-audio';

  export let tool: Tool;

  let runtime: ApplauseAudioRuntime | null = null;
  let meterState: MeterState = 'idle';
  let micError: MicError | undefined;
  let statusOverride = '';

  let sensitivity: SensitivityPreset = 'medium';
  let crowdMode = false;
  let detector = new ClapDetector({ preset: sensitivity, crowdMode });

  let liveLevel = 0;
  let clapsPerMinute = 0;
  let sessionMaxPeak = 0;
  let score = 0;
  let clapCount = 0;
  let noiseFloor = 0;
  let threshold = 0;
  let transient = 0;
  let peakHold = 0;
  let timeline: number[] = [];

  let activeDeviceId = '';
  let devicesCount = 0;
  let usingWorklet = false;

  let summaryVisible = false;
  let summary = {
    clapCount: 0,
    maxScore: 0,
    maxPeak: 0,
    maxCpm: 0
  };

  let calibrationSamples: number[] = [];
  let uiRafId: number | null = null;
  let pendingResult: ClapDetectionResult | null = null;

  $: statusLabel = getMeterStateLabel(meterState);
  $: statusMessage = statusOverride || getMeterStateMessage(meterState, micError);
  $: browserSupport = hasSupportedEnvironment();

  function hasSupportedEnvironment(): boolean {
    if (!browser) return false;
    if (!window.isSecureContext && !isLocalhost()) return false;
    const hasAudioContext = typeof window.AudioContext !== 'undefined' || typeof (window as Window & { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined';
    const hasGetUserMedia = typeof navigator.mediaDevices?.getUserMedia === 'function';
    return hasGetUserMedia && hasAudioContext;
  }

  function isLocalhost(): boolean {
    if (!browser) return false;
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  }

  function setMeterState(next: MeterState): void {
    if (canTransitionMeterState(meterState, next) || meterState === next) {
      meterState = next;
    } else {
      meterState = next;
    }
  }

  function updateSummary(result: ClapDetectionResult): void {
    summary.clapCount = result.clapCount;
    summary.maxScore = Math.max(summary.maxScore, result.score);
    summary.maxPeak = Math.max(summary.maxPeak, result.sessionMaxPeak);
    summary.maxCpm = Math.max(summary.maxCpm, result.clapsPerMinute);
  }

  function applyResult(result: ClapDetectionResult): void {
    liveLevel = result.liveLevel;
    clapsPerMinute = result.clapsPerMinute;
    sessionMaxPeak = result.sessionMaxPeak;
    score = result.score;
    clapCount = result.clapCount;
    noiseFloor = result.noiseFloor;
    threshold = result.threshold;
    transient = result.transient;
    peakHold = result.peakHold;
    timeline = result.timeline;
    updateSummary(result);
  }

  function flushResultFrame(): void {
    uiRafId = null;
    if (!pendingResult) return;
    applyResult(pendingResult);
    pendingResult = null;
  }

  function queueResult(result: ClapDetectionResult): void {
    pendingResult = result;
    if (uiRafId !== null) return;
    uiRafId = requestAnimationFrame(flushResultFrame);
  }

  function resetVisibleMetrics(): void {
    liveLevel = 0;
    clapsPerMinute = 0;
    sessionMaxPeak = 0;
    score = 0;
    clapCount = 0;
    noiseFloor = 0;
    threshold = 0;
    transient = 0;
    peakHold = 0;
    timeline = [];
  }

  function resetSummary(): void {
    summary = {
      clapCount: 0,
      maxScore: 0,
      maxPeak: 0,
      maxCpm: 0
    };
    summaryVisible = false;
  }

  function handleFrame(frame: AudioFrameMetrics): void {
    calibrationSamples.push(frame.rms);
    if (calibrationSamples.length > 180) {
      calibrationSamples.shift();
    }

    const result = detector.update({
      timestampMs: frame.timestampMs,
      rms: frame.rms,
      peak: frame.peak
    });
    queueResult(result);
  }

  async function startListening(): Promise<void> {
    if (!browserSupport) {
      micError = 'not-supported';
      statusOverride = METER_ERROR_MESSAGES['not-supported'];
      setMeterState('mic-error');
      return;
    }

    if (meterState === 'listening' || meterState === 'requesting-permission') {
      return;
    }

    setMeterState('requesting-permission');
    micError = undefined;
    statusOverride = '';
    summaryVisible = false;

    if (!runtime) {
      runtime = new ApplauseAudioRuntime();
    }

    try {
      const info = await runtime.start(
        {
          onFrame: handleFrame,
          onInterrupted: () => {
            micError = 'stream-interrupted';
            statusOverride = METER_ERROR_MESSAGES['stream-interrupted'];
            setMeterState('mic-error');
          },
          onError: (error) => {
            micError = error;
            statusOverride = METER_ERROR_MESSAGES[error];
            setMeterState(error === 'permission-denied' ? 'permission-denied' : 'mic-error');
          }
        },
        { deviceId: activeDeviceId || undefined }
      );

      usingWorklet = info.usingWorklet;
      devicesCount = info.devices.length;
      activeDeviceId = info.activeDeviceId ?? activeDeviceId;
      setMeterState('listening');
      statusOverride = '';
    } catch (error) {
      const mapped = mapRuntimeStartError(error);
      micError = mapped;
      statusOverride = METER_ERROR_MESSAGES[mapped];
      setMeterState(mapped === 'permission-denied' ? 'permission-denied' : 'mic-error');
      await stopListening(false);
    }
  }

  async function stopListening(showSummary: boolean = true): Promise<void> {
    if (runtime) {
      await runtime.stop();
    }

    if (uiRafId !== null) {
      cancelAnimationFrame(uiRafId);
      uiRafId = null;
    }
    pendingResult = null;

    if (showSummary && summary.clapCount > 0) {
      summaryVisible = true;
    }

    setMeterState('idle');
  }

  function resetSession(): void {
    detector.resetSession();
    resetVisibleMetrics();
    resetSummary();
    statusOverride = '';
  }

  function calibrateNoiseFloor(): void {
    detector.calibrateNoiseFloor(calibrationSamples);
    calibrationSamples = [];
    statusOverride = 'Noise floor calibrated.';
    window.setTimeout(() => {
      if (meterState === 'listening') {
        statusOverride = '';
      }
    }, 1400);
  }

  function setSensitivity(next: SensitivityPreset): void {
    sensitivity = next;
    detector.setPreset(next);
  }

  function toggleCrowdMode(): void {
    crowdMode = !crowdMode;
    detector.setCrowdMode(crowdMode);
  }

  onDestroy(() => {
    if (uiRafId !== null) {
      cancelAnimationFrame(uiRafId);
      uiRafId = null;
    }
    if (runtime) {
      void runtime.dispose();
      runtime = null;
    }
  });
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  {#if !browserSupport}
    <section class="panel" aria-label="Unsupported browser">
      <h2>Browser support</h2>
      <p class="error">Unsupported browser APIs.</p>
      <p>This tool needs microphone access, AudioContext, and a secure context (HTTPS or localhost).</p>
    </section>
  {:else}
    <div class="layout">
      <section class="panel monitor" aria-label="Live applause monitor">
        <div class="status-line" aria-live="polite" aria-atomic="true">
          <p><strong>Status:</strong> {statusLabel}</p>
          <p><strong>State:</strong> {statusMessage}</p>
        </div>

        <div class="meter-wrap" role="img" aria-label={`Applause score ${score} out of 100`}>
          <div class="meter-track">
            <span class="meter-fill" style={`width:${score}%`}></span>
            <span class="peak-hold" style={`left:${Math.round(peakHold * 100)}%`}></span>
          </div>
          <p class="meter-value">Score {score}/100</p>
        </div>

        <div class="timeline" aria-hidden="true">
          {#each timeline as point}
            <span style={`height:${Math.max(6, Math.round(point * 100))}%`}></span>
          {/each}
        </div>

        <div class="stats-grid">
          <div class="stat-box">
            <p class="label">Live applause level</p>
            <p class="value">{Math.round(liveLevel * 100)}%</p>
          </div>
          <div class="stat-box">
            <p class="label">Claps per minute</p>
            <p class="value">{clapsPerMinute}</p>
          </div>
          <div class="stat-box">
            <p class="label">Session max peak</p>
            <p class="value">{Math.round(sessionMaxPeak * 100)}%</p>
          </div>
          <div class="stat-box">
            <p class="label">Detected claps</p>
            <p class="value">{clapCount}</p>
          </div>
          <div class="stat-box subtle">
            <p class="label">Noise floor</p>
            <p class="value small">{Math.round(noiseFloor * 100)}%</p>
          </div>
          <div class="stat-box subtle">
            <p class="label">Threshold</p>
            <p class="value small">{Math.round(threshold * 100)}%</p>
          </div>
        </div>
      </section>

      <div class="side-column">
        <section class="panel controls" aria-label="Microphone controls">
          <div class="actions">
            <button type="button" class="primary" on:click={startListening} disabled={meterState === 'requesting-permission' || meterState === 'listening'}>
              Start Listening
            </button>
            <button type="button" on:click={() => stopListening()} disabled={meterState !== 'listening'}>
              Stop Listening
            </button>
            <button type="button" on:click={resetSession}>
              Reset Session
            </button>
          </div>

          <div class="actions">
            <button type="button" class:active={sensitivity === 'low'} on:click={() => setSensitivity('low')}>
              Low
            </button>
            <button type="button" class:active={sensitivity === 'medium'} on:click={() => setSensitivity('medium')}>
              Medium
            </button>
            <button type="button" class:active={sensitivity === 'high'} on:click={() => setSensitivity('high')}>
              High
            </button>
          </div>

          <div class="actions">
            <button type="button" on:click={calibrateNoiseFloor}>
              Calibrate noise floor
            </button>
            <button type="button" class:active={crowdMode} on:click={toggleCrowdMode}>
              Crowd mode: {crowdMode ? 'On' : 'Off'}
            </button>
          </div>

          <p class="helper">Sensitivity preset: {sensitivity}</p>
          <p class="helper">Processing mode: {usingWorklet ? 'AudioWorklet' : 'ScriptProcessor fallback'}</p>
          <p class="helper">Detected microphones: {devicesCount}</p>
          {#if transient > 0}
            <p class="helper">Transient strength: {transient.toFixed(3)}</p>
          {/if}
        </section>

        {#if summaryVisible}
          <section class="panel panel-subtle" aria-label="Session summary">
            <h2>Session summary</h2>
            <p>Claps detected: <strong>{summary.clapCount}</strong></p>
            <p>Max score: <strong>{summary.maxScore}</strong></p>
            <p>Max peak: <strong>{Math.round(summary.maxPeak * 100)}%</strong></p>
            <p>Max claps per minute: <strong>{summary.maxCpm}</strong></p>
          </section>
        {/if}

        <section class="panel panel-subtle" aria-label="Privacy note">
          <p><strong>Privacy:</strong> Audio is processed locally in your browser.</p>
        </section>

        <section class="panel" aria-label="Tips for best results">
          <h2>Tips for best results</h2>
          <ul>
            <li>Quiet room</li>
            <li>Keep mic unobstructed</li>
            <li>Avoid music playback nearby</li>
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

  .side-column {
    display: grid;
    gap: var(--space-2);
    align-content: start;
  }

  .status-line {
    display: grid;
    gap: var(--space-half);
  }

  .meter-wrap {
    display: grid;
    gap: var(--space-1);
  }

  .meter-track {
    position: relative;
    height: 18px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface-subtle);
    overflow: hidden;
  }

  .meter-fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #5ea95c 0%, var(--accent) 100%);
    transition: width 90ms linear;
  }

  .peak-hold {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #e8b256;
    transform: translateX(-1px);
  }

  .meter-value {
    font-size: 13px;
    color: var(--text-muted);
  }

  .timeline {
    min-height: 72px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-subtle);
    display: flex;
    align-items: end;
    gap: 2px;
    padding: var(--space-1);
    overflow: hidden;
  }

  .timeline span {
    flex: 1 1 0;
    min-height: 4px;
    border-radius: 2px;
    background: rgba(163, 230, 53, 0.75);
  }

  .stats-grid {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-box {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-subtle);
    padding: var(--space-1);
    display: grid;
    gap: var(--space-half);
  }

  .stat-box.subtle {
    opacity: 0.92;
  }

  .label {
    color: var(--text-muted);
    font-size: 12px;
  }

  .value {
    font-size: 20px;
    font-weight: 700;
  }

  .value.small {
    font-size: 16px;
  }

  .controls {
    display: grid;
    gap: var(--space-1);
  }

  ul {
    margin: 0;
    padding-left: 20px;
    display: grid;
    gap: var(--space-half);
  }

  @media (min-width: 980px) {
    .layout {
      grid-template-columns: minmax(0, 1.3fr) minmax(340px, 0.7fr);
      align-items: start;
    }
  }

  @media (max-width: 640px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    .value {
      font-size: 18px;
    }
  }
</style>
