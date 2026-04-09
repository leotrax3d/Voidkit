<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import { onMount } from 'svelte';

  export let tool: Tool;

  const STORAGE_KEY = 'voidkit_random-number_inputs';

  let min = 1;
  let max = 100;
  let count = 1;

  let errors: string[] = [];
  let results: number[] = [];
  let copyMessage = '';
  let hydrated = false;

  $: if (browser && hydrated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ min, max, count }));
  }

  onMount(() => {
    if (!browser) {
      hydrated = true;
      return;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      hydrated = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { min?: unknown; max?: unknown; count?: unknown };
      const nextMin = Number(parsed.min);
      const nextMax = Number(parsed.max);
      const nextCount = Number(parsed.count);

      if (Number.isFinite(nextMin)) min = nextMin;
      if (Number.isFinite(nextMax)) max = nextMax;
      if (Number.isFinite(nextCount)) count = nextCount;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      hydrated = true;
    }
  });

  function validateInputs(): boolean {
    const nextErrors: string[] = [];

    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(count)) {
      nextErrors.push('All inputs must be valid numbers.');
    }

    if (min >= max) {
      nextErrors.push('Min must be less than Max.');
    }

    if (!Number.isInteger(count) || count < 1 || count > 100) {
      nextErrors.push('Count must be an integer between 1 and 100.');
    }

    errors = nextErrors;
    return nextErrors.length === 0;
  }

  function generate(): void {
    copyMessage = '';

    if (!validateInputs()) {
      results = [];
      return;
    }

    const generated: number[] = [];
    for (let index = 0; index < count; index += 1) {
      generated.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }

    results = generated;
  }

  async function copyResults(): Promise<void> {
    if (!browser || results.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(results.join(', '));
      copyMessage = 'Copied.';
    } catch {
      copyMessage = 'Copy failed.';
    }
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <form class="panel" on:submit|preventDefault={generate} aria-label="Random number inputs">
    <div class="fields">
      <div class="field">
        <label for="rng-min">Min</label>
        <input id="rng-min" type="number" bind:value={min} required />
      </div>

      <div class="field">
        <label for="rng-max">Max</label>
        <input id="rng-max" type="number" bind:value={max} required />
      </div>

      <div class="field">
        <label for="rng-count">Count</label>
        <input id="rng-count" type="number" bind:value={count} min="1" max="100" required />
      </div>
    </div>

    <button class="primary" type="submit">Generate</button>
  </form>

  {#if errors.length > 0}
    <div class="panel errors" aria-live="polite">
      {#each errors as error}
        <p>{error}</p>
      {/each}
    </div>
  {/if}

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Output</h2>
      <button type="button" on:click={copyResults} disabled={results.length === 0}>Copy</button>
    </div>

    {#if results.length === 0}
      <p class="muted">No values generated yet.</p>
    {:else}
      <ol>
        {#each results as value}
          <li>{value}</li>
        {/each}
      </ol>
    {/if}

    <p class="copy-status">{copyMessage}</p>
  </section>
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 880px;
  }

  .tool-header {
    display: grid;
    gap: var(--space-1);
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
    color: var(--text-muted);
    font-size: 14px;
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

  .fields {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .field {
    display: grid;
    gap: var(--space-1);
  }

  .primary {
    border-color: var(--accent);
    color: var(--accent);
    justify-self: start;
  }

  .output-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
  }

  .errors p {
    color: var(--error-text);
  }

  ol {
    margin: 0;
    padding-left: 22px;
    display: grid;
    gap: var(--space-1);
  }

  .copy-status {
    color: var(--accent);
    min-height: 21px;
  }

  @media (max-width: 720px) {
    .fields {
      grid-template-columns: 1fr;
    }
  }
</style>
