<script lang="ts">
  import type { Tool } from '$lib/types';
  import { decodeJwt, inspectCryptoInput } from '$lib/utils/crypto-modern';

  export let tool: Tool;

  let inputText = '';
  let classification = inspectCryptoInput('');
  let jwt: ReturnType<typeof decodeJwt> | null = null;

  $: classification = inspectCryptoInput(inputText);
  $: jwt = classification.kind === 'jwt' ? decodeJwt(inputText) : null;

  function pretty(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <section class="panel field">
    <label for="inspector-input">Input</label>
    <textarea id="inspector-input" rows="8" bind:value={inputText}></textarea>
  </section>

  <section class="panel" aria-live="polite">
    <h2>Detection</h2>
    <p><strong>Type:</strong> {classification.kind}</p>
    <p><strong>Confidence:</strong> {classification.confidence}</p>
    <p><strong>Reason:</strong> {classification.reason}</p>
  </section>

  {#if jwt}
    <section class="two-panel">
      <article class="panel field">
        <label for="inspector-jwt-header">JWT Header</label>
        <textarea id="inspector-jwt-header" rows="8" readonly value={pretty(jwt.header)}></textarea>
      </article>
      <article class="panel field">
        <label for="inspector-jwt-payload">JWT Payload</label>
        <textarea id="inspector-jwt-payload" rows="8" readonly value={pretty(jwt.payload)}></textarea>
      </article>
    </section>
  {/if}
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