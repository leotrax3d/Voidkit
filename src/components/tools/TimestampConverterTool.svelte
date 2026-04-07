<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import { onMount } from 'svelte';

  export let tool: Tool;

  let unixInput = '';
  let utcOutput = '';
  let localOutput = '';
  let relativeOutput = '';
  let unixError = '';

  let humanDate = '';
  let humanTime = '';
  let humanUnixSeconds = '';
  let humanUnixMilliseconds = '';
  let humanError = '';

  let currentUtc = '';
  let currentLocal = '';
  let currentUnixSeconds = '';
  let currentUnixMilliseconds = '';

  let copyMessage = '';
  let timer: ReturnType<typeof setInterval> | undefined;

  function pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  function formatDateInput(date: Date): string {
    return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
  }

  function formatTimeInput(date: Date): string {
    return [pad(date.getHours()), pad(date.getMinutes())].join(':');
  }

  function formatDateTime(date: Date, useUtc: boolean): string {
    const year = useUtc ? date.getUTCFullYear() : date.getFullYear();
    const month = pad((useUtc ? date.getUTCMonth() : date.getMonth()) + 1);
    const day = pad(useUtc ? date.getUTCDate() : date.getDate());
    const hours = pad(useUtc ? date.getUTCHours() : date.getHours());
    const minutes = pad(useUtc ? date.getUTCMinutes() : date.getMinutes());
    const seconds = pad(useUtc ? date.getUTCSeconds() : date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${useUtc ? 'UTC' : 'Local'}`;
  }

  function formatRelativeTime(target: Date, reference: Date): string {
    const deltaSeconds = Math.round((target.getTime() - reference.getTime()) / 1000);

    if (Math.abs(deltaSeconds) < 5) {
      return 'just now';
    }

    const thresholds: Array<[Intl.RelativeTimeFormatUnit, number]> = [
      ['year', 31536000],
      ['month', 2592000],
      ['week', 604800],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
      ['second', 1]
    ];

    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

    for (const [unit, secondsPerUnit] of thresholds) {
      if (Math.abs(deltaSeconds) >= secondsPerUnit || unit === 'second') {
        const value = Math.round(deltaSeconds / secondsPerUnit);
        return formatter.format(value, unit);
      }
    }

    return 'just now';
  }

  function detectUnixMilliseconds(value: number): number {
    return Math.abs(value) >= 1_000_000_000_000 ? value : value * 1000;
  }

  function updateUnixOutputs(): void {
    const trimmed = unixInput.trim();

    if (trimmed.length === 0) {
      utcOutput = '';
      localOutput = '';
      relativeOutput = '';
      unixError = '';
      return;
    }

    const parsed = Number(trimmed);

    if (!Number.isFinite(parsed)) {
      utcOutput = '';
      localOutput = '';
      relativeOutput = '';
      unixError = 'Enter a valid Unix timestamp.';
      return;
    }

    const date = new Date(detectUnixMilliseconds(parsed));

    if (Number.isNaN(date.getTime())) {
      utcOutput = '';
      localOutput = '';
      relativeOutput = '';
      unixError = 'Enter a valid Unix timestamp.';
      return;
    }

    utcOutput = formatDateTime(date, true);
    localOutput = formatDateTime(date, false);
    relativeOutput = formatRelativeTime(date, new Date());
    unixError = '';
  }

  function updateHumanOutputs(): void {
    if (humanDate.length === 0 || humanTime.length === 0) {
      humanUnixSeconds = '';
      humanUnixMilliseconds = '';
      humanError = '';
      return;
    }

    const date = new Date(`${humanDate}T${humanTime}`);

    if (Number.isNaN(date.getTime())) {
      humanUnixSeconds = '';
      humanUnixMilliseconds = '';
      humanError = 'Select a valid date and time.';
      return;
    }

    humanUnixSeconds = String(Math.floor(date.getTime() / 1000));
    humanUnixMilliseconds = String(date.getTime());
    humanError = '';
  }

  function updateCurrentOutputs(): void {
    const now = new Date();
    currentUtc = formatDateTime(now, true);
    currentLocal = formatDateTime(now, false);
    currentUnixSeconds = String(Math.floor(now.getTime() / 1000));
    currentUnixMilliseconds = String(now.getTime());
  }

  function useCurrentTime(): void {
    unixInput = String(Date.now());
    updateUnixOutputs();
    copyMessage = '';
  }

  async function copyValue(value: string): Promise<void> {
    if (!browser || value.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      copyMessage = 'Copied.';
    } catch {
      copyMessage = 'Copy failed.';
    }
  }

  async function copyUnixSummary(): Promise<void> {
    if (!browser || utcOutput.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText([utcOutput, localOutput, relativeOutput].join('\n'));
      copyMessage = 'Copied.';
    } catch {
      copyMessage = 'Copy failed.';
    }
  }

  onMount(() => {
    const now = new Date();
    humanDate = formatDateInput(now);
    humanTime = formatTimeInput(now);
    updateUnixOutputs();
    updateHumanOutputs();
    updateCurrentOutputs();

    timer = setInterval(() => {
      updateCurrentOutputs();
    }, 1000);

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  });

  $: if (browser) {
    unixInput;
    updateUnixOutputs();
  }

  $: if (browser) {
    humanDate;
    humanTime;
    updateHumanOutputs();
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel" aria-label="Unix to human conversion">
    <div class="section-head">
      <h2>Unix → Human</h2>
      <button type="button" on:click={useCurrentTime}>Use current time</button>
    </div>

    <label for="unix-input">Unix timestamp</label>
    <input id="unix-input" type="text" inputmode="numeric" bind:value={unixInput} placeholder="Seconds or milliseconds" />

    {#if unixError}
      <p class="error">{unixError}</p>
    {:else if utcOutput}
      <div class="output-grid">
        <article class="output-card">
          <span class="label">UTC datetime</span>
          <span class="value">{utcOutput}</span>
        </article>

        <article class="output-card">
          <span class="label">Local datetime</span>
          <span class="value">{localOutput}</span>
        </article>

        <article class="output-card">
          <span class="label">Relative time</span>
          <span class="value">{relativeOutput}</span>
        </article>
      </div>
    {:else}
      <p class="muted">Enter a Unix timestamp to see the date.</p>
    {/if}

    <div class="actions">
      <button class="primary" type="button" on:click={copyUnixSummary} disabled={utcOutput.length === 0}>Copy result</button>
    </div>
  </section>

  <section class="panel" aria-label="Human to Unix conversion">
    <div class="section-head">
      <h2>Human → Unix</h2>
      <span class="muted">Local timezone</span>
    </div>

    <div class="human-inputs">
      <div class="field">
        <label for="human-date">Date</label>
        <input id="human-date" type="date" bind:value={humanDate} />
      </div>

      <div class="field">
        <label for="human-time">Time</label>
        <input id="human-time" type="time" bind:value={humanTime} step="1" />
      </div>
    </div>

    {#if humanError}
      <p class="error">{humanError}</p>
    {:else}
      <div class="output-grid two-columns">
        <article class="output-card">
          <span class="label">Unix seconds</span>
          <span class="value">{humanUnixSeconds || '—'}</span>
          <button type="button" on:click={() => copyValue(humanUnixSeconds)} disabled={humanUnixSeconds.length === 0}>Copy</button>
        </article>

        <article class="output-card">
          <span class="label">Unix milliseconds</span>
          <span class="value">{humanUnixMilliseconds || '—'}</span>
          <button type="button" on:click={() => copyValue(humanUnixMilliseconds)} disabled={humanUnixMilliseconds.length === 0}>Copy</button>
        </article>
      </div>
    {/if}
  </section>

  <section class="panel" aria-label="Current time display">
    <div class="section-head">
      <h2>Current Time</h2>
      <span class="muted">Live updates every second</span>
    </div>

    <div class="output-grid">
      <article class="output-card">
        <span class="label">UTC</span>
        <span class="value">{currentUtc}</span>
        <button type="button" on:click={() => copyValue(currentUtc)}>Copy</button>
      </article>

      <article class="output-card">
        <span class="label">Local</span>
        <span class="value">{currentLocal}</span>
        <button type="button" on:click={() => copyValue(currentLocal)}>Copy</button>
      </article>

      <article class="output-card">
        <span class="label">Unix seconds</span>
        <span class="value">{currentUnixSeconds}</span>
        <button type="button" on:click={() => copyValue(currentUnixSeconds)}>Copy</button>
      </article>

      <article class="output-card">
        <span class="label">Unix ms</span>
        <span class="value">{currentUnixMilliseconds}</span>
        <button type="button" on:click={() => copyValue(currentUnixMilliseconds)}>Copy</button>
      </article>
    </div>

    <p class="copy-status">{copyMessage}</p>
  </section>
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 1120px;
  }

  .tool-header {
    display: grid;
    gap: var(--space-1);
  }

  .divider {
    height: 1px;
    background: var(--border);
  }

  .panel {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .human-inputs,
  .output-grid {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .output-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .two-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field {
    display: grid;
    gap: var(--space-1);
  }

  input {
    width: 100%;
  }

  .output-card {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #111111;
  }

  .label {
    color: var(--text-muted);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .value {
    color: var(--text-primary);
    font-size: 15px;
    word-break: break-word;
  }

  .actions {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .primary {
    border-color: var(--accent);
    color: var(--accent);
  }

  .error {
    color: #f08b8b;
    font-size: 14px;
  }

  .muted {
    color: var(--text-muted);
    font-size: 14px;
  }

  .copy-status {
    color: var(--accent);
    min-height: 21px;
  }

  h1 {
    font-size: 24px;
  }

  h2 {
    font-size: 16px;
  }

  p,
  label {
    color: var(--text-muted);
    font-size: 14px;
  }

  @media (max-width: 900px) {
    .human-inputs,
    .output-grid {
      grid-template-columns: 1fr;
    }
  }
</style>