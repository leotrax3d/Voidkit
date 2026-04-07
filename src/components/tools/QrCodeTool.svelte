<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import { onDestroy, onMount } from 'svelte';
  import QRCode from 'qrcode';

  export let tool: Tool;

  type QrLevel = 'L' | 'M' | 'Q' | 'H';
  type QrSize = 'small' | 'medium' | 'large';

  const sizeMap: Record<QrSize, number> = {
    small: 200,
    medium: 300,
    large: 400
  };

  let inputText = '';
  let level: QrLevel = 'M';
  let size: QrSize = 'medium';
  let svgMarkup = '';
  let errorMessage = '';
  let copyMessage = '';
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function renderQr(): Promise<void> {
    if (!browser) return;

    if (inputText.trim().length === 0) {
      svgMarkup = '';
      errorMessage = '';
      return;
    }

    try {
      svgMarkup = await QRCode.toString(inputText, {
        type: 'svg',
        errorCorrectionLevel: level,
        width: sizeMap[size],
        margin: 1
      });
      errorMessage = '';
    } catch {
      svgMarkup = '';
      errorMessage = 'Unable to generate QR code.';
    }
  }

  function scheduleRender(): void {
    if (!browser) return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void renderQr();
    }, 400);
  }

  onMount(() => {
    scheduleRender();
  });

  $: if (browser) {
    inputText;
    level;
    size;
    scheduleRender();
  }

  onDestroy(() => {
    if (timer) clearTimeout(timer);
  });

  async function copySvg(): Promise<void> {
    if (!browser || svgMarkup.length === 0) return;

    await navigator.clipboard.writeText(svgMarkup);
    copyMessage = 'Copied.';
  }

  function downloadSvg(): void {
    if (!browser || svgMarkup.length === 0) return;

    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'voidkit-qr-code.svg';
    link.click();

    URL.revokeObjectURL(url);
    copyMessage = 'Downloaded.';
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel" aria-label="QR code input section">
    <div class="field">
      <label for="qr-input">Text or URL</label>
      <input id="qr-input" type="text" bind:value={inputText} placeholder="https://example.com" />
    </div>

    <div class="row">
      <div class="field">
        <label for="qr-level">Error correction level</label>
        <select id="qr-level" bind:value={level}>
          <option value="L">L</option>
          <option value="M">M</option>
          <option value="Q">Q</option>
          <option value="H">H</option>
        </select>
      </div>

      <div class="field">
        <label for="qr-size">Size</label>
        <select id="qr-size" bind:value={size}>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <div class="buttons">
        <button type="button" on:click={copySvg} disabled={svgMarkup.length === 0}>Copy SVG</button>
        <button type="button" on:click={downloadSvg} disabled={svgMarkup.length === 0}>Download</button>
      </div>
    </div>

    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {:else if svgMarkup}
      <div class="qr-wrapper" class:small={size === 'small'} class:medium={size === 'medium'} class:large={size === 'large'}>
        {@html svgMarkup}
      </div>
    {:else}
      <p class="muted">No QR code generated yet.</p>
    {/if}

    <p class="copy-status">{copyMessage}</p>
  </section>
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 960px;
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

  .field {
    display: grid;
    gap: var(--space-1);
  }

  .row {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .buttons {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .qr-wrapper {
    display: grid;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-2);
    background: var(--bg);
  }

  .qr-wrapper :global(svg) {
    display: block;
    width: 100%;
    height: auto;
    max-width: 400px;
  }

  .qr-wrapper.small :global(svg) {
    max-width: 200px;
  }

  .qr-wrapper.medium :global(svg) {
    max-width: 300px;
  }

  .qr-wrapper.large :global(svg) {
    max-width: 400px;
  }

  .error {
    color: #f08b8b;
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
  label,
  .muted {
    font-size: 14px;
    color: var(--text-muted);
  }

  @media (max-width: 760px) {
    .row {
      grid-template-columns: 1fr;
    }
  }
</style>