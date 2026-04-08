<script lang="ts">
  import type { Tool } from '$lib/types';
  import { hillCipher, parseHillMatrix } from '$lib/utils/ciphers';

  export let tool: Tool;

  let mode: 'encrypt' | 'decrypt' = 'encrypt';
  let matrixInput = '3 3 2 5';
  let inputText = '';
  let outputText = '';
  let errorMessage = '';

  $: {
    try {
      const matrix = parseHillMatrix(matrixInput);
      outputText = hillCipher(inputText, matrix, mode === 'decrypt');
      errorMessage = '';
    } catch (error) {
      outputText = '';
      errorMessage = error instanceof Error ? error.message : 'Invalid matrix.';
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
      <button class:active={mode === 'encrypt'} type="button" on:click={() => (mode = 'encrypt')}>Encrypt</button>
      <button class:active={mode === 'decrypt'} type="button" on:click={() => (mode = 'decrypt')}>Decrypt</button>
    </div>
    <label for="hill-matrix">2x2 matrix (a b c d)</label>
    <input id="hill-matrix" type="text" bind:value={matrixInput} />
  </section>

  <section class="two-panel">
    <article class="panel field">
      <label for="hill-input">Input</label>
      <textarea id="hill-input" rows="9" bind:value={inputText}></textarea>
    </article>
    <article class="panel field">
      <label for="hill-output">Output</label>
      <textarea id="hill-output" rows="9" readonly value={outputText}></textarea>
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
  .error { color: #f08b8b; font-size: 14px; }
  textarea { width: 100%; resize: vertical; }
  @media (max-width: 900px) { .two-panel { grid-template-columns: 1fr; } }
</style>
