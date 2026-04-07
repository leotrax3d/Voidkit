<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import { contrastRatio, hexToRgb, normalizeHexColor, rgbaString, type RgbColor } from '$lib/utils/color';
  import { onMount } from 'svelte';

  export let tool: Tool;

  const SAMPLE_NORMAL = 'The quick brown fox';
  const SAMPLE_LARGE = 'The quick brown fox';

  let foregroundHex = '#f0f0f0';
  let backgroundHex = '#0d0d0d';
  let foregroundInput = foregroundHex;
  let backgroundInput = backgroundHex;
  let foregroundPicker = foregroundHex;
  let backgroundPicker = backgroundHex;
  let contrast = 0;
  let previewCanvas: HTMLCanvasElement | null = null;

  function applyForegroundPicker(value: string): void {
    const normalized = normalizeHexColor(value);
    if (!normalized) {
      return;
    }

    foregroundHex = normalized;
    foregroundInput = normalized;
    foregroundPicker = normalized;
  }

  function applyBackgroundPicker(value: string): void {
    const normalized = normalizeHexColor(value);
    if (!normalized) {
      return;
    }

    backgroundHex = normalized;
    backgroundInput = normalized;
    backgroundPicker = normalized;
  }

  function applyForegroundHex(value: string): void {
    foregroundInput = value;
    const normalized = normalizeHexColor(value);
    if (!normalized) {
      return;
    }

    foregroundHex = normalized;
    foregroundPicker = normalized;
    foregroundInput = normalized;
  }

  function applyBackgroundHex(value: string): void {
    backgroundInput = value;
    const normalized = normalizeHexColor(value);
    if (!normalized) {
      return;
    }

    backgroundHex = normalized;
    backgroundPicker = normalized;
    backgroundInput = normalized;
  }

  function swapColors(): void {
    [foregroundHex, backgroundHex] = [backgroundHex, foregroundHex];
    foregroundInput = foregroundHex;
    backgroundInput = backgroundHex;
    foregroundPicker = foregroundHex;
    backgroundPicker = backgroundHex;
  }

  function drawPreview(): void {
    if (!browser || !previewCanvas) {
      return;
    }

    const ctx = previewCanvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const width = previewCanvas.width;
    const height = previewCanvas.height;
    const fg = hexToRgb(foregroundHex);
    const bg = hexToRgb(backgroundHex);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = backgroundHex;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = foregroundHex;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '400 20px "JetBrains Mono", monospace';
    ctx.fillText(SAMPLE_NORMAL, width / 2, height / 2 - 28);
    ctx.font = '700 34px "JetBrains Mono", monospace';
    ctx.fillText(SAMPLE_LARGE, width / 2, height / 2 + 28);

    ctx.strokeStyle = rgbaString(fg, 0.25);
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    contrast = contrastRatio(fg, bg);
  }

  function compliance(passThreshold: number): boolean {
    return contrast >= passThreshold;
  }

  function badgeText(isPass: boolean): string {
    return isPass ? 'Pass' : 'Fail';
  }

  async function copyValue(value: string): Promise<void> {
    if (!browser || value.length === 0) {
      return;
    }

    await navigator.clipboard.writeText(value);
  }

  onMount(() => {
    foregroundPicker = foregroundHex;
    backgroundPicker = backgroundHex;
    drawPreview();
  });

  $: if (browser) {
    foregroundHex;
    backgroundHex;
    drawPreview();
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel dual-panel" aria-label="Foreground and background color inputs">
    <div class="color-card">
      <div class="card-head">
        <h2>Foreground</h2>
        <button type="button" on:click={() => copyValue(foregroundHex)}>Copy HEX</button>
      </div>

      <div class="color-controls">
        <input type="color" bind:value={foregroundPicker} on:input={(event) => applyForegroundPicker((event.currentTarget as HTMLInputElement).value)} aria-label="Foreground color picker" />
        <input type="text" value={foregroundInput} on:input={(event) => applyForegroundHex((event.currentTarget as HTMLInputElement).value)} spellcheck="false" aria-label="Foreground hex input" />
      </div>
    </div>

    <div class="color-card">
      <div class="card-head">
        <h2>Background</h2>
        <button type="button" on:click={() => copyValue(backgroundHex)}>Copy HEX</button>
      </div>

      <div class="color-controls">
        <input type="color" bind:value={backgroundPicker} on:input={(event) => applyBackgroundPicker((event.currentTarget as HTMLInputElement).value)} aria-label="Background color picker" />
        <input type="text" value={backgroundInput} on:input={(event) => applyBackgroundHex((event.currentTarget as HTMLInputElement).value)} spellcheck="false" aria-label="Background hex input" />
      </div>
    </div>

    <button class="primary swap-button" type="button" on:click={swapColors}>Swap foreground/background</button>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <span class="muted">WCAG 2.1 contrast ratio and compliance</span>
    </div>

    <canvas bind:this={previewCanvas} width="900" height="220" aria-label="Contrast preview canvas"></canvas>

    <div class="ratio-row">
      <span class="ratio">{contrast.toFixed(2)}:1</span>
      <button type="button" on:click={() => copyValue(contrast.toFixed(2) + ':1')}>Copy ratio</button>
    </div>

    <div class="badges-grid">
      <div class:pass={compliance(4.5)} class:fail={!compliance(4.5)} class="badge">AA Normal Text: {badgeText(compliance(4.5))}</div>
      <div class:pass={compliance(3)} class:fail={!compliance(3)} class="badge">AA Large Text: {badgeText(compliance(3))}</div>
      <div class:pass={compliance(7)} class:fail={!compliance(7)} class="badge">AAA Normal Text: {badgeText(compliance(7))}</div>
      <div class:pass={compliance(4.5)} class:fail={!compliance(4.5)} class="badge">AAA Large Text: {badgeText(compliance(4.5))}</div>
    </div>
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

  .dual-panel {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .color-card {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #111111;
  }

  .card-head,
  .output-head,
  .ratio-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .color-controls {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
  }

  input[type='color'] {
    width: 72px;
    height: 40px;
    padding: 0;
  }

  input[type='text'] {
    width: 100%;
  }

  .primary {
    border-color: var(--accent);
    color: var(--accent);
  }

  canvas {
    width: 100%;
    height: auto;
    display: block;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #111111;
  }

  .ratio {
    color: var(--text-primary);
    font-size: 28px;
    font-weight: 700;
  }

  .badges-grid {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .badge {
    padding: var(--space-1);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    font-size: 14px;
    font-weight: 700;
  }

  .pass {
    background: rgba(163, 230, 53, 0.12);
    color: #a3e635;
    border-color: rgba(163, 230, 53, 0.45);
  }

  .fail {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.45);
  }

  .muted {
    color: var(--text-muted);
    font-size: 14px;
  }

  h1 {
    font-size: 24px;
  }

  h2 {
    font-size: 16px;
  }

  p {
    color: var(--text-muted);
    font-size: 14px;
  }

  @media (max-width: 860px) {
    .dual-panel,
    .badges-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
