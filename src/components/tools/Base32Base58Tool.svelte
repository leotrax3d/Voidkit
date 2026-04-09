<script lang="ts">
  import type { Tool } from '$lib/types';
  import {
    decodeBase32,
    decodeBase58,
    encodeBase32,
    encodeBase58
  } from '$lib/utils/crypto-modern';

  export let tool: Tool;

  let format: 'base32' | 'base58' = 'base32';
  let mode: 'encode' | 'decode' = 'encode';
  let inputText = '';
  let outputText = '';
  let errorMessage = '';

  $: {
    try {
      if (mode === 'encode') {
        outputText = format === 'base32' ? encodeBase32(inputText) : encodeBase58(inputText);
      } else {
        outputText = format === 'base32' ? decodeBase32(inputText) : decodeBase58(inputText);
      }
      errorMessage = '';
    } catch (error) {
      outputText = '';
      errorMessage = error instanceof Error ? error.message : 'Invalid input.';
    }
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <section class="panel controls">
    <div class="row">
      <button class:active={format === 'base32'} type="button" on:click={() => (format = 'base32')}>Base32</button>
      <button class:active={format === 'base58'} type="button" on:click={() => (format = 'base58')}>Base58</button>
    </div>
    <div class="row">
      <button class:active={mode === 'encode'} type="button" on:click={() => (mode = 'encode')}>Encode</button>
      <button class:active={mode === 'decode'} type="button" on:click={() => (mode = 'decode')}>Decode</button>
    </div>
  </section>

  <section class="two-panel">
    <article class="panel field">
      <label for="b3258-input">Input</label>
      <textarea id="b3258-input" rows="9" bind:value={inputText}></textarea>
    </article>
    <article class="panel field">
      <label for="b3258-output">Output</label>
      <textarea id="b3258-output" rows="9" readonly value={outputText}></textarea>
    </article>
  </section>

  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}
</section>

<style>
  .tool-page, .panel, .field { display: grid; gap: var(--space-2); }
  .tool-page { max-width: 1024px; }
  .tool-header { display: grid; gap: var(--space-1); }
  .panel { padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
  .two-panel { display: grid; gap: var(--space-2); grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .row { display: flex; gap: var(--space-1); flex-wrap: wrap; }
  .row .active { border-color: var(--accent); color: var(--accent); }
  .error { color: var(--error-text); font-size: 14px; }
  textarea { width: 100%; resize: vertical; }
  @media (max-width: 900px) { .two-panel { grid-template-columns: 1fr; } }
</style>
