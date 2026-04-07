<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import { onDestroy, onMount } from 'svelte';

  export let tool: Tool;

  let inputText = '';
  let sha1 = '';
  let sha256 = '';
  let sha384 = '';
  let sha512 = '';
  let copyMessage = '';
  let timer: ReturnType<typeof setTimeout> | undefined;

  function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  async function digest(algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'): Promise<string> {
    const encoded = new TextEncoder().encode(inputText);
    const hash = await crypto.subtle.digest(algorithm, encoded);
    return toHex(hash);
  }

  async function computeHashes(): Promise<void> {
    if (!browser) return;

    if (inputText.length === 0) {
      sha1 = '';
      sha256 = '';
      sha384 = '';
      sha512 = '';
      return;
    }

    const [nextSha1, nextSha256, nextSha384, nextSha512] = await Promise.all([
      digest('SHA-1'),
      digest('SHA-256'),
      digest('SHA-384'),
      digest('SHA-512')
    ]);

    sha1 = nextSha1;
    sha256 = nextSha256;
    sha384 = nextSha384;
    sha512 = nextSha512;
  }

  function scheduleCompute(): void {
    if (!browser) return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void computeHashes();
    }, 300);
  }

  onMount(() => {
    scheduleCompute();
  });

  $: if (browser) {
    inputText;
    scheduleCompute();
  }

  onDestroy(() => {
    if (timer) clearTimeout(timer);
  });

  async function copyValue(value: string): Promise<void> {
    if (!browser || value.length === 0) return;

    await navigator.clipboard.writeText(value);
    copyMessage = 'Copied.';
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel" aria-label="Hash input section">
    <div class="field">
      <label for="hash-input">Text</label>
      <textarea id="hash-input" rows="8" bind:value={inputText}></textarea>
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
    </div>

    <div class="hash-grid">
      <article>
        <header>
          <h3>SHA-1</h3>
          <button type="button" on:click={() => copyValue(sha1)} disabled={sha1.length === 0}>Copy</button>
        </header>
        <code>{sha1 || '—'}</code>
      </article>

      <article>
        <header>
          <h3>SHA-256</h3>
          <button type="button" on:click={() => copyValue(sha256)} disabled={sha256.length === 0}>Copy</button>
        </header>
        <code>{sha256 || '—'}</code>
      </article>

      <article>
        <header>
          <h3>SHA-384</h3>
          <button type="button" on:click={() => copyValue(sha384)} disabled={sha384.length === 0}>Copy</button>
        </header>
        <code>{sha384 || '—'}</code>
      </article>

      <article>
        <header>
          <h3>SHA-512</h3>
          <button type="button" on:click={() => copyValue(sha512)} disabled={sha512.length === 0}>Copy</button>
        </header>
        <code>{sha512 || '—'}</code>
      </article>
    </div>

    <p class="note">SHA-1 is deprecated for security use.</p>
    <p class="copy-status">{copyMessage}</p>
  </section>
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 960px;
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

  textarea {
    width: 100%;
    min-height: 140px;
    resize: vertical;
  }

  .output-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .hash-grid {
    display: grid;
    gap: var(--space-2);
  }

  article {
    display: grid;
    gap: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-1);
  }

  article header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
  }

  h1 {
    font-size: 24px;
  }

  h2 {
    font-size: 16px;
  }

  h3 {
    font-size: 14px;
    color: var(--text-muted);
  }

  code {
    color: var(--text-primary);
    font-size: 13px;
    word-break: break-all;
  }

  p,
  label,
  .note {
    font-size: 14px;
    color: var(--text-muted);
  }

  .copy-status {
    color: var(--accent);
    min-height: 21px;
  }
</style>