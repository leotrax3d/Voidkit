<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';

  export let tool: Tool;

  let mode1Percent = '';
  let mode1Value = '';
  let mode1Result = '';
  let mode1CopyMessage = '';

  let mode2Value = '';
  let mode2Total = '';
  let mode2Result = '';
  let mode2Error = '';
  let mode2CopyMessage = '';

  let mode3Original = '';
  let mode3New = '';
  let mode3Result = '';
  let mode3Trend: 'increase' | 'decrease' | 'none' | '' = '';
  let mode3Error = '';
  let mode3CopyMessage = '';

  function parseInput(value: string): number | undefined {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return '—';
    }

    const rounded = Number(value.toFixed(6));
    if (Number.isInteger(rounded)) {
      return String(rounded);
    }

    return rounded.toString().replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
  }

  function formatPercent(value: number): string {
    return `${formatNumber(value)}%`;
  }

  function updateMode1(): void {
    const percent = parseInput(mode1Percent);
    const value = parseInput(mode1Value);

    if (percent === undefined || value === undefined) {
      mode1Result = '';
      return;
    }

    mode1Result = formatNumber((percent / 100) * value);
    mode1CopyMessage = '';
  }

  function updateMode2(): void {
    const value = parseInput(mode2Value);
    const total = parseInput(mode2Total);

    if (value === undefined || total === undefined) {
      mode2Result = '';
      mode2Error = '';
      return;
    }

    if (total === 0) {
      mode2Result = '';
      mode2Error = 'Y must not be zero.';
      return;
    }

    mode2Result = formatPercent((value / total) * 100);
    mode2Error = '';
    mode2CopyMessage = '';
  }

  function updateMode3(): void {
    const original = parseInput(mode3Original);
    const next = parseInput(mode3New);

    if (original === undefined || next === undefined) {
      mode3Result = '';
      mode3Trend = '';
      mode3Error = '';
      return;
    }

    if (original === 0) {
      mode3Result = '';
      mode3Trend = '';
      mode3Error = 'Original value must not be zero.';
      return;
    }

    const change = ((next - original) / original) * 100;

    if (change > 0) {
      mode3Trend = 'increase';
    } else if (change < 0) {
      mode3Trend = 'decrease';
    } else {
      mode3Trend = 'none';
    }

    mode3Result = `${change >= 0 ? '+' : ''}${formatPercent(change)}`;
    mode3Error = '';
    mode3CopyMessage = '';
  }

  async function copyValue(value: string, target: 'mode1' | 'mode2' | 'mode3'): Promise<void> {
    if (!browser || value.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);

      if (target === 'mode1') {
        mode1CopyMessage = 'Copied.';
      } else if (target === 'mode2') {
        mode2CopyMessage = 'Copied.';
      } else {
        mode3CopyMessage = 'Copied.';
      }
    } catch {
      if (target === 'mode1') {
        mode1CopyMessage = 'Copy failed.';
      } else if (target === 'mode2') {
        mode2CopyMessage = 'Copy failed.';
      } else {
        mode3CopyMessage = 'Copy failed.';
      }
    }
  }

  function clearMode1(): void {
    mode1Percent = '';
    mode1Value = '';
    mode1Result = '';
    mode1CopyMessage = '';
  }

  function clearMode2(): void {
    mode2Value = '';
    mode2Total = '';
    mode2Result = '';
    mode2Error = '';
    mode2CopyMessage = '';
  }

  function clearMode3(): void {
    mode3Original = '';
    mode3New = '';
    mode3Result = '';
    mode3Trend = '';
    mode3Error = '';
    mode3CopyMessage = '';
  }

  $: if (browser) {
    mode1Percent;
    mode1Value;
    updateMode1();
  }

  $: if (browser) {
    mode2Value;
    mode2Total;
    updateMode2();
  }

  $: if (browser) {
    mode3Original;
    mode3New;
    updateMode3();
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="cards-grid">
    <article class="panel calc-card" aria-label="What is X percent of Y calculator">
      <div class="card-head">
        <h2>What is X% of Y?</h2>
        <button type="button" on:click={clearMode1}>Clear</button>
      </div>

      <div class="field-grid">
        <div class="field">
          <label for="mode1-percent">X (percent)</label>
          <input id="mode1-percent" type="text" inputmode="decimal" bind:value={mode1Percent} />
        </div>

        <div class="field">
          <label for="mode1-value">Y (number)</label>
          <input id="mode1-value" type="text" inputmode="decimal" bind:value={mode1Value} />
        </div>
      </div>

      <div class="result-box" aria-live="polite">
        <span class="label">Result</span>
        <span class="value">{mode1Result || '—'}</span>
      </div>

      <div class="actions">
        <button class="primary" type="button" on:click={() => copyValue(mode1Result, 'mode1')} disabled={mode1Result.length === 0}>Copy result</button>
      </div>

      <p class="copy-status">{mode1CopyMessage}</p>
    </article>

    <article class="panel calc-card" aria-label="X is what percent of Y calculator">
      <div class="card-head">
        <h2>X is what % of Y?</h2>
        <button type="button" on:click={clearMode2}>Clear</button>
      </div>

      <div class="field-grid">
        <div class="field">
          <label for="mode2-value">X (number)</label>
          <input id="mode2-value" type="text" inputmode="decimal" bind:value={mode2Value} />
        </div>

        <div class="field">
          <label for="mode2-total">Y (number)</label>
          <input id="mode2-total" type="text" inputmode="decimal" bind:value={mode2Total} />
        </div>
      </div>

      <div class="result-box" aria-live="polite">
        <span class="label">Result</span>
        <span class="value">{mode2Result || '—'}</span>
      </div>

      {#if mode2Error}
        <p class="error">{mode2Error}</p>
      {/if}

      <div class="actions">
        <button class="primary" type="button" on:click={() => copyValue(mode2Result, 'mode2')} disabled={mode2Result.length === 0}>Copy result</button>
      </div>

      <p class="copy-status">{mode2CopyMessage}</p>
    </article>

    <article class="panel calc-card" aria-label="Percentage change calculator">
      <div class="card-head">
        <h2>Percentage change from X to Y</h2>
        <button type="button" on:click={clearMode3}>Clear</button>
      </div>

      <div class="field-grid">
        <div class="field">
          <label for="mode3-original">X (original)</label>
          <input id="mode3-original" type="text" inputmode="decimal" bind:value={mode3Original} />
        </div>

        <div class="field">
          <label for="mode3-new">Y (new)</label>
          <input id="mode3-new" type="text" inputmode="decimal" bind:value={mode3New} />
        </div>
      </div>

      <div class="result-box" aria-live="polite">
        <span class="label">Result</span>
        <span class:increase={mode3Trend === 'increase'} class:decrease={mode3Trend === 'decrease'} class:none={mode3Trend === 'none'} class="value">
          {mode3Result || '—'}
        </span>
      </div>

      {#if mode3Error}
        <p class="error">{mode3Error}</p>
      {:else if mode3Trend === 'increase'}
        <p class="trend increase">Increase</p>
      {:else if mode3Trend === 'decrease'}
        <p class="trend decrease">Decrease</p>
      {:else if mode3Trend === 'none'}
        <p class="trend none">No change</p>
      {/if}

      <div class="actions">
        <button class="primary" type="button" on:click={() => copyValue(mode3Result, 'mode3')} disabled={mode3Result.length === 0}>Copy result</button>
      </div>

      <p class="copy-status">{mode3CopyMessage}</p>
    </article>
  </section>
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 1180px;
  }

  .tool-header {
    display: grid;
    gap: var(--space-1);
  }

  .divider {
    height: 1px;
    background: var(--border);
  }

  .cards-grid {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .panel {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }

  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
  }

  .field-grid {
    display: grid;
    gap: var(--space-1);
  }

  .field {
    display: grid;
    gap: var(--space-1);
  }

  input {
    width: 100%;
  }

  .result-box {
    display: grid;
    gap: var(--space-half);
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-subtle);
  }

  .label {
    color: var(--text-muted);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .value {
    color: var(--text-primary);
    font-size: 18px;
  }

  .increase {
    color: var(--success);
  }

  .decrease {
    color: var(--error);
  }

  .none {
    color: var(--text-primary);
  }

  .trend {
    font-size: 14px;
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
    color: var(--error-text);
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

  @media (max-width: 1024px) {
    .cards-grid {
      grid-template-columns: 1fr;
    }
  }
</style>