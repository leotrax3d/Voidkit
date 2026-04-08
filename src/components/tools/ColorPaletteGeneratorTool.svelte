<script lang="ts">
	import { browser } from '$app/environment';
	import type { Tool } from '$lib/types';
	import { copy } from '$lib/actions/copy';
	import { onMount } from 'svelte';
	import {
		generatePalette,
		paletteModeLabel,
		type PaletteMode,
		type PaletteShade
	} from '$lib/utils/palette';
	import { normalizeHexColor, rgbToHex } from '$lib/utils/color';

	export let tool: Tool;

	const STORAGE_KEY = 'voidkit_color-palette-generator';
	const MODE_OPTIONS: { value: PaletteMode; label: string; description: string }[] = [
		{ value: 'monochromatic', label: 'Monochromatic', description: 'One hue, multiple depth levels.' },
		{ value: 'analog', label: 'Analog', description: 'Neighboring hues with a cohesive feel.' },
		{ value: 'complementary', label: 'Complementary', description: 'Base color plus its opposite.' },
		{ value: 'triadic', label: 'Triadic', description: 'Three evenly spaced hues.' },
		{ value: 'tetradic', label: 'Tetradic', description: 'Four evenly balanced hues.' }
	];

	let baseHex = '#7c3aed';
	let baseInput = baseHex;
	let basePicker = baseHex;
	let mode: PaletteMode = 'monochromatic';
	let hydrated = false;
	let palette = generatePalette(baseHex, mode);
	let copiedMessage = '';

	function refreshPalette(): void {
		palette = generatePalette(baseHex, mode);
		if (hydrated && browser) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseHex, mode }));
		}
	}

	function applyBaseHex(value: string): void {
		baseInput = value;
		const normalized = normalizeHexColor(value);
		if (!normalized) {
			return;
		}

		baseHex = normalized;
		basePicker = normalized;
		baseInput = normalized;
		refreshPalette();
	}

	function applyPicker(value: string): void {
		const normalized = normalizeHexColor(value);
		if (!normalized) {
			return;
		}

		baseHex = normalized;
		baseInput = normalized;
		basePicker = normalized;
		refreshPalette();
	}

	function setMode(nextMode: PaletteMode): void {
		mode = nextMode;
		refreshPalette();
	}

	function shuffleBaseColor(): void {
		const randomColor = rgbToHex({
			r: Math.floor(Math.random() * 256),
			g: Math.floor(Math.random() * 256),
			b: Math.floor(Math.random() * 256)
		});

		applyPicker(randomColor);
	}

	function copyFeedback(message: string): void {
		copiedMessage = message;
		setTimeout(() => {
			if (copiedMessage === message) {
				copiedMessage = '';
			}
		}, 1500);
	}

	function flattenPaletteCss(): string {
		return palette.cssVariables;
	}

	function flattenPaletteJson(): string {
		return palette.json;
	}

	function swatchButtonLabel(groupLabel: string, shade: PaletteShade): string {
		return `Copy ${groupLabel} ${shade.step}`;
	}

	onMount(() => {
		if (!browser) {
			return;
		}

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as { baseHex?: string; mode?: PaletteMode };
				const storedHex = parsed.baseHex ? normalizeHexColor(parsed.baseHex) : undefined;
				if (storedHex) {
					baseHex = storedHex;
					baseInput = storedHex;
					basePicker = storedHex;
				}

				if (parsed.mode) {
					mode = parsed.mode;
				}
			}
		} catch {
			// ignore invalid persisted state
		}

		hydrated = true;
		refreshPalette();
	});
</script>

