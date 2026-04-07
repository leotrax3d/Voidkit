<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';

  export let tool: Tool;

  let text = '';
  let copyMessage = '';
  let charactersWithSpaces = 0;
  let charactersWithoutSpaces = 0;
  let words = 0;
  let sentences = 0;
  let paragraphs = 0;
  let lines = 0;
  let readingMinutes = 0;

  function countWords(value: string): number {
    return value.trim().match(/\S+/g)?.length ?? 0;
  }

  function countSentences(value: string): number {
    const trimmed = value.trim();
    if (trimmed.length === 0) return 0;

    const matches = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    return matches ? matches.filter((entry) => entry.trim().length > 0).length : 0;
  }

  function countParagraphs(value: string): number {
    const trimmed = value.trim();
    if (trimmed.length === 0) return 0;

    return trimmed.split(/\n\s*\n+/).filter((paragraph) => paragraph.trim().length > 0).length;
  }

  function countLines(value: string): number {
    if (value.length === 0) return 0;

    return value.split(/\r?\n/).length;
  }

  $: charactersWithSpaces = text.length;
  $: charactersWithoutSpaces = text.replace(/\s/g, '').length;
  $: words = countWords(text);
  $: sentences = countSentences(text);
  $: paragraphs = countParagraphs(text);
  $: lines = countLines(text);
  $: readingMinutes = Math.ceil(words / 200);
  $: statCards = [
    { label: 'Characters (with spaces)', value: charactersWithSpaces.toString() },
    { label: 'Characters (without spaces)', value: charactersWithoutSpaces.toString() },
    { label: 'Words', value: words.toString() },
    { label: 'Sentences', value: sentences.toString() },
    { label: 'Paragraphs', value: paragraphs.toString() },
    { label: 'Lines', value: lines.toString() },
    { label: 'Reading time', value: `~${readingMinutes} min read` }
  ];

  async function copyText(): Promise<void> {
    if (!browser || text.length === 0) return;

    try {
      await navigator.clipboard.writeText(text);
      copyMessage = 'Copied.';
    } catch {
      copyMessage = 'Copy failed.';
    }
  }

  function clearText(): void {
    text = '';
    copyMessage = '';
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel field" aria-label="Character counter input section">
    <label for="character-counter-input">Text</label>
    <textarea id="character-counter-input" bind:value={text} rows="10"></textarea>
    <div class="actions">
      <button class="primary" type="button" on:click={copyText} disabled={text.length === 0}>Copy text</button>
      <button type="button" on:click={clearText}>Clear</button>
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Stats</h2>
      <span class="muted">Live updates on every keystroke</span>
    </div>

    <div class="stats-grid">
      {#each statCards as stat}
        <article class="stat-card">
          <span class="stat-label">{stat.label}</span>
          <span class="stat-value">{stat.value}</span>
        </article>
      {/each}
    </div>

    <p class="copy-status">{copyMessage}</p>
  </section>
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 980px;
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
    gap: var(--space-1);
  }

  textarea {
    width: 100%;
    min-height: 200px;
    resize: vertical;
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

  .stats-grid {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .stat-card {
    display: grid;
    gap: 6px;
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #111111;
  }

  .stat-label {
    color: var(--text-muted);
    font-size: 13px;
  }

  .stat-value {
    color: var(--text-primary);
    font-size: 18px;
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
</style>