<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';

  export let tool: Tool;

  let inputText = '';
  let lastItems: string[] = [];
  let shuffled: string[] = [];
  let copyMessage = '';

  function parseItems(text: string): string[] {
    return text
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  function fisherYates(source: string[]): string[] {
    const next = [...source];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
    }
    return next;
  }

  function shuffle(): void {
    copyMessage = '';
    const parsed = parseItems(inputText);
    lastItems = parsed;
    shuffled = parsed.length > 0 ? fisherYates(parsed) : [];
  }

  function shuffleAgain(): void {
    copyMessage = '';
    if (lastItems.length === 0) {
      return;
    }
    shuffled = fisherYates(lastItems);
  }

  async function copyOutput(): Promise<void> {
    if (!browser || shuffled.length === 0) {
      return;
    }

    const text = shuffled.map((item, index) => `${index + 1}. ${item}`).join('\n');

    try {
      await navigator.clipboard.writeText(text);
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

  <section class="panel" aria-label="List input">
    <div class="field">
      <label for="list-items">Items (one per line)</label>
      <textarea id="list-items" bind:value={inputText} rows="10"></textarea>
    </div>

    <div class="actions">
      <button class="primary" type="button" on:click={shuffle}>Shuffle</button>
      <button type="button" on:click={shuffleAgain} disabled={lastItems.length === 0}>
        Shuffle again
      </button>
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Output</h2>
      <button type="button" on:click={copyOutput} disabled={shuffled.length === 0}>Copy</button>
    </div>

    {#if shuffled.length === 0}
      <p class="muted">No shuffled list yet.</p>
    {:else}
      <ol>
        {#each shuffled as item}
          <li>{item}</li>
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

  textarea {
    width: 100%;
    resize: vertical;
    min-height: 160px;
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
</style>