<section class="tool-page" aria-label={tool.name}>
	<header class="tool-header">
		<h1>{tool.name}</h1>
		<p>{tool.description}</p>
	</header>

	<div class="divider"></div>

	<section class="panel controls" aria-label="Palette controls">
		<div class="control-group">
			<label for="palette-picker">Base color</label>
			<div class="picker-row">
				<input id="palette-picker" type="color" value={basePicker} on:input={(event) => applyPicker((event.currentTarget as HTMLInputElement).value)} aria-label="Base color picker" />
				<input type="text" value={baseInput} on:input={(event) => applyBaseHex((event.currentTarget as HTMLInputElement).value)} spellcheck="false" aria-label="Base hex input" />
			</div>
		</div>

		<div class="control-group">
			<span class="label">Harmony</span>
			<div class="mode-grid" role="tablist" aria-label="Palette harmony modes">
				{#each MODE_OPTIONS as option}
					<button
						type="button"
						class:active={mode === option.value}
						on:click={() => setMode(option.value)}
						aria-pressed={mode === option.value}
						aria-label={`${option.label} palette: ${option.description}`}
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>

		<div class="control-group export-group">
			<button type="button" class="primary" on:click={shuffleBaseColor}>Shuffle / Neu generieren</button>
			<button type="button" use:copy={flattenPaletteCss} on:click={() => copyFeedback('CSS copied.')}>Copy CSS</button>
			<button type="button" use:copy={flattenPaletteJson} on:click={() => copyFeedback('JSON copied.')}>Copy JSON</button>
		</div>
	</section>

	<section class="panel palette-output" aria-live="polite">
		<div class="output-head">
			<div>
				<h2>{paletteModeLabel(mode)}</h2>
				<p class="muted">Base {palette.baseHex} · {palette.groups.length} hues · 10 shades each</p>
			</div>
			<p class="copy-status">{copiedMessage}</p>
		</div>

		<div class="palette-grid">
			{#each palette.groups as group}
				<section class="hue-group" aria-label={group.label}>
					<header class="group-header">
						<h3>{group.label}</h3>
						<span class="muted">Hue {Math.round(group.hue)}</span>
					</header>

					<div class="shade-grid">
						{#each group.shades as shade}
							<article class="shade-card">
								<div class="swatch-row">
									<svg viewBox="0 0 48 48" class="swatch" aria-hidden="true">
										<rect x="0" y="0" width="48" height="48" fill={shade.hex} rx="8" />
									</svg>
									<div class="shade-meta">
										<strong>{shade.step}</strong>
										<p>{shade.hex}</p>
									</div>
								</div>

								<div class="shade-values">
									<button type="button" use:copy={shade.hex} on:click={() => copyFeedback(`${shade.step} copied.`)} aria-label={swatchButtonLabel(group.label, shade)}>Copy</button>
									<span>{shade.whiteTextRating} on white · {shade.blackTextRating} on black</span>
								</div>

								<dl class="swatch-details">
									<div>
										<dt>RGB</dt>
										<dd>rgb({shade.rgb.r}, {shade.rgb.g}, {shade.rgb.b})</dd>
									</div>
									<div>
										<dt>HSL</dt>
										<dd>hsl({Math.round(shade.hsl.h)}, {Math.round(shade.hsl.s)}%, {Math.round(shade.hsl.l)}%)</dd>
									</div>
									<div>
										<dt>Contrast</dt>
										<dd>{shade.contrastOnWhite.toFixed(2)} / {shade.contrastOnBlack.toFixed(2)}</dd>
									</div>
								</dl>
							</article>
						{/each}
					</div>
				</section>
			{/each}
		</div>

		<section class="panel export-preview" aria-label="Palette exports">
			<div class="export-columns">
				<div>
					<h3>CSS Custom Properties</h3>
					<pre><code>{flattenPaletteCss()}</code></pre>
				</div>
				<div>
					<h3>JSON</h3>
					<pre><code>{flattenPaletteJson()}</code></pre>
				</div>
			</div>
		</section>
	</section>
</section>

<style>
	.tool-page {
		display: grid;
		gap: var(--space-2);
		max-width: 1200px;
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

	.controls {
		grid-template-columns: 1.3fr 1.7fr 1fr;
		align-items: start;
	}

	.control-group {
		display: grid;
		gap: var(--space-1);
	}

	.picker-row {
		display: grid;
		gap: var(--space-1);
		grid-template-columns: auto 1fr;
	}

	.label,
	label,
	h2,
	h3,
	dt,
	dd,
	p {
		margin: 0;
	}

	.label,
	label {
		font-size: 12px;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.mode-grid {
		display: grid;
		gap: var(--space-1);
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	}

	.mode-grid button.active {
		border-color: var(--accent);
		color: var(--accent);
	}

	.export-group {
		align-content: start;
	}

	.palette-output {
		gap: var(--space-3);
	}

	.output-head,
	.group-header,
	.swatch-row,
	.shade-values {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-1);
	}

	.copy-status,
	.muted {
		color: var(--text-muted);
		font-size: 12px;
	}

	.palette-grid {
		display: grid;
		gap: var(--space-3);
	}

	.hue-group {
		display: grid;
		gap: var(--space-2);
	}

	.shade-grid {
		display: grid;
		gap: var(--space-2);
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}

	.shade-card {
		display: grid;
		gap: var(--space-1);
		padding: var(--space-1);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: #111111;
	}

	.swatch {
		width: 48px;
		height: 48px;
		flex: 0 0 auto;
	}

	.shade-meta {
		display: grid;
		gap: 2px;
	}

	.shade-meta p,
	.swatch-details dd {
		font-size: 12px;
		color: var(--text-muted);
		word-break: break-word;
	}

	.swatch-details {
		display: grid;
		gap: var(--space-1);
	}

	.swatch-details div {
		display: grid;
		gap: 2px;
	}

	.swatch-details dt {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.export-columns {
		display: grid;
		gap: var(--space-2);
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	pre {
		margin: 0;
		padding: var(--space-2);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: #0f0f0f;
		overflow-x: auto;
		font-size: 12px;
		color: var(--text-primary);
	}

	@media (max-width: 980px) {
		.controls,
		.export-columns {
			grid-template-columns: 1fr;
		}
	}
</style>
