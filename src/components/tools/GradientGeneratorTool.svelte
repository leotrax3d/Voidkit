<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import { hexToRgb, normalizeHexColor, rgbToHex } from '$lib/utils/color';
  import { onMount } from 'svelte';

  export let tool: Tool;

  type GradientType = 'linear' | 'radial' | 'conic';

  type GradientStop = {
    id: string;
    color: string;
    position: number;
  };

  type GradientPreset = {
    name: string;
    type: GradientType;
    angle: number;
    stops: GradientStop[];
  };

  const PRESETS: GradientPreset[] = [
    {
      name: 'Sunset',
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'sunset-1', color: '#ff7e5f', position: 0 },
        { id: 'sunset-2', color: '#feb47b', position: 45 },
        { id: 'sunset-3', color: '#7f00ff', position: 100 }
      ]
    },
    {
      name: 'Ocean',
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'ocean-1', color: '#2193b0', position: 0 },
        { id: 'ocean-2', color: '#6dd5ed', position: 100 }
      ]
    },
    {
      name: 'Forest',
      type: 'linear',
      angle: 120,
      stops: [
        { id: 'forest-1', color: '#134e5e', position: 0 },
        { id: 'forest-2', color: '#71b280', position: 100 }
      ]
    },
    {
      name: 'Neon',
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'neon-1', color: '#00f5d4', position: 0 },
        { id: 'neon-2', color: '#00bbf9', position: 50 },
        { id: 'neon-3', color: '#f15bb5', position: 100 }
      ]
    },
    {
      name: 'Monochrome',
      type: 'radial',
      angle: 0,
      stops: [
        { id: 'mono-1', color: '#f0f0f0', position: 0 },
        { id: 'mono-2', color: '#0d0d0d', position: 100 }
      ]
    },
    {
      name: 'Candy',
      type: 'conic',
      angle: 0,
      stops: [
        { id: 'candy-1', color: '#ff9a9e', position: 0 },
        { id: 'candy-2', color: '#fad0c4', position: 35 },
        { id: 'candy-3', color: '#fbc2eb', position: 70 },
        { id: 'candy-4', color: '#a18cd1', position: 100 }
      ]
    }
  ];

  const MAX_STOPS = 8;
  const STORAGE_KEY = 'voidkit_gradient-generator_settings';

  let gradientType: GradientType = 'linear';
  let angle = 90;
  let stops: GradientStop[] = [
    { id: 'stop-1', color: '#ff6b6b', position: 0 },
    { id: 'stop-2', color: '#4d96ff', position: 100 }
  ];
  let previewCanvas: HTMLCanvasElement | null = null;
  let outputCss = '';
  let copyMessage = '';
  let draggedStopId: string | null = null;
  let hydrated = false;

  function nextId(): string {
    return `stop-${crypto.randomUUID()}`;
  }

  function normalizeStopColor(value: string): string {
    return normalizeHexColor(value) ?? '#ffffff';
  }

  function orderedStops(source: GradientStop[] = stops): GradientStop[] {
    return [...source].sort((left, right) => left.position - right.position);
  }

  function gradientCss(): string {
    const stopList = orderedStops()
      .map((stop) => `${stop.color} ${stop.position}%`)
      .join(', ');

    if (gradientType === 'radial') {
      return `background: radial-gradient(circle, ${stopList});`;
    }

    if (gradientType === 'conic') {
      return `background: conic-gradient(from ${angle}deg, ${stopList});`;
    }

    return `background: linear-gradient(${angle}deg, ${stopList});`;
  }

  function gradientSwatchDataUri(preset: GradientPreset): string {
    const stopMarkup = orderedStops(preset.stops)
      .map((stop) => `<stop offset="${stop.position}%" stop-color="${stop.color}" />`)
      .join('');

    const gradientId = `gradient-${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const gradientMarkup =
      preset.type === 'radial'
        ? `<radialGradient id="${gradientId}" cx="50%" cy="50%" r="60%">${stopMarkup}</radialGradient>`
        : `<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">${stopMarkup}</linearGradient>`;

    const fill = preset.type === 'radial' ? `url(#${gradientId})` : `url(#${gradientId})`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 64" preserveAspectRatio="none"><defs>${gradientMarkup}</defs><rect width="200" height="64" fill="${fill}"/></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function setPreset(preset: GradientPreset): void {
    gradientType = preset.type;
    angle = preset.angle;
    stops = preset.stops.map((stop) => ({ ...stop, color: normalizeStopColor(stop.color) }));
    copyMessage = '';
  }

  function applyStopColor(id: string, value: string): void {
    const normalized = normalizeHexColor(value);
    if (!normalized) {
      return;
    }

    stops = stops.map((stop) => (stop.id === id ? { ...stop, color: normalized } : stop));
  }

  function applyStopPosition(id: string, value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }

    stops = stops.map((stop) => (stop.id === id ? { ...stop, position: Math.min(100, Math.max(0, parsed)) } : stop));
  }

  function addStop(): void {
    if (stops.length >= MAX_STOPS) {
      return;
    }

    const sorted = orderedStops();
    const last = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2] ?? sorted[0];
    const position = Math.min(100, Math.round((last.position + previous.position) / 2));
    stops = [...stops, { id: nextId(), color: last.color, position }];
  }

  function removeStop(id: string): void {
    if (stops.length <= 2) {
      return;
    }

    stops = stops.filter((stop) => stop.id !== id);
  }

  function moveStop(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= stops.length) {
      return;
    }

    const next = [...stops];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    stops = next;
  }

  function handleDragStart(id: string, event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    }

    draggedStopId = id;
    const onMove = (moveEvent: MouseEvent): void => {
      if (!draggedStopId) {
        return;
      }

      const targetElement = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest('[data-stop-id]') as HTMLElement | null;
      const targetId = targetElement?.dataset.stopId;
      if (!targetId || targetId === draggedStopId) {
        return;
      }

      const fromIndex = stops.findIndex((stop) => stop.id === draggedStopId);
      const toIndex = stops.findIndex((stop) => stop.id === targetId);
      moveStop(fromIndex, toIndex);
      draggedStopId = targetId;
    };

    const onUp = (): void => {
      draggedStopId = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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
    const sorted = orderedStops();

    ctx.clearRect(0, 0, width, height);

    if (gradientType === 'linear') {
      const radians = ((angle - 90) * Math.PI) / 180;
      const x = Math.cos(radians);
      const y = Math.sin(radians);
      const length = Math.abs(width * x) + Math.abs(height * y);
      const x0 = width / 2 - (x * length) / 2;
      const y0 = height / 2 - (y * length) / 2;
      const x1 = width / 2 + (x * length) / 2;
      const y1 = height / 2 + (y * length) / 2;
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);

      sorted.forEach((stop) => {
        gradient.addColorStop(stop.position / 100, stop.color);
      });

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else if (gradientType === 'radial') {
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.max(width, height) / 1.2);

      sorted.forEach((stop) => {
        gradient.addColorStop(stop.position / 100, stop.color);
      });

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else {
      const gradient = typeof ctx.createConicGradient === 'function'
        ? ctx.createConicGradient(((angle - 90) * Math.PI) / 180, width / 2, height / 2)
        : null;

      if (gradient) {
        sorted.forEach((stop) => {
          gradient.addColorStop(stop.position / 100, stop.color);
        });

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = sorted[0]?.color ?? '#000000';
        ctx.fillRect(0, 0, width, height);
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    outputCss = gradientCss();
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
          type?: GradientType;
          angle?: number;
          stops?: GradientStop[];
        };

        if (parsed.type === 'linear' || parsed.type === 'radial' || parsed.type === 'conic') {
          gradientType = parsed.type;
        }

        if (Number.isFinite(parsed.angle)) {
          angle = Math.min(360, Math.max(0, parsed.angle ?? angle));
        }

        if (Array.isArray(parsed.stops) && parsed.stops.length >= 2) {
          stops = parsed.stops
            .slice(0, MAX_STOPS)
            .map((stop, index) => ({
              id: stop.id || `stop-${index}`,
              color: normalizeStopColor(stop.color),
              position: Math.min(100, Math.max(0, Number(stop.position) || 0))
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ type: gradientType, angle, stops }));
    drawPreview();
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel" aria-label="Gradient preview">
    <canvas bind:this={previewCanvas} width="960" height="160" aria-label="Gradient preview canvas"></canvas>
  </section>

  <section class="panel" aria-label="Gradient type and angle">
    <div class="field">
      <label for="gradient-type">Type</label>
      <select id="gradient-type" bind:value={gradientType}>
        <option value="linear">Linear</option>
        <option value="radial">Radial</option>
        <option value="conic">Conic</option>
      </select>
    </div>

    {#if gradientType === 'linear'}
      <div class="field">
        <div class="field-head">
          <label for="gradient-angle-range">Angle: {angle}°</label>
          <span class="muted">0-360°</span>
        </div>
        <input id="gradient-angle-range" type="range" min="0" max="360" bind:value={angle} />
        <input id="gradient-angle-number" type="number" min="0" max="360" bind:value={angle} />
      </div>
    {:else if gradientType === 'conic'}
      <div class="field">
        <div class="field-head">
          <label for="gradient-angle-conic">Rotation: {angle}°</label>
          <span class="muted">Used as start angle</span>
        </div>
        <input id="gradient-angle-conic" type="range" min="0" max="360" bind:value={angle} />
        <input type="number" min="0" max="360" bind:value={angle} />
      </div>
    {/if}
  </section>

  <section class="panel" aria-label="Gradient stops">
    <div class="section-head">
      <h2>Color Stops</h2>
      <div class="section-actions">
        <button type="button" on:click={addStop} disabled={stops.length >= MAX_STOPS}>Add stop</button>
      </div>
    </div>

    <div class="stop-list">
      {#each stops as stop, index (stop.id)}
        <article class="stop-card" data-stop-id={stop.id}>
          <div class="stop-head">
            <button type="button" class="drag-handle" on:mousedown={(event) => handleDragStart(stop.id, event)}>Drag</button>
            <span class="muted">Stop {index + 1}</span>
            <button type="button" on:click={() => removeStop(stop.id)} disabled={stops.length <= 2}>Remove</button>
          </div>

          <div class="stop-fields">
            <input type="color" value={stop.color} on:input={(event) => applyStopColor(stop.id, (event.currentTarget as HTMLInputElement).value)} aria-label={`Stop ${index + 1} color picker`} />
            <input type="text" value={stop.color} on:input={(event) => applyStopColor(stop.id, (event.currentTarget as HTMLInputElement).value)} spellcheck="false" aria-label={`Stop ${index + 1} hex input`} />
          </div>

          <div class="field">
            <div class="field-head">
              <label for={`stop-${stop.id}`}>Position: {stop.position}%</label>
            </div>
            <input id={`stop-${stop.id}`} type="range" min="0" max="100" bind:value={stop.position} on:input={(event) => applyStopPosition(stop.id, (event.currentTarget as HTMLInputElement).value)} />
          </div>
        </article>
      {/each}
    </div>
  </section>

  <section class="panel" aria-label="Gradient presets">
    <div class="section-head">
      <h2>Presets</h2>
      <span class="muted">Click a swatch to load it</span>
    </div>

    <div class="preset-grid">
      {#each PRESETS as preset}
        <button type="button" class="preset-item" on:click={() => setPreset(preset)} aria-label={`Load ${preset.name} preset`}>
          <img src={gradientSwatchDataUri(preset)} alt="" aria-hidden="true" />
          <span>{preset.name}</span>
        </button>
      {/each}
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <button type="button" class="primary" on:click={copyCss}>Copy CSS</button>
    </div>

    <textarea readonly rows="5" bind:value={outputCss}></textarea>
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

  canvas {
    width: 100%;
    height: auto;
    display: block;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: #111111;
  }

  .field {
    display: grid;
    gap: var(--space-1);
  }

  .field-head,
  .section-head,
  .output-head,
  .stop-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .section-actions {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .stop-list {
    display: grid;
    gap: var(--space-2);
  }

  .stop-card {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #111111;
  }

  .drag-handle {
    cursor: grab;
  }

  .stop-fields {
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

  input[type='text'],
  input[type='number'],
  select,
  textarea {
    width: 100%;
  }

  .preset-grid {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .preset-item {
    display: grid;
    gap: 6px;
    padding: var(--space-1);
    text-align: left;
    background: transparent;
  }

  .preset-item img {
    display: block;
    width: 100%;
    height: 48px;
    border-radius: 4px;
    border: 1px solid var(--border);
  }

  .preset-item span {
    color: var(--text-muted);
    font-size: 13px;
  }

  .primary {
    border-color: var(--accent);
    color: var(--accent);
  }

  .muted {
    color: var(--text-muted);
    font-size: 14px;
  }

  .copy-status {
    color: var(--accent);
    min-height: 21px;
  }

  textarea {
    min-height: 120px;
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
    .preset-grid,
    .stop-fields {
      grid-template-columns: 1fr;
    }
  }
</style>
