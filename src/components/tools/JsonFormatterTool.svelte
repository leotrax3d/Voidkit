<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';

  export let tool: Tool;

  type ValidationState = 'idle' | 'valid' | 'invalid';

  let inputJson = '';
  let outputJson = '';
  let errorMessage = '';
  let validationMessage = '';
  let validationState: ValidationState = 'idle';
  let copyMessage = '';
  let highlightedOutput = '';
  let outputCharacterCount = 0;
  let outputLineCount = 0;

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function extractLineNumber(source: string, errorText: string): number | undefined {
    const positionMatch = errorText.match(/position (\d+)/i);
    if (positionMatch) {
      const position = Number(positionMatch[1]);
      if (Number.isFinite(position)) {
        return source.slice(0, position).split(/\r?\n/).length;
      }
    }

    const lineMatch = errorText.match(/line (\d+)/i);
    if (lineMatch) {
      const line = Number(lineMatch[1]);
      if (Number.isFinite(line)) {
        return line;
      }
    }

    return undefined;
  }

  function setError(errorText: string): void {
    const lineNumber = extractLineNumber(inputJson, errorText);
    errorMessage = lineNumber ? `${errorText} (line ${lineNumber})` : errorText;
    validationMessage = '';
    validationState = 'invalid';
  }

  function readInput(): unknown | undefined {
    const trimmed = inputJson.trim();
    if (trimmed.length === 0) {
      outputJson = '';
      errorMessage = '';
      validationMessage = '';
      validationState = 'idle';
      return undefined;
    }

    try {
      return JSON.parse(inputJson);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid JSON.');
      outputJson = '';
      return undefined;
    }
  }

  function writeOutput(value: unknown, spacing: number | null): void {
    outputJson = spacing === null ? JSON.stringify(value) : JSON.stringify(value, null, spacing);
    errorMessage = '';
    validationMessage = spacing === null ? 'JSON minified successfully.' : 'JSON formatted successfully.';
    validationState = 'valid';
  }

  function formatJson(): void {
    const parsed = readInput();
    if (parsed === undefined && errorMessage.length > 0) return;
    if (parsed === undefined) return;

    writeOutput(parsed, 2);
  }

  function minifyJson(): void {
    const parsed = readInput();
    if (parsed === undefined && errorMessage.length > 0) return;
    if (parsed === undefined) return;

    writeOutput(parsed, null);
  }

  function validateJson(): void {
    const parsed = readInput();
    if (parsed === undefined && errorMessage.length > 0) return;
    if (parsed === undefined) return;

    outputJson = JSON.stringify(parsed, null, 2);
    errorMessage = '';
    validationMessage = 'JSON is valid.';
    validationState = 'valid';
  }

  function handlePaste(): void {
    setTimeout(() => {
      formatJson();
    }, 0);
  }

  function highlightJson(value: string): string {
    const tokenRegex = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
    let highlighted = '';
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(value)) !== null) {
      highlighted += escapeHtml(value.slice(cursor, match.index));

      if (match[1]) {
        if (match[2]) {
          highlighted += `<span class="json-key">${escapeHtml(match[1])}</span><span class="json-punctuation">${escapeHtml(match[2])}</span>`;
        } else {
          highlighted += `<span class="json-string">${escapeHtml(match[1])}</span>`;
        }
      } else if (match[3]) {
        highlighted += `<span class="json-literal">${escapeHtml(match[3])}</span>`;
      } else if (match[4]) {
        highlighted += `<span class="json-number">${escapeHtml(match[4])}</span>`;
      }

      cursor = match.index + match[0].length;
    }

    highlighted += escapeHtml(value.slice(cursor));
    return highlighted;
  }

  $: highlightedOutput = outputJson.length > 0 ? highlightJson(outputJson) : '';
  $: outputCharacterCount = outputJson.length;
  $: outputLineCount = outputJson.length === 0 ? 0 : outputJson.split(/\r?\n/).length;

  async function copyOutput(): Promise<void> {
    if (!browser || outputJson.length === 0) return;

    try {
      await navigator.clipboard.writeText(outputJson);
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

  <section class="panel field" aria-label="JSON input section">
    <label for="json-formatter-input">JSON input</label>
    <textarea id="json-formatter-input" bind:value={inputJson} rows="12" on:paste={handlePaste}></textarea>

    <div class="actions">
      <button class="primary" type="button" on:click={formatJson}>Format</button>
      <button type="button" on:click={minifyJson}>Minify</button>
      <button type="button" on:click={validateJson}>Validate</button>
    </div>
  </section>

  {#if errorMessage}
    <section class="panel error-panel" aria-live="polite">
      <p class="error">{errorMessage}</p>
    </section>
  {/if}

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <button type="button" on:click={copyOutput} disabled={outputJson.length === 0}>Copy output</button>
    </div>

    {#if outputJson.length === 0}
      <p class="muted">No formatted JSON yet.</p>
    {:else}
      <pre class="json-preview"><code>{@html highlightedOutput}</code></pre>
    {/if}

    <p class:valid={validationState === 'valid'} class:invalid={validationState === 'invalid'} class="status">
      {validationMessage}
    </p>
    <p class="copy-status">{copyMessage}</p>
    <p class="meta">{outputCharacterCount} characters · {outputLineCount} lines</p>
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

  .field {
    display: grid;
    gap: var(--space-1);
  }

  textarea {
    width: 100%;
    min-height: 220px;
    resize: vertical;
  }

  .actions {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .primary {
    border-color: var(--accent);
    color: var(--accent);
  }

  .output-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .json-preview {
    margin: 0;
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #111111;
    overflow: auto;
  }

  .json-preview code {
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  :global(.json-key) {
    color: #a3e635;
  }

  :global(.json-string) {
    color: #86efac;
  }

  :global(.json-number) {
    color: #fb923c;
  }

  :global(.json-literal) {
    color: #c084fc;
  }

  :global(.json-punctuation) {
    color: var(--text-primary);
  }

  .muted,
  .status,
  .meta {
    color: var(--text-muted);
    font-size: 14px;
  }

  .valid {
    color: #a3e635;
  }

  .invalid,
  .error {
    color: #f08b8b;
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
    color: var(--text-muted);
    font-size: 14px;
  }
</style>