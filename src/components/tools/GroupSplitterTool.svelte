<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';

  export let tool: Tool;

  let inputText = '';
  let groupCount = 2;
  let warning = '';
  let groups: string[][] = [];
  let copyMessage = '';

  function parseItems(text: string): string[] {
    return text
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  function shuffle<T>(source: T[]): T[] {
    const next = [...source];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
    }
    return next;
  }

  function splitGroups(): void {
    copyMessage = '';
    warning = '';

    if (!Number.isInteger(groupCount) || groupCount < 2 || groupCount > 20) {
      warning = 'Group count must be between 2 and 20.';
      groups = [];
      return;
    }

    const items = parseItems(inputText);
    if (items.length === 0) {
      warning = 'Please enter at least one item.';
      groups = [];
      return;
    }

    if (groupCount > items.length) {
      warning = 'Group count is larger than the number of items.';
    }

    const shuffled = shuffle(items);
    const nextGroups: string[][] = Array.from({ length: groupCount }, () => []);

    shuffled.forEach((item, index) => {
      nextGroups[index % groupCount].push(item);
    });

    groups = nextGroups;
  }

  function formatGroups(): string {
    return groups
      .map((group, index) => {
        const rows = group.map((item) => `- ${item}`).join('\n');
        return `Gruppe ${index + 1}\n${rows || '-'} `;
      })
      .join('\n\n')
      .trim();
  }

  async function copyAll(): Promise<void> {
    if (!browser || groups.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(formatGroups());
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

  <section class="panel" aria-label="Group split input">
    <div class="field">
      <label for="group-items">Names or items (one per line)</label>
      <textarea id="group-items" bind:value={inputText} rows="10"></textarea>
    </div>

    <div class="field short">
      <label for="group-count">Number of groups (2-20)</label>
      <input id="group-count" type="number" bind:value={groupCount} min="2" max="20" />
    </div>

    <button class="primary" type="button" on:click={splitGroups}>Split</button>
  </section>

  {#if warning}
    <div class="panel warning" aria-live="polite">
      <p>{warning}</p>
    </div>
  {/if}

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Output</h2>
      <button type="button" on:click={copyAll} disabled={groups.length === 0}>Copy all groups</button>
    </div>

    {#if groups.length === 0}
      <p class="muted">No groups generated yet.</p>
    {:else}
      <div class="group-grid">
        {#each groups as group, index}
          <article class="group-block">
            <h3>Gruppe {index + 1}</h3>
            {#if group.length === 0}
              <p class="muted">Empty</p>
            {:else}
              <ul>
                {#each group as item}
                  <li>{item}</li>
                {/each}
              </ul>
            {/if}
          </article>
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

  .short {
    max-width: 260px;
  }

  textarea {
    width: 100%;
    resize: vertical;
    min-height: 160px;
  }

  .primary {
    border-color: var(--accent);
    color: var(--accent);
    justify-self: start;
  }

  .warning p {
    color: #f2be66;
  }

  .output-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
  }

  .group-grid {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .group-block {
    display: grid;
    gap: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-1);
    background: var(--bg);
  }

  h1 {
    font-size: 24px;
  }

  h2 {
    font-size: 16px;
  }

  h3 {
    font-size: 14px;
    color: var(--text-primary);
  }

  p,
  label,
  .muted,
  li {
    font-size: 14px;
    color: var(--text-muted);
  }

  ul {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 4px;
  }

  .copy-status {
    color: var(--accent);
    min-height: 21px;
  }
</style>
