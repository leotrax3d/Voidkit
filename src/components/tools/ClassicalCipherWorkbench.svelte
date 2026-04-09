<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import type { CipherMode, CipherTransform } from '$lib/utils/classical-ciphers';

  type KeyField = {
    id: string;
    label: string;
    placeholder: string;
    type?: string;
    helperText?: string;
  };

  export let tool: Tool;
  export let explanation = '';
  export let modeOptions: CipherMode[] = ['encode', 'decode'];
  export let keyFields: KeyField[] = [];
  export let exampleInput = '';
  export let exampleKeys: Record<string, string> = {};
  export let placeholder = 'Enter text here...';
  export let process: (mode: CipherMode, input: string, keys: Record<string, string>) => CipherTransform;

  let mode: CipherMode = modeOptions[0] ?? 'encode';
  let inputText = '';
  let outputText = '';
  let errorMessage = '';
  let copyMessage = '';
  let warnings: string[] = [];
  let keys: Record<string, string> = {};

  $: {
    mode;
    inputText;
    keys;
    run();
  }

  function run(): void {
    copyMessage = '';
    if (!inputText.length) {
      outputText = '';
      errorMessage = '';
      warnings = [];
      return;
    }

    try {
      const result = process(mode, inputText, keys);
      outputText = result.output;
      warnings = result.warnings;
      errorMessage = '';
    } catch (error) {
      outputText = '';
      warnings = [];
      errorMessage = error instanceof Error ? error.message : 'Unable to process input.';
    }
  }

  function setKey(id: string, value: string): void {
    keys = { ...keys, [id]: value };
  }

  function loadExample(): void {
    inputText = exampleInput;
    keys = { ...exampleKeys };
  }

  function resetAll(): void {
    inputText = '';
    outputText = '';
    errorMessage = '';
    warnings = [];
    copyMessage = '';
    keys = {};
    mode = modeOptions[0] ?? 'encode';
  }

  async function copyOutput(): Promise<void> {
    if (!browser || !outputText.length) return;
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

  <section class="panel" aria-label="Cipher explanation">
    <p>{explanation}</p>
  </section>

  <section class="panel controls" aria-label="Cipher controls">
    <div class="mode-row" role="radiogroup" aria-label="Cipher mode">
      {#each modeOptions as option}
        <button class:active={mode === option} type="button" on:click={() => (mode = option)}>
          {option === 'encode' ? 'Encode' : 'Decode'}
        </button>
      {/each}
    </div>

    {#if keyFields.length > 0}
      <div class="key-grid">
        {#each keyFields as field}
          <div class="field">
            <label for={field.id}>{field.label}</label>
            <input
              id={field.id}
              type={field.type ?? 'text'}
              value={keys[field.id] ?? ''}
              placeholder={field.placeholder}
              on:input={(event) => setKey(field.id, (event.currentTarget as HTMLInputElement).value)}
            />
            {#if field.helperText}
              <p class="helper">{field.helperText}</p>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <div class="action-row">
      <button type="button" on:click={loadExample}>Load example</button>
      <button type="button" on:click={resetAll}>Reset</button>
    </div>
  </section>

  <section class="two-panel" aria-label="Cipher input output">
    <div class="panel field">
      <label for="cipher-input">Input</label>
      <textarea id="cipher-input" rows="10" bind:value={inputText} placeholder={placeholder}></textarea>
    </div>

    <div class="panel field">
      <label for="cipher-output">Output</label>
      <textarea id="cipher-output" rows="10" readonly value={outputText} class:error={errorMessage.length > 0} aria-invalid={errorMessage.length > 0}></textarea>
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <div class="buttons">
        <button type="button" on:click={copyOutput} disabled={outputText.length === 0}>Copy output</button>
      </div>
    </div>

    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}

    {#if warnings.length > 0}
      <ul class="warnings">
        {#each warnings as warning}
          <li>{warning}</li>
        {/each}
      </ul>
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

  .controls,
  .field,
  .key-grid {
    display: grid;
    gap: var(--space-1);
  }

  .mode-row,
  .action-row,
  .buttons {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .mode-row button.active {
    border-color: var(--accent);
    color: var(--accent);
  }

  .key-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .two-panel {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  textarea,
  input {
    width: 100%;
  }

  textarea {
    min-height: 170px;
    resize: vertical;
  }

  textarea.error {
    border-color: var(--error-border);
  }

  .helper {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .output-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
  }

  .error {
    color: var(--error-text);
    font-size: 14px;
    margin: 0;
  }

  .warnings {
    margin: 0;
    padding-left: 18px;
    color: var(--text-muted);
  }

  .copy-status {
    color: var(--accent);
    min-height: 21px;
    margin: 0;
  }

  p,
  label {
    font-size: 14px;
    color: var(--text-muted);
  }

  @media (max-width: 900px) {
    .two-panel,
    .key-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
