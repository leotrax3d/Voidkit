<script lang="ts">
  import type { Tool } from '$lib/types';
  import { morseDecode, morseEncode } from '$lib/utils/ciphers';

  export let tool: Tool;

  let mode: 'encode' | 'decode' = 'encode';
  let inputText = '';
  let outputText = '';

  $: outputText = mode === 'encode' ? morseEncode(inputText) : morseDecode(inputText);
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <section class="panel controls">
    <div class="row">
      <button class:active={mode === 'encode'} type="button" on:click={() => (mode = 'encode')}>Encode</button>
      <button class:active={mode === 'decode'} type="button" on:click={() => (mode = 'decode')}>Decode</button>
    </div>
  </section>

  <section class="two-panel">
    <article class="panel field">
      <label for="morse-input">Input</label>
      <textarea id="morse-input" rows="9" bind:value={inputText}></textarea>
    </article>
    <article class="panel field">
      <label for="morse-output">Output</label>
      <textarea id="morse-output" rows="9" readonly value={outputText}></textarea>
    </article>
  </section>
</section>

<style>
  .tool-page, .panel, .field { display: grid; gap: var(--space-2); }
  .tool-page { max-width: 1024px; }
  .tool-header { display: grid; gap: var(--space-1); }
  .panel { padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
  .two-panel { display: grid; gap: var(--space-2); grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .row { display: flex; gap: var(--space-1); flex-wrap: wrap; }
  .row .active { border-color: var(--accent); color: var(--accent); }
  textarea { width: 100%; resize: vertical; }
  @media (max-width: 900px) { .two-panel { grid-template-columns: 1fr; } }
</style>
