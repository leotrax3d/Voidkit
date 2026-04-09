<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import { onMount } from 'svelte';

  export let tool: Tool;

  type RollEntry = {
    die: number;
    count: number;
    values: number[];
    sum: number;
    timestamp: string;
  };

  const HISTORY_KEY = 'voidkit_dice-roller_history';

  const diceOptions = [4, 6, 8, 10, 12, 20, 100];
  let selectedDie = 6;
  let diceCount = 1;

  let values: number[] = [];
  let sum = 0;
  let history: RollEntry[] = [];
  let errors: string[] = [];
  let copyMessage = '';
  let animationKey = 0;

  onMount(() => {
    if (!browser) {
      return;
    }

    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return;
    }

    try {
      history = JSON.parse(raw) as RollEntry[];
    } catch {
      localStorage.removeItem(HISTORY_KEY);
    }
  });

  function validate(): boolean {
    const nextErrors: string[] = [];

    if (!Number.isInteger(diceCount) || diceCount < 1 || diceCount > 20) {
      nextErrors.push('How many dice must be between 1 and 20.');
    }

    errors = nextErrors;
    return nextErrors.length === 0;
  }

  function rollDice(): void {
    copyMessage = '';

    if (!validate()) {
      values = [];
      sum = 0;
      return;
    }

    const nextValues = Array.from({ length: diceCount }, () =>
      Math.floor(Math.random() * selectedDie) + 1
    );

    values = nextValues;
    sum = nextValues.reduce((acc, value) => acc + value, 0);
    animationKey += 1;

    const entry: RollEntry = {
      die: selectedDie,
      count: diceCount,
      values: [...nextValues],
      sum,
      timestamp: new Date().toLocaleTimeString('de-DE')
    };

    history = [entry, ...history].slice(0, 5);

    if (browser) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  }

  async function copySum(): Promise<void> {
    if (!browser || sum === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(String(sum));
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

  <section class="panel" aria-label="Dice settings">
    <fieldset class="field">
      <legend>Die type</legend>
      <div class="dice-grid">
        {#each diceOptions as die}
          <button
            type="button"
            class:active={selectedDie === die}
            on:click={() => {
              selectedDie = die;
            }}
          >
            W{die}
          </button>
        {/each}
      </div>
    </fieldset>

    <div class="field">
      <label for="dice-count">How many dice (1-20)</label>
      <input id="dice-count" type="number" bind:value={diceCount} min="1" max="20" />
    </div>

    <button class="primary" type="button" on:click={rollDice}>Roll</button>
  </section>

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
      <button type="button" on:click={copySum} disabled={sum === 0}>Copy sum</button>
    </div>

    {#key animationKey}
      <div class="fade-in">
        {#if values.length === 0}
          <p class="muted">No roll yet.</p>
        {:else}
          <p>Results: {values.join(', ')}</p>
          <p>Sum: {sum}</p>
        {/if}
      </div>
    {/key}

    <p class="copy-status">{copyMessage}</p>
  </section>

  <section class="panel" aria-label="Roll history">
    <h2>Last 5 rolls</h2>

    {#if history.length === 0}
      <p class="muted">No history yet.</p>
    {:else}
      <ul>
        {#each history as entry}
          <li>
            <span>W{entry.die} x {entry.count}: {entry.values.join(', ')} -> {entry.sum}</span>
            <small>{entry.timestamp}</small>
          </li>
        {/each}
      </ul>
    {/if}
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
    margin: 0;
    padding: 0;
    border: 0;
  }

  .dice-grid {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  .dice-grid button.active {
    border-color: var(--accent);
    color: var(--accent);
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

  .copy-status {
    color: var(--accent);
    min-height: 21px;
  }

  .errors p {
    color: var(--error-text);
  }

  p,
  label,
  .muted,
  small {
    font-size: 14px;
    color: var(--text-muted);
  }

  h1 {
    font-size: 24px;
  }

  h2 {
    font-size: 16px;
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
    gap: var(--space-half);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-1);
    background: var(--surface-subtle);
  }

  .fade-in {
    animation: fade-in 180ms ease;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 820px) {
    .dice-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
</style>
