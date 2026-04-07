<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import { onMount } from 'svelte';

  export let tool: Tool;

  let count = 5;
  let uppercase = false;
  let uuids: string[] = [];
  let displayedUuids: string[] = [];
  let copyMessage = '';

  function formatValue(value: string): string {
    return uppercase ? value.toUpperCase() : value.toLowerCase();
  }

  function generate(): void {
    if (!browser) return;

    uuids = Array.from({ length: count }, () => crypto.randomUUID());
    copyMessage = '';
  }

  $: displayedUuids = uuids.map((value) => formatValue(value));

  onMount(() => {
    generate();
  });

  async function copyAll(): Promise<void> {
    if (!browser || displayedUuids.length === 0) return;

    await navigator.clipboard.writeText(displayedUuids.join('\n'));
    copyMessage = 'Copied.';
  }

  async function copyOne(value: string): Promise<void> {
    if (!browser) return;

    await navigator.clipboard.writeText(value);
    copyMessage = 'Copied.';
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel" aria-label="UUID generator input section">
    <div class="field short">
      <label for="uuid-count">How many UUIDs (1-50)</label>
      <input id="uuid-count" type="number" min="1" max="50" bind:value={count} />
    </div>

    <label class="toggle"><input type="checkbox" bind:checked={uppercase} /> Uppercase output</label>

    <button class="primary" type="button" on:click={generate}>Regenerate</button>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <button type="button" on:click={copyAll} disabled={displayedUuids.length === 0}>Copy all</button>
    </div>

    {#if displayedUuids.length === 0}
      <p class="muted">No UUIDs generated yet.</p>
    {:else}
      <ul>
        {#each displayedUuids as value}
          <li>
            <code>{value}</code>
            <button type="button" on:click={() => copyOne(value)}>Copy</button>
          </li>
        {/each}
      </ul>
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

  .short {
    max-width: 260px;
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--text-muted);
    font-size: 14px;
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

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--space-1);
  }

  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-1);
    align-items: center;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-1);
  }

  code {
    color: var(--text-primary);
    word-break: break-all;
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

  @media (max-width: 700px) {
    li {
      grid-template-columns: 1fr;
    }
  }
</style>