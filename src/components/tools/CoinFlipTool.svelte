<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';

  export let tool: Tool;

  let result = '';
  let headsCount = 0;
  let tailsCount = 0;
  let multiCount = 10;
  let distribution = '';
  let copyMessage = '';
  let flipKey = 0;

  function flipCoin(): void {
    const next = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    result = next;
    flipKey += 1;
    copyMessage = '';

    if (next === 'HEADS') {
      headsCount += 1;
    } else {
      tailsCount += 1;
    }
  }

  function resetStats(): void {
    headsCount = 0;
    tailsCount = 0;
  }

  function flipMultiple(): void {
    if (!Number.isInteger(multiCount) || multiCount < 1 || multiCount > 100) {
      distribution = 'Input must be between 1 and 100.';
      return;
    }

    let heads = 0;
    for (let index = 0; index < multiCount; index += 1) {
      if (Math.random() < 0.5) heads += 1;
    }

    const tails = multiCount - heads;
    distribution = `Heads: ${heads} | Tails: ${tails}`;
  }

  async function copyOutput(): Promise<void> {
    if (!browser) {
      return;
    }

    const text = [
      result ? `Result: ${result}` : 'Result: -',
      `Heads: ${headsCount}`,
      `Tails: ${tailsCount}`,
      distribution || 'Distribution: -'
    ].join('\n');

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

  <section class="panel" aria-label="Coin flip input">
    <button class="primary large" type="button" on:click={flipCoin}>Flip</button>

    <div class="stats-row">
      <p>Heads: {headsCount}</p>
      <p>Tails: {tailsCount}</p>
      <button type="button" on:click={resetStats}>Reset</button>
    </div>

    <div class="field">
      <label for="multi-flip">Flip multiple (1-100)</label>
      <div class="row">
        <input id="multi-flip" type="number" bind:value={multiCount} min="1" max="100" />
        <button type="button" on:click={flipMultiple}>Run</button>
      </div>
      <p class="muted">{distribution || 'No distribution yet.'}</p>
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <button type="button" on:click={copyOutput}>Copy</button>
    </div>

    {#key flipKey}
      <p class="flip-result">{result || '-'}</p>
    {/key}

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

  .row {
    display: flex;
    gap: var(--space-1);
  }

  .row input {
    flex: 1;
  }

  .stats-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .large {
    min-height: 56px;
    min-width: 160px;
    font-size: 18px;
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

  .flip-result {
    font-size: 44px;
    color: var(--text-primary);
    animation: flip-in 220ms ease;
    transform-origin: center;
    min-height: 56px;
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

  @keyframes flip-in {
    from {
      opacity: 0;
      transform: scale(0.9);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
