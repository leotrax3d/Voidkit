<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import { hexToRgb, normalizeHexColor, rgbaString } from '$lib/utils/color';
  import { onMount } from 'svelte';

  export let tool: Tool;

  type Mode = 'box' | 'text';
  type PreviewBackground = 'dark' | 'light' | 'grid';

  type BoxShadowLayer = {
    id: string;
    visible: boolean;
    inset: boolean;
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: string;
    opacity: number;
  };

  type TextShadowLayer = {
    id: string;
    visible: boolean;
    x: number;
    y: number;
    blur: number;
    color: string;
    opacity: number;
  };

  const STORAGE_KEY = 'voidkit_shadow-generator_settings';
  const MAX_BOX_LAYERS = 5;
  const MAX_TEXT_LAYERS = 3;

  let mode: Mode = 'box';
  let previewBackground: PreviewBackground = 'dark';
  let boxLayers: BoxShadowLayer[] = [
    {
      id: 'box-1',
      visible: true,
      inset: false,
      x: 0,
      y: 14,
      blur: 28,
      spread: -6,
      color: '#000000',
      opacity: 0.35
    }
  ];
  let textLayers: TextShadowLayer[] = [
    {
      id: 'text-1',
      visible: true,
      x: 4,
      y: 4,
      blur: 12,
      color: '#000000',
      opacity: 0.45
    }
  ];
  let previewCanvas: HTMLCanvasElement | null = null;
  let outputCss = '';
  let copyMessage = '';
  let hydrated = false;

  function nextId(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  function applyBoxColor(id: string, value: string): void {
    const normalized = normalizeHexColor(value);
    if (!normalized) {
      return;
    }

    boxLayers = boxLayers.map((layer) => (layer.id === id ? { ...layer, color: normalized } : layer));
  }

  function applyTextColor(id: string, value: string): void {
    const normalized = normalizeHexColor(value);
    if (!normalized) {
      return;
    }

    textLayers = textLayers.map((layer) => (layer.id === id ? { ...layer, color: normalized } : layer));
  }

  function addBoxLayer(): void {
    if (boxLayers.length >= MAX_BOX_LAYERS) {
      return;
    }

    boxLayers = [
      ...boxLayers,
      {
        id: nextId('box'),
        visible: true,
        inset: false,
        x: 0,
        y: 12,
        blur: 24,
        spread: 0,
        color: '#000000',
        opacity: 0.25
      }
    ];
  }

  function removeBoxLayer(id: string): void {
    if (boxLayers.length <= 1) {
      return;
    }

    boxLayers = boxLayers.filter((layer) => layer.id !== id);
  }

  function addTextLayer(): void {
    if (textLayers.length >= MAX_TEXT_LAYERS) {
      return;
    }

    textLayers = [
      ...textLayers,
      {
        id: nextId('text'),
        visible: true,
        x: 2,
        y: 2,
        blur: 6,
        color: '#000000',
        opacity: 0.35
      }
    ];
  }

  function removeTextLayer(id: string): void {
    if (textLayers.length <= 1) {
      return;
    }

    textLayers = textLayers.filter((layer) => layer.id !== id);
  }

  function boxShadowCss(): string {
    const layers = boxLayers
      .filter((layer) => layer.visible)
      .map((layer) => {
        const parts = [
          layer.inset ? 'inset' : '',
          `${layer.x}px`,
          `${layer.y}px`,
          `${layer.blur}px`,
          `${layer.spread}px`,
          rgbaString(hexToRgb(normalizeHexColor(layer.color) ?? '#000000'), layer.opacity)
        ].filter(Boolean);
        return parts.join(' ');
      });

    return layers.length > 0 ? `box-shadow: ${layers.join(', ')};` : 'box-shadow: none;';
  }

  function textShadowCss(): string {
    const layers = textLayers
      .filter((layer) => layer.visible)
      .map((layer) => `${layer.x}px ${layer.y}px ${layer.blur}px ${rgbaString(hexToRgb(normalizeHexColor(layer.color) ?? '#000000'), layer.opacity)}`);

    return layers.length > 0 ? `text-shadow: ${layers.join(', ')};` : 'text-shadow: none;';
  }

  function buildOutputCss(): string {
    return mode === 'box' ? boxShadowCss() : textShadowCss();
  }

  function gridBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
  }

  function fillBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (previewBackground === 'light') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (previewBackground === 'grid') {
      gridBackground(ctx, width, height);
      return;
    }

    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, width, height);
  }

  function drawBoxPreview(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const squareSize = 80;
    const squareX = Math.round((width - squareSize) / 2);
    const squareY = Math.round((height - squareSize) / 2);

    boxLayers.filter((layer) => layer.visible).forEach((layer) => {
      const color = rgbaString(hexToRgb(normalizeHexColor(layer.color) ?? '#000000'), layer.opacity);

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = layer.blur;
      ctx.shadowOffsetX = layer.x;
      ctx.shadowOffsetY = layer.y;
      ctx.fillStyle = '#f0f0f0';

      if (layer.inset) {
        ctx.beginPath();
        ctx.rect(squareX, squareY, squareSize, squareSize);
        ctx.clip();
        ctx.fillRect(squareX - layer.spread, squareY - layer.spread, squareSize + layer.spread * 2, squareSize + layer.spread * 2);
      } else {
        ctx.fillRect(squareX, squareY, squareSize, squareSize);
      }

      ctx.restore();
    });

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(squareX, squareY, squareSize, squareSize);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.strokeRect(squareX + 0.5, squareY + 0.5, squareSize - 1, squareSize - 1);
  }

  function drawTextPreview(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    textLayers.filter((layer) => layer.visible).forEach((layer) => {
      ctx.save();
      ctx.shadowColor = rgbaString(hexToRgb(normalizeHexColor(layer.color) ?? '#000000'), layer.opacity);
      ctx.shadowBlur = layer.blur;
      ctx.shadowOffsetX = layer.x;
      ctx.shadowOffsetY = layer.y;
      ctx.fillStyle = '#f0f0f0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 44px "JetBrains Mono", monospace';
      ctx.fillText('Voidkit', centerX, centerY);
      ctx.restore();
    });

    ctx.fillStyle = '#f0f0f0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 44px "JetBrains Mono", monospace';
    ctx.fillText('Voidkit', centerX, centerY);
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

    fillBackground(ctx, width, height);

    if (mode === 'box') {
      drawBoxPreview(ctx, width, height);
    } else {
      drawTextPreview(ctx, width, height);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    if (previewBackground === 'light') {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    }
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    outputCss = buildOutputCss();
  }

  function updateBoxField<T extends keyof BoxShadowLayer>(id: string, key: T, value: BoxShadowLayer[T]): void {
    boxLayers = boxLayers.map((layer) => (layer.id === id ? { ...layer, [key]: value } : layer));
  }

  function updateTextField<T extends keyof TextShadowLayer>(id: string, key: T, value: TextShadowLayer[T]): void {
    textLayers = textLayers.map((layer) => (layer.id === id ? { ...layer, [key]: value } : layer));
  }

  async function copyCss(): Promise<void> {
    if (!browser || outputCss.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(outputCss);
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
        const parsed = JSON.parse(raw) as {
          mode?: Mode;
          previewBackground?: PreviewBackground;
          boxLayers?: BoxShadowLayer[];
          textLayers?: TextShadowLayer[];
        };

        if (parsed.mode === 'box' || parsed.mode === 'text') {
          mode = parsed.mode;
        }

        if (parsed.previewBackground === 'dark' || parsed.previewBackground === 'light' || parsed.previewBackground === 'grid') {
          previewBackground = parsed.previewBackground;
        }

        if (Array.isArray(parsed.boxLayers) && parsed.boxLayers.length > 0) {
          boxLayers = parsed.boxLayers.slice(0, MAX_BOX_LAYERS).map((layer, index) => ({
            id: layer.id || `box-${index}`,
            visible: layer.visible ?? true,
            inset: layer.inset ?? false,
            x: Number(layer.x) || 0,
            y: Number(layer.y) || 0,
            blur: Number(layer.blur) || 0,
            spread: Number(layer.spread) || 0,
            color: normalizeHexColor(layer.color ?? '#000000') ?? '#000000',
            opacity: Math.min(1, Math.max(0, Number(layer.opacity) || 0))
          }));
        }

        if (Array.isArray(parsed.textLayers) && parsed.textLayers.length > 0) {
          textLayers = parsed.textLayers.slice(0, MAX_TEXT_LAYERS).map((layer, index) => ({
            id: layer.id || `text-${index}`,
            visible: layer.visible ?? true,
            x: Number(layer.x) || 0,
            y: Number(layer.y) || 0,
            blur: Number(layer.blur) || 0,
            color: normalizeHexColor(layer.color ?? '#000000') ?? '#000000',
            opacity: Math.min(1, Math.max(0, Number(layer.opacity) || 0))
          }));
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    hydrated = true;
    drawPreview();
  });

  $: if (browser && hydrated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, previewBackground, boxLayers, textLayers }));
    drawPreview();
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel" aria-label="Mode selection">
    <div class="toggle-row" role="radiogroup" aria-label="Shadow mode">
      <button class:active={mode === 'box'} type="button" on:click={() => (mode = 'box')}>Box Shadow</button>
      <button class:active={mode === 'text'} type="button" on:click={() => (mode = 'text')}>Text Shadow</button>
    </div>

    <div class="toggle-row" role="radiogroup" aria-label="Preview background">
      <button class:active={previewBackground === 'dark'} type="button" on:click={() => (previewBackground = 'dark')}>Dark</button>
      <button class:active={previewBackground === 'light'} type="button" on:click={() => (previewBackground = 'light')}>Light</button>
      <button class:active={previewBackground === 'grid'} type="button" on:click={() => (previewBackground = 'grid')}>Grid</button>
    </div>
  </section>

  <section class="panel preview-panel" aria-label="Shadow preview">
    <canvas bind:this={previewCanvas} width="960" height="240" aria-label="Shadow preview canvas"></canvas>
  </section>

  {#if mode === 'box'}
    <section class="panel" aria-label="Box shadow controls">
      <div class="section-head">
        <h2>Box Shadow</h2>
        <button type="button" class="primary" on:click={addBoxLayer} disabled={boxLayers.length >= MAX_BOX_LAYERS}>Add layer</button>
      </div>

      <div class="layer-list">
        {#each boxLayers as layer, index (layer.id)}
          <article class="layer-card">
            <div class="layer-head">
              <strong>Layer {index + 1}</strong>
              <div class="layer-actions">
                <label class="toggle-label"><input type="checkbox" bind:checked={layer.visible} on:change={() => updateBoxField(layer.id, 'visible', layer.visible)} /> Visible</label>
                <label class="toggle-label"><input type="checkbox" bind:checked={layer.inset} on:change={() => updateBoxField(layer.id, 'inset', layer.inset)} /> Inset</label>
                <button type="button" on:click={() => removeBoxLayer(layer.id)} disabled={boxLayers.length <= 1}>Remove</button>
              </div>
            </div>

            <div class="grid-controls">
              <div class="field">
                <label for={`box-x-${layer.id}`}>Horizontal offset: {layer.x}px</label>
                <input id={`box-x-${layer.id}`} type="range" min="-50" max="50" bind:value={layer.x} on:input={() => updateBoxField(layer.id, 'x', layer.x)} />
              </div>

              <div class="field">
                <label for={`box-y-${layer.id}`}>Vertical offset: {layer.y}px</label>
                <input id={`box-y-${layer.id}`} type="range" min="-50" max="50" bind:value={layer.y} on:input={() => updateBoxField(layer.id, 'y', layer.y)} />
              </div>

              <div class="field">
                <label for={`box-blur-${layer.id}`}>Blur radius: {layer.blur}px</label>
                <input id={`box-blur-${layer.id}`} type="range" min="0" max="100" bind:value={layer.blur} on:input={() => updateBoxField(layer.id, 'blur', layer.blur)} />
              </div>

              <div class="field">
                <label for={`box-spread-${layer.id}`}>Spread radius: {layer.spread}px</label>
                <input id={`box-spread-${layer.id}`} type="range" min="-50" max="50" bind:value={layer.spread} on:input={() => updateBoxField(layer.id, 'spread', layer.spread)} />
              </div>

              <div class="color-row">
                <input type="color" value={layer.color} on:input={(event) => applyBoxColor(layer.id, (event.currentTarget as HTMLInputElement).value)} aria-label={`Box layer ${index + 1} color picker`} />
                <input type="text" value={layer.color} on:input={(event) => applyBoxColor(layer.id, (event.currentTarget as HTMLInputElement).value)} spellcheck="false" aria-label={`Box layer ${index + 1} hex input`} />
              </div>

              <div class="field">
                <label for={`box-opacity-${layer.id}`}>Opacity: {Math.round(layer.opacity * 100)}%</label>
                <input id={`box-opacity-${layer.id}`} type="range" min="0" max="1" step="0.01" bind:value={layer.opacity} on:input={() => updateBoxField(layer.id, 'opacity', layer.opacity)} />
              </div>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {:else}
    <section class="panel" aria-label="Text shadow controls">
      <div class="section-head">
        <h2>Text Shadow</h2>
        <button type="button" class="primary" on:click={addTextLayer} disabled={textLayers.length >= MAX_TEXT_LAYERS}>Add layer</button>
      </div>

      <div class="layer-list">
        {#each textLayers as layer, index (layer.id)}
          <article class="layer-card">
            <div class="layer-head">
              <strong>Layer {index + 1}</strong>
              <div class="layer-actions">
                <label class="toggle-label"><input type="checkbox" bind:checked={layer.visible} on:change={() => updateTextField(layer.id, 'visible', layer.visible)} /> Visible</label>
                <button type="button" on:click={() => removeTextLayer(layer.id)} disabled={textLayers.length <= 1}>Remove</button>
              </div>
            </div>

            <div class="grid-controls">
              <div class="field">
                <label for={`text-x-${layer.id}`}>Horizontal offset: {layer.x}px</label>
                <input id={`text-x-${layer.id}`} type="range" min="-50" max="50" bind:value={layer.x} on:input={() => updateTextField(layer.id, 'x', layer.x)} />
              </div>

              <div class="field">
                <label for={`text-y-${layer.id}`}>Vertical offset: {layer.y}px</label>
                <input id={`text-y-${layer.id}`} type="range" min="-50" max="50" bind:value={layer.y} on:input={() => updateTextField(layer.id, 'y', layer.y)} />
              </div>

              <div class="field">
                <label for={`text-blur-${layer.id}`}>Blur radius: {layer.blur}px</label>
                <input id={`text-blur-${layer.id}`} type="range" min="0" max="100" bind:value={layer.blur} on:input={() => updateTextField(layer.id, 'blur', layer.blur)} />
              </div>

              <div class="color-row">
                <input type="color" value={layer.color} on:input={(event) => applyTextColor(layer.id, (event.currentTarget as HTMLInputElement).value)} aria-label={`Text layer ${index + 1} color picker`} />
                <input type="text" value={layer.color} on:input={(event) => applyTextColor(layer.id, (event.currentTarget as HTMLInputElement).value)} spellcheck="false" aria-label={`Text layer ${index + 1} hex input`} />
              </div>

              <div class="field">
                <label for={`text-opacity-${layer.id}`}>Opacity: {Math.round(layer.opacity * 100)}%</label>
                <input id={`text-opacity-${layer.id}`} type="range" min="0" max="1" step="0.01" bind:value={layer.opacity} on:input={() => updateTextField(layer.id, 'opacity', layer.opacity)} />
              </div>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <button type="button" class="primary" on:click={copyCss}>Copy CSS</button>
    </div>

    <textarea readonly rows="4" bind:value={outputCss}></textarea>
    <p class="copy-status">{copyMessage}</p>
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

  .panel {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }

  .preview-panel {
    padding: var(--space-2);
  }

  canvas {
    width: 100%;
    height: auto;
    display: block;
    border-radius: var(--radius);
    border: 1px solid var(--border);
  }

  .toggle-row,
  .layer-actions,
  .output-head,
  .section-head {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
  }

  .toggle-row {
    justify-content: flex-start;
  }

  .toggle-row button.active {
    border-color: var(--accent);
    color: var(--accent);
  }

  .layer-list {
    display: grid;
    gap: var(--space-2);
  }

  .layer-card {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #111111;
  }

  .layer-head {
    display: flex;
    justify-content: space-between;
    gap: var(--space-1);
    flex-wrap: wrap;
    align-items: center;
  }

  .grid-controls {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field {
    display: grid;
    gap: var(--space-1);
  }

  .color-row {
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

  input[type='range'],
  input[type='text'],
  textarea {
    width: 100%;
  }

  .toggle-label {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    color: var(--text-muted);
    font-size: 13px;
  }

  .primary {
    border-color: var(--accent);
    color: var(--accent);
  }

  .copy-status {
    color: var(--accent);
    min-height: 21px;
    font-size: 14px;
  }

  textarea {
    min-height: 96px;
  }

  h1 {
    font-size: 24px;
  }

  h2 {
    font-size: 16px;
  }

  p,
  label,
  strong {
    color: var(--text-muted);
    font-size: 14px;
  }

  @media (max-width: 920px) {
    .grid-controls,
    .color-row {
      grid-template-columns: 1fr;
    }
  }
</style>
