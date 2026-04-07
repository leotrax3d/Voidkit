<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';

  export let tool: Tool;

  type Mode = 'encode' | 'decode';

  let mode: Mode = 'encode';
  let inputText = '';
  let outputText = '';
  let errorMessage = '';
  let copyMessage = '';

  function encodeText(value: string): string {
    const bytes = new TextEncoder().encode(value);
    let binary = '';

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary);
  }

  function decodeText(value: string): string {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function normalizeBase64(value: string): string {
    return value.replace(/\s+/g, '');
  }

  function isValidBase64(value: string): boolean {
    if (value.length === 0 || value.length % 4 !== 0) {
      return false;
    }

    return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
  }

  function convert(): void {
    copyMessage = '';

    if (!browser) return;

    if (inputText.length === 0) {
      outputText = '';
      errorMessage = '';
      return;
    }

    try {
      if (mode === 'encode') {
        outputText = encodeText(inputText);
        errorMessage = '';
        return;
      }

      const normalized = normalizeBase64(inputText);
      if (!isValidBase64(normalized)) {
        outputText = '';
        errorMessage = 'Input is not valid Base64.';
        return;
      }

      outputText = decodeText(normalized);
      errorMessage = '';
    } catch {
      outputText = '';
      errorMessage = 'Input is not valid Base64.';
    }
  }

  $: if (browser) {
    inputText;
    mode;
    convert();
  }

  function swap(): void {
    if (outputText.length === 0) return;

    inputText = outputText;
    mode = mode === 'encode' ? 'decode' : 'encode';
  }

  function clearAll(): void {
    inputText = '';
    outputText = '';
    errorMessage = '';
    copyMessage = '';
  }

  async function copyOutput(): Promise<void> {
    if (!browser || outputText.length === 0) return;

    await navigator.clipboard.writeText(outputText);
    copyMessage = 'Copied.';
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel" aria-label="Base64 mode section">
    <div class="mode-row" role="radiogroup" aria-label="Conversion mode">
      <button class:active={mode === 'encode'} type="button" on:click={() => (mode = 'encode')}>Encode</button>
      <button class:active={mode === 'decode'} type="button" on:click={() => (mode = 'decode')}>Decode</button>
    </div>
  </section>

  <section class="two-panel" aria-label="Base64 converter">
    <div class="panel field">
      <label for="base64-input">Input</label>
      <textarea id="base64-input" rows="12" bind:value={inputText}></textarea>
    </div>

    <div class="panel field">
      <label for="base64-output">Output</label>
      <textarea
        id="base64-output"
        rows="12"
        bind:value={outputText}
        readonly
        class:error={errorMessage.length > 0}
        aria-invalid={errorMessage.length > 0}
      ></textarea>
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <div class="buttons">
        <button type="button" on:click={swap} disabled={outputText.length === 0}>Swap</button>
        <button type="button" on:click={copyOutput} disabled={outputText.length === 0}>Copy output</button>
        <button type="button" on:click={clearAll}>Clear</button>
      </div>
    </div>

    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}
    <p class="copy-status">{copyMessage}</p>
  </section>
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 1080px;
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

  .two-panel {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field {
    display: grid;
    gap: var(--space-1);
  }

  .mode-row,
  .buttons {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .mode-row button.active {
    border-color: var(--accent);
    color: var(--accent);
  }

  textarea {
    width: 100%;
    min-height: 180px;
    resize: vertical;
  }

  textarea.error {
    border-color: #b84a4a;
  }

  .output-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .error {
    color: #f08b8b;
    font-size: 14px;
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
  label {
    font-size: 14px;
    color: var(--text-muted);
  }

  @media (max-width: 900px) {
    .two-panel {
      grid-template-columns: 1fr;
    }
  }
</style>