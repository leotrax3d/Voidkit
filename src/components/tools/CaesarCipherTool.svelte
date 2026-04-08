<script lang="ts">
  import type { Tool } from '$lib/types';
  import { caesarCipher } from '$lib/utils/ciphers';

  export let tool: Tool;

  let inputText = '';
  let shift = 3;
  let outputText = '';

  $: outputText = caesarCipher(inputText, shift);
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <section class="panel controls">
    <label for="caesar-shift">Shift</label>
    <input id="caesar-shift" type="number" min="-25" max="25" bind:value={shift} />
  </section>

  <section class="two-panel">
    <article class="panel field">
      <label for="caesar-input">Input</label>
      <textarea id="caesar-input" rows="9" bind:value={inputText}></textarea>
    </article>
    <article class="panel field">
      <label for="caesar-output">Output</label>
      <textarea id="caesar-output" rows="9" readonly value={outputText}></textarea>
    </article>
  </section>
</section>

<style>
  .tool-page, .panel, .field { display: grid; gap: var(--space-2); }
  .tool-page { max-width: 1024px; }
  .tool-header { display: grid; gap: var(--space-1); }
  .panel { padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
  .two-panel { display: grid; gap: var(--space-2); grid-template-columns: repeat(2, minmax(0, 1fr)); }
  textarea { width: 100%; resize: vertical; }
  @media (max-width: 900px) { .two-panel { grid-template-columns: 1fr; } }
</style>
