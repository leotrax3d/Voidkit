<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';

  export let tool: Tool;

  type DiffLine = {
    type: 'added' | 'removed' | 'unchanged';
    text: string;
  };

  let originalText = '';
  let modifiedText = '';
  let diffLines: DiffLine[] = [];
  let compared = false;
  let copyMessage = '';
  let addedCount = 0;
  let removedCount = 0;
  let diffOutput = '';

  function buildDiff(original: string[], modified: string[]): DiffLine[] {
    const rows = original.length;
    const columns = modified.length;
    const table = Array.from({ length: rows + 1 }, () => Array<number>(columns + 1).fill(0));

    for (let row = rows - 1; row >= 0; row -= 1) {
      for (let column = columns - 1; column >= 0; column -= 1) {
        table[row][column] =
          original[row] === modified[column]
            ? table[row + 1][column + 1] + 1
            : Math.max(table[row + 1][column], table[row][column + 1]);
      }
    }

    const diff: DiffLine[] = [];
    let row = 0;
    let column = 0;

    while (row < rows && column < columns) {
      if (original[row] === modified[column]) {
        diff.push({ type: 'unchanged', text: original[row] });
        row += 1;
        column += 1;
        continue;
      }

      if (table[row + 1][column] >= table[row][column + 1]) {
        diff.push({ type: 'removed', text: original[row] });
        row += 1;
      } else {
        diff.push({ type: 'added', text: modified[column] });
        column += 1;
      }
    }

    while (row < rows) {
      diff.push({ type: 'removed', text: original[row] });
      row += 1;
    }

    while (column < columns) {
      diff.push({ type: 'added', text: modified[column] });
      column += 1;
    }

    return diff;
  }

  function compare(): void {
    const originalLines = originalText.split(/\r?\n/);
    const modifiedLines = modifiedText.split(/\r?\n/);

    diffLines = buildDiff(originalLines, modifiedLines);
    addedCount = diffLines.filter((line) => line.type === 'added').length;
    removedCount = diffLines.filter((line) => line.type === 'removed').length;
    diffOutput = diffLines
      .map((line) => {
        const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
        return `${prefix} ${line.text}`;
      })
      .join('\n');
    compared = true;
    copyMessage = '';
  }

  async function copyDiff(): Promise<void> {
    if (!browser || diffOutput.length === 0) return;

    try {
      await navigator.clipboard.writeText(diffOutput);
      copyMessage = 'Copied.';
    } catch {
      copyMessage = 'Copy failed.';
    }
  }

  function clearBoth(): void {
    originalText = '';
    modifiedText = '';
    diffLines = [];
    compared = false;
    copyMessage = '';
    addedCount = 0;
    removedCount = 0;
    diffOutput = '';
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel" aria-label="Text diff inputs">
    <div class="two-panel">
      <div class="field">
        <label for="diff-original">Original</label>
        <textarea id="diff-original" bind:value={originalText} rows="12"></textarea>
      </div>

      <div class="field">
        <label for="diff-modified">Modified</label>
        <textarea id="diff-modified" bind:value={modifiedText} rows="12"></textarea>
      </div>
    </div>

    <div class="actions">
      <button class="primary" type="button" on:click={compare}>Compare</button>
      <button type="button" on:click={clearBoth}>Clear both</button>
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <div class="meta-row">
        <span>{addedCount} lines added</span>
        <span>{removedCount} lines removed</span>
        <button type="button" on:click={copyDiff} disabled={diffOutput.length === 0}>Copy diff output</button>
      </div>
    </div>

    {#if !compared}
      <p class="muted">Compare two texts to generate a unified diff.</p>
    {:else if diffLines.length === 0}
      <p class="muted">No differences found.</p>
    {:else}
      <div class="diff-output" aria-label="Diff output">
        {#each diffLines as line}
          <div class:added={line.type === 'added'} class:removed={line.type === 'removed'} class:unchanged={line.type === 'unchanged'}>
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '} {line.text}
          </div>
        {/each}
      </div>
    {/if}

    <p class="copy-status">{copyMessage}</p>
  </section>
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 1080px;
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

  .two-panel {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field {
    display: grid;
    gap: var(--space-1);
  }

  textarea {
    width: 100%;
    min-height: 240px;
    resize: vertical;
  }

  .actions,
  .meta-row {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
    align-items: center;
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

  .diff-output {
    display: grid;
    gap: 0;
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #111111;
    overflow-x: auto;
  }

  .diff-output div {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 14px;
    line-height: 1.6;
  }

  .added {
    color: #a3e635;
  }

  .removed {
    color: #ef4444;
  }

  .unchanged {
    color: #666666;
  }

  .muted,
  .meta-row {
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

  @media (max-width: 900px) {
    .two-panel {
      grid-template-columns: 1fr;
    }
  }
</style>