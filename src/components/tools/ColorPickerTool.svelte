<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import {
    cmykToRgb,
    colorFromAnyInput,
    formatCmyk,
    formatHsl,
    formatHsv,
    formatRgb,
    hexToRgb,
    normalizeHexColor,
    rgbToCmyk,
    rgbToHex,
    rgbToHsl,
    rgbToHsv,
    type CmykColor,
    type HslColor,
    type HsvColor,
    type RgbColor
  } from '$lib/utils/color';
  import { onMount } from 'svelte';

  export let tool: Tool;

  const STORAGE_KEY = 'voidkit_color-picker_history';
  const DEFAULT_HEX = '#a3e635';
  const HISTORY_LIMIT = 12;

  let currentRgb: RgbColor = hexToRgb(DEFAULT_HEX);
  let currentHex = DEFAULT_HEX;
  let hexInput = DEFAULT_HEX;
  let rgbInput = formatRgb(currentRgb);
  let hslInput = formatHsl(rgbToHsl(currentRgb));
  let hsbInput = formatHsv(rgbToHsv(currentRgb));
  let cmykInput = formatCmyk(rgbToCmyk(currentRgb));
  let pickerValue = DEFAULT_HEX;
  let history: string[] = [];
  let errorMessage = '';
  let copyMessage = '';
  let hydrated = false;

  function colorSwatchDataUri(hex: string): string {
    const safeHex = normalizeHexColor(hex) ?? DEFAULT_HEX;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" preserveAspectRatio="none"><rect width="120" height="80" fill="${safeHex}"/></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function updateHistory(hex: string): void {
    const normalized = normalizeHexColor(hex);
    if (!normalized) {
      return;
    }

    history = [normalized, ...history.filter((entry) => entry !== normalized)].slice(0, HISTORY_LIMIT);
  }

  function applyRgb(rgb: RgbColor, addToHistory = true): void {
    currentRgb = {
      r: Math.round(rgb.r),
      g: Math.round(rgb.g),
      b: Math.round(rgb.b)
    };
    currentHex = rgbToHex(currentRgb);
    pickerValue = currentHex;
    hexInput = currentHex;
    rgbInput = formatRgb(currentRgb);
    hslInput = formatHsl(rgbToHsl(currentRgb));
    hsbInput = formatHsv(rgbToHsv(currentRgb));
    cmykInput = formatCmyk(rgbToCmyk(currentRgb));
    errorMessage = '';

    if (addToHistory) {
      updateHistory(currentHex);
    }
  }

  function setColorFromText(rawValue: string): void {
    const rgb = colorFromAnyInput(rawValue);

    if (!rgb) {
      errorMessage = 'Enter a valid color value.';
      return;
    }

    applyRgb(rgb);
  }

  function handlePickerChange(value: string): void {
    const normalized = normalizeHexColor(value);
    if (!normalized) {
      return;
    }

    applyRgb(hexToRgb(normalized));
  }

  function handleHexInput(): void {
    setColorFromText(hexInput);
  }

  function handleRgbInput(): void {
    setColorFromText(rgbInput);
  }

  function handleHslInput(): void {
    setColorFromText(hslInput);
  }

  function handleHsbInput(): void {
    setColorFromText(hsbInput);
  }

  function handleCmykInput(): void {
    setColorFromText(cmykInput);
  }

  function restoreHistory(hex: string): void {
    applyRgb(hexToRgb(hex));
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

  onMount(() => {
    if (!browser) {
      hydrated = true;
      return;
    }

    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as string[];
        history = parsed
          .map((entry) => normalizeHexColor(entry))
          .filter((entry): entry is string => Boolean(entry))
          .slice(0, HISTORY_LIMIT);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    if (history.length > 0) {
      applyRgb(hexToRgb(history[0]), false);
    } else {
      applyRgb(hexToRgb(DEFAULT_HEX), false);
      updateHistory(DEFAULT_HEX);
    }

    hydrated = true;
  });

  $: if (browser && hydrated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel" aria-label="Color picker input section">
    <div class="picker-row">
      <label class="picker-label" for="native-color">Native picker</label>
      <input id="native-color" type="color" bind:value={pickerValue} on:input={(event) => handlePickerChange((event.currentTarget as HTMLInputElement).value)} />
    </div>

    <div class="preview-swatch" aria-label="Selected color preview">
      <img src={colorSwatchDataUri(currentHex)} alt="" aria-hidden="true" />
    </div>
  </section>

  <section class="panel rows" aria-label="Color format inputs">
    <div class="field">
      <div class="field-head">
        <label for="hex-input">HEX</label>
        <button type="button" on:click={() => copyValue(currentHex)}>Copy</button>
      </div>
      <input id="hex-input" type="text" bind:value={hexInput} on:input={handleHexInput} spellcheck="false" />
    </div>

    <div class="field">
      <div class="field-head">
        <label for="rgb-input">RGB</label>
        <button type="button" on:click={() => copyValue(rgbInput)}>Copy</button>
      </div>
      <input id="rgb-input" type="text" bind:value={rgbInput} on:input={handleRgbInput} spellcheck="false" />
    </div>

    <div class="field">
      <div class="field-head">
        <label for="hsl-input">HSL</label>
        <button type="button" on:click={() => copyValue(hslInput)}>Copy</button>
      </div>
      <input id="hsl-input" type="text" bind:value={hslInput} on:input={handleHslInput} spellcheck="false" />
    </div>

    <div class="field">
      <div class="field-head">
        <label for="hsb-input">HSB / HSV</label>
        <button type="button" on:click={() => copyValue(hsbInput)}>Copy</button>
      </div>
      <input id="hsb-input" type="text" bind:value={hsbInput} on:input={handleHsbInput} spellcheck="false" />
    </div>

    <div class="field">
      <div class="field-head">
        <label for="cmyk-input">CMYK</label>
        <button type="button" on:click={() => copyValue(cmykInput)}>Copy</button>
      </div>
      <input id="cmyk-input" type="text" bind:value={cmykInput} on:input={handleCmykInput} spellcheck="false" />
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <span class="muted">Editing any format updates all others live</span>
    </div>

    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {:else}
      <p class="summary">{currentHex} · {rgbInput} · {hslInput} · {hsbInput} · {cmykInput}</p>
    {/if}

    <p class="copy-status">{copyMessage}</p>
  </section>

  <section class="panel" aria-label="Color history">
    <div class="output-head">
      <h2>History</h2>
      <span class="muted">Last 12 picked colors</span>
    </div>

    {#if history.length === 0}
      <p class="muted">No history yet.</p>
    {:else}
      <div class="history-grid">
        {#each history as item}
          <button type="button" class="history-item" on:click={() => restoreHistory(item)} aria-label={`Restore ${item}`}>
            <img src={colorSwatchDataUri(item)} alt="" aria-hidden="true" />
          </button>
        {/each}
      </div>
    {/if}
  </section>
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 1080px;
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

  .picker-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .picker-label {
    color: var(--text-muted);
    font-size: 14px;
  }

  .preview-swatch img {
    display: block;
    width: 100%;
    height: 80px;
    object-fit: cover;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .rows {
    display: grid;
    gap: var(--space-2);
  }

  .field {
    display: grid;
    gap: var(--space-1);
  }

  .field-head,
  .output-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .field input {
    width: 100%;
  }

  .summary {
    color: var(--text-primary);
    font-size: 14px;
    word-break: break-word;
  }

  .error {
    color: var(--error-text);
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

  .history-grid {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
  }

  .history-item {
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: transparent;
  }

  .history-item img {
    display: block;
    width: 100%;
    height: 32px;
    object-fit: cover;
  }

  .history-item:hover {
    background: transparent;
    border-color: var(--accent);
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
</style>
