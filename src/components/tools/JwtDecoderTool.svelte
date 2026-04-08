<script lang="ts">
  import type { Tool } from '$lib/types';
  import { decodeJwt } from '$lib/utils/crypto-modern';

  export let tool: Tool;

  let token = '';
  let decoded = decodeJwt('');
  $: decoded = decodeJwt(token);

  function pretty(value: Record<string, unknown> | null): string {
    return value ? JSON.stringify(value, null, 2) : 'Invalid or missing segment.';
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <section class="panel field">
    <label for="jwt-input">JWT token</label>
    <textarea id="jwt-input" rows="5" bind:value={token}></textarea>
  </section>

  <section class="three-panel">
    <article class="panel field">
      <label for="jwt-header">Header</label>
      <textarea id="jwt-header" rows="10" readonly value={pretty(decoded.header)}></textarea>
    </article>
    <article class="panel field">
      <label for="jwt-payload">Payload</label>
      <textarea id="jwt-payload" rows="10" readonly value={pretty(decoded.payload)}></textarea>
    </article>
    <article class="panel field">
      <label for="jwt-signature">Signature</label>
      <textarea id="jwt-signature" rows="10" readonly value={decoded.signature || 'No signature segment.'}></textarea>
    </article>
  </section>
</section>

<style>
  .tool-page, .panel, .field { display: grid; gap: var(--space-2); }
  .tool-page { max-width: 1200px; }
  .tool-header { display: grid; gap: var(--space-1); }
  .panel { padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
  .three-panel { display: grid; gap: var(--space-2); grid-template-columns: repeat(3, minmax(0, 1fr)); }
  textarea { width: 100%; resize: vertical; }
  @media (max-width: 1000px) { .three-panel { grid-template-columns: 1fr; } }
</style>
