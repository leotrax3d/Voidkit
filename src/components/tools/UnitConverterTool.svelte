<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import { onMount } from 'svelte';

  export let tool: Tool;

  const CATEGORY_ORDER = [
    'Length',
    'Weight',
    'Temperature',
    'Area',
    'Volume',
    'Speed',
    'Data'
  ] as const;

  type CategoryName = (typeof CATEGORY_ORDER)[number];
  type UnitPair = { from: string; to: string };

  const STORAGE_KEY = 'voidkit_unit-converter_settings';

  const UNIT_OPTIONS: Record<CategoryName, readonly string[]> = {
    Length: ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi'],
    Weight: ['mg', 'g', 'kg', 't', 'oz', 'lb'],
    Temperature: ['°C', '°F', 'K'],
    Area: ['mm²', 'cm²', 'm²', 'km²', 'in²', 'ft²', 'ac', 'ha'],
    Volume: ['ml', 'cl', 'dl', 'l', 'fl oz', 'cup', 'pt', 'qt', 'gal'],
    Speed: ['m/s', 'km/h', 'mph', 'knots'],
    Data: ['bit', 'byte', 'KB', 'MB', 'GB', 'TB', 'PB']
  };

  const LENGTH_FACTORS: Record<string, number> = {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000,
    in: 0.0254,
    ft: 0.3048,
    yd: 0.9144,
    mi: 1609.344
  };

  const WEIGHT_FACTORS: Record<string, number> = {
    mg: 0.001,
    g: 1,
    kg: 1000,
    t: 1000000,
    oz: 28.349523125,
    lb: 453.59237
  };

  const AREA_FACTORS: Record<string, number> = {
    'mm²': 0.000001,
    'cm²': 0.0001,
    'm²': 1,
    'km²': 1000000,
    'in²': 0.00064516,
    'ft²': 0.09290304,
    ac: 4046.8564224,
    ha: 10000
  };

  const VOLUME_FACTORS: Record<string, number> = {
    ml: 0.001,
    cl: 0.01,
    dl: 0.1,
    l: 1,
    'fl oz': 0.0295735295625,
    cup: 0.2365882365,
    pt: 0.473176473,
    qt: 0.946352946,
    gal: 3.785411784
  };

  const SPEED_FACTORS: Record<string, number> = {
    'm/s': 1,
    'km/h': 1000 / 3600,
    mph: 1609.344 / 3600,
    knots: 1852 / 3600
  };

  const DATA_FACTORS: Record<string, number> = {
    bit: 0.125,
    byte: 1,
    KB: 1000,
    MB: 1000000,
    GB: 1000000000,
    TB: 1000000000000,
    PB: 1000000000000000
  };

  let activeCategory: CategoryName = 'Length';
  let settings: Record<CategoryName, UnitPair> = createDefaultSettings();
  let fromUnit = settings[activeCategory].from;
  let toUnit = settings[activeCategory].to;
  let fromValue = '1';
  let toValue = '';
  let errorMessage = '';
  let copyMessage = '';
  let hydrated = false;
  let lastEdited: 'from' | 'to' = 'from';

  function createDefaultSettings(): Record<CategoryName, UnitPair> {
    return CATEGORY_ORDER.reduce((acc, category) => {
      const [from, to] = UNIT_OPTIONS[category];
      acc[category] = { from, to };
      return acc;
    }, {} as Record<CategoryName, UnitPair>);
  }

  function isCategoryName(value: string): value is CategoryName {
    return CATEGORY_ORDER.includes(value as CategoryName);
  }

  function normalizeNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return '';
    }

    const rounded = Number(value.toFixed(12));
    if (Number.isInteger(rounded)) {
      return String(rounded);
    }

    return rounded.toString().replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
  }

  function parseNumericInput(value: string): number | undefined {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function convertTemperature(value: number, from: string, to: string): number {
    let celsius = value;

    if (from === '°F') {
      celsius = (value - 32) * (5 / 9);
    } else if (from === 'K') {
      celsius = value - 273.15;
    }

    if (to === '°F') {
      return celsius * (9 / 5) + 32;
    }

    if (to === 'K') {
      return celsius + 273.15;
    }

    return celsius;
  }

  function baseFactor(category: CategoryName, unit: string): number {
    const factorMap =
      category === 'Length'
        ? LENGTH_FACTORS
        : category === 'Weight'
          ? WEIGHT_FACTORS
          : category === 'Area'
            ? AREA_FACTORS
            : category === 'Volume'
              ? VOLUME_FACTORS
              : category === 'Speed'
                ? SPEED_FACTORS
                : DATA_FACTORS;

    return factorMap[unit] ?? 1;
  }

  function convertValue(category: CategoryName, value: number, from: string, to: string): number {
    if (category === 'Temperature') {
      return convertTemperature(value, from, to);
    }

    const baseValue = value * baseFactor(category, from);
    return baseValue / baseFactor(category, to);
  }

  function sourceSummary(): string {
    const sourceValue = lastEdited === 'from' ? fromValue : toValue;
    const targetValue = lastEdited === 'from' ? toValue : fromValue;
    const sourceUnit = lastEdited === 'from' ? fromUnit : toUnit;
    const targetUnit = lastEdited === 'from' ? toUnit : fromUnit;

    return `${sourceValue} ${sourceUnit} = ${targetValue} ${targetUnit}`;
  }

  function recalculateFromSource(source: 'from' | 'to'): void {
    const sourceText = source === 'from' ? fromValue : toValue;
    const parsed = parseNumericInput(sourceText);

    if (parsed === undefined) {
      errorMessage = sourceText.trim().length === 0 ? '' : 'Enter a valid number.';

      if (source === 'from') {
        toValue = '';
      } else {
        fromValue = '';
      }

      return;
    }

    const converted = convertValue(activeCategory, parsed, source === 'from' ? fromUnit : toUnit, source === 'from' ? toUnit : fromUnit);

    if (source === 'from') {
      toValue = normalizeNumber(converted);
    } else {
      fromValue = normalizeNumber(converted);
    }

    errorMessage = '';
  }

  function applyCategory(category: CategoryName): void {
    if (category === activeCategory) {
      return;
    }

    settings[activeCategory] = { from: fromUnit, to: toUnit };
    activeCategory = category;

    const next = settings[category] ?? createDefaultSettings()[category];
    fromUnit = next.from;
    toUnit = next.to;
    recalculateFromSource(lastEdited);
    copyMessage = '';
  }

  function updateFromUnit(value: string): void {
    fromUnit = value;
    settings[activeCategory] = { from: fromUnit, to: toUnit };
    recalculateFromSource(lastEdited);
    copyMessage = '';
  }

  function updateToUnit(value: string): void {
    toUnit = value;
    settings[activeCategory] = { from: fromUnit, to: toUnit };
    recalculateFromSource(lastEdited);
    copyMessage = '';
  }

  function syncFromInput(): void {
    lastEdited = 'from';
    recalculateFromSource('from');
    copyMessage = '';
  }

  function syncToInput(): void {
    lastEdited = 'to';
    recalculateFromSource('to');
    copyMessage = '';
  }

  function swapUnits(): void {
    [fromUnit, toUnit] = [toUnit, fromUnit];
    [fromValue, toValue] = [toValue, fromValue];
    lastEdited = 'from';
    settings[activeCategory] = { from: fromUnit, to: toUnit };
    copyMessage = '';
    recalculateFromSource('from');
  }

  async function copyResult(): Promise<void> {
    if (!browser || fromValue.trim().length === 0 || toValue.trim().length === 0 || errorMessage.length > 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sourceSummary());
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
          activeCategory?: string;
          settings?: Partial<Record<CategoryName, UnitPair>>;
        };

        const defaults = createDefaultSettings();
        settings = CATEGORY_ORDER.reduce((acc, category) => {
          const saved = parsed.settings?.[category];
          const fallback = defaults[category];
          acc[category] = {
            from: UNIT_OPTIONS[category].includes(saved?.from ?? '') ? (saved?.from as string) : fallback.from,
            to: UNIT_OPTIONS[category].includes(saved?.to ?? '') ? (saved?.to as string) : fallback.to
          };
          return acc;
        }, {} as Record<CategoryName, UnitPair>);

        if (parsed.activeCategory && isCategoryName(parsed.activeCategory)) {
          activeCategory = parsed.activeCategory;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    fromUnit = settings[activeCategory].from;
    toUnit = settings[activeCategory].to;
    hydrated = true;
    recalculateFromSource('from');
  });

  $: if (browser && hydrated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeCategory, settings }));
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel tabs" aria-label="Conversion categories">
    {#each CATEGORY_ORDER as category}
      <button type="button" class:active={activeCategory === category} on:click={() => applyCategory(category)}>
        {category}
      </button>
    {/each}
  </section>

  <section class="panel input-panel" aria-label="Unit conversion inputs">
    <div class="pair-grid">
      <div class="field">
        <label for="unit-from">FROM</label>
        <select id="unit-from" bind:value={fromUnit} on:change={(event) => updateFromUnit((event.currentTarget as HTMLSelectElement).value)}>
          {#each UNIT_OPTIONS[activeCategory] as unit}
            <option value={unit}>{unit}</option>
          {/each}
        </select>
        <input
          id="unit-from-value"
          type="text"
          inputmode="decimal"
          bind:value={fromValue}
          on:input={syncFromInput}
          aria-label="From value"
        />
      </div>

      <div class="field">
        <label for="unit-to">TO</label>
        <select id="unit-to" bind:value={toUnit} on:change={(event) => updateToUnit((event.currentTarget as HTMLSelectElement).value)}>
          {#each UNIT_OPTIONS[activeCategory] as unit}
            <option value={unit}>{unit}</option>
          {/each}
        </select>
        <input
          id="unit-to-value"
          type="text"
          inputmode="decimal"
          bind:value={toValue}
          on:input={syncToInput}
          aria-label="To value"
        />
      </div>
    </div>

    <div class="actions">
      <button type="button" on:click={swapUnits}>Swap FROM/TO</button>
      <button class="primary" type="button" on:click={copyResult} disabled={errorMessage.length > 0 || fromValue.trim().length === 0 || toValue.trim().length === 0}>
        Copy result
      </button>
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <span class="muted">Live conversion in both directions</span>
    </div>

    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {:else}
      <p class="result-text">{sourceSummary()}</p>
    {/if}

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

  .tabs {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .tabs button.active {
    border-color: var(--accent);
    color: var(--accent);
  }

  .pair-grid {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field {
    display: grid;
    gap: var(--space-1);
  }

  input,
  select {
    width: 100%;
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

  .output-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .result-text {
    font-size: 16px;
    color: var(--text-primary);
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

  @media (max-width: 820px) {
    .pair-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
