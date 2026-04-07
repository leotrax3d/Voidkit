<script lang="ts">
  import { browser } from '$app/environment';
  import { marked } from 'marked';
  import type { Tool } from '$lib/types';
  import { onMount, tick } from 'svelte';

  export let tool: Tool;

  const STORAGE_KEY = 'voidkit_markdown_content';

  type ViewMode = 'split' | 'preview';

  let editorText = '# Voidkit\n\nWrite **Markdown** on the left.';
  let previewHtml = '';
  let viewMode: ViewMode = 'split';
  let copyMessage = '';
  let hydrated = false;
  let sanitizerReady = false;
  let editorElement: HTMLTextAreaElement | null = null;
  let renderVersion = 0;
  let sanitizeHtml = (value: string) => value;
  let counts = { words: 0, characters: 0 };

  marked.setOptions({ breaks: true, gfm: true });

  function updateCounts(value: string): { words: number; characters: number } {
    const words = value.trim().match(/\S+/g)?.length ?? 0;
    return {
      words,
      characters: value.length
    };
  }

  async function loadSanitizer(): Promise<void> {
    const module = await import('dompurify');
    sanitizeHtml = (value: string) => module.default.sanitize(value);
    sanitizerReady = true;
  }

  async function renderPreview(): Promise<void> {
    if (!browser || !sanitizerReady) return;

    const currentVersion = ++renderVersion;
    const rawHtml = String(marked.parse(editorText));
    const sanitized = sanitizeHtml(rawHtml);

    if (currentVersion === renderVersion) {
      previewHtml = sanitized;
    }
  }

  onMount(async () => {
    if (browser) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        editorText = stored;
      }

      counts = updateCounts(editorText);
      await loadSanitizer();
      hydrated = true;
      await renderPreview();
    }
  });

  $: if (browser && hydrated) {
    localStorage.setItem(STORAGE_KEY, editorText);
    counts = updateCounts(editorText);
    void renderPreview();
  }

  function insertSnippet(before: string, after = '', placeholder = ''): void {
    if (!editorElement) return;

    const selectionStart = editorElement.selectionStart ?? editorText.length;
    const selectionEnd = editorElement.selectionEnd ?? selectionStart;
    const selectedText = editorText.slice(selectionStart, selectionEnd) || placeholder;
    const nextValue =
      editorText.slice(0, selectionStart) + before + selectedText + after + editorText.slice(selectionEnd);

    editorText = nextValue;

    void tick().then(() => {
      const cursorStart = selectionStart + before.length;
      const cursorEnd = cursorStart + selectedText.length;
      editorElement?.focus();
      editorElement?.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function insertBlockquote(): void {
    if (!editorElement) return;

    const selectionStart = editorElement.selectionStart ?? 0;
    const selectionEnd = editorElement.selectionEnd ?? selectionStart;
    const selectedText = editorText.slice(selectionStart, selectionEnd) || 'Blockquote text';
    const quoted = selectedText
      .split(/\r?\n/)
      .map((line) => `> ${line}`)
      .join('\n');

    editorText = editorText.slice(0, selectionStart) + quoted + editorText.slice(selectionEnd);

    void tick().then(() => {
      const cursorStart = selectionStart;
      const cursorEnd = selectionStart + quoted.length;
      editorElement?.focus();
      editorElement?.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  async function copyMarkdown(): Promise<void> {
    if (!browser || editorText.length === 0) return;

    try {
      await navigator.clipboard.writeText(editorText);
      copyMessage = 'Copied.';
    } catch {
      copyMessage = 'Copy failed.';
    }
  }

  function toggleViewMode(nextMode: ViewMode): void {
    viewMode = nextMode;
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel topbar" aria-label="Markdown toolbar">
    <div class="mode-switch" role="radiogroup" aria-label="Preview layout">
      <button class:active={viewMode === 'split'} type="button" on:click={() => toggleViewMode('split')}>Split view</button>
      <button class:active={viewMode === 'preview'} type="button" on:click={() => toggleViewMode('preview')}>Full preview</button>
    </div>

    <button type="button" on:click={copyMarkdown} disabled={editorText.length === 0}>Copy raw markdown</button>
  </section>

  {#if viewMode === 'split'}
    <section class="split-layout">
      <section class="panel editor-panel" aria-label="Markdown editor">
        <div class="toolbar" aria-label="Formatting shortcuts">
          <button type="button" on:click={() => insertSnippet('**', '**', 'bold text')}>Bold</button>
          <button type="button" on:click={() => insertSnippet('*', '*', 'italic text')}>Italic</button>
          <button type="button" on:click={() => insertSnippet('[', '](https://example.com)', 'link text')}>Link</button>
          <button type="button" on:click={() => insertSnippet('`', '`', 'code')}>Code</button>
          <button type="button" on:click={insertBlockquote}>Blockquote</button>
        </div>

        <label for="markdown-editor">Markdown editor</label>
        <textarea id="markdown-editor" bind:this={editorElement} bind:value={editorText} rows="16"></textarea>

        <p class="meta">{counts.words} words · {counts.characters} characters</p>
      </section>

      <section class="panel preview-panel" aria-label="Markdown preview" aria-live="polite">
        <div class="output-head">
          <h2>Preview</h2>
          <button type="button" on:click={() => toggleViewMode('preview')}>Focus preview</button>
        </div>

        {#if previewHtml.length === 0}
          <p class="muted">Preview will appear here.</p>
        {:else}
          <div class="preview-content">{@html previewHtml}</div>
        {/if}
      </section>
    </section>
  {:else}
    <section class="panel preview-panel preview-only" aria-label="Markdown preview" aria-live="polite">
      <div class="output-head">
        <h2>Preview</h2>
        <button type="button" on:click={() => toggleViewMode('split')}>Show editor</button>
      </div>

      {#if previewHtml.length === 0}
        <p class="muted">Preview will appear here.</p>
      {:else}
        <div class="preview-content">{@html previewHtml}</div>
      {/if}
    </section>
  {/if}

  <p class="copy-status">{copyMessage}</p>
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 1180px;
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

  .topbar,
  .output-head,
  .toolbar,
  .mode-switch {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
  }

  .mode-switch {
    justify-content: flex-start;
  }

  .mode-switch button.active {
    border-color: var(--accent);
    color: var(--accent);
  }

  .split-layout {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor-panel {
    display: grid;
    gap: var(--space-2);
  }

  textarea {
    width: 100%;
    min-height: 300px;
    resize: vertical;
  }

  .preview-panel {
    min-height: 300px;
  }

  .preview-only {
    min-height: 420px;
  }

  .preview-content {
    color: var(--text-primary);
    display: grid;
    gap: var(--space-1);
  }

  .preview-content :global(h1) {
    color: #f0f0f0;
    font-size: 28px;
    line-height: 1.2;
  }

  .preview-content :global(h2) {
    color: #f0f0f0;
    font-size: 22px;
    line-height: 1.3;
  }

  .preview-content :global(h3) {
    color: #f0f0f0;
    font-size: 18px;
    line-height: 1.35;
  }

  .preview-content :global(a) {
    color: #a3e635;
  }

  .preview-content :global(code),
  .preview-content :global(pre) {
    background: #161616;
    color: #a3e635;
    border: 1px solid #242424;
  }

  .preview-content :global(pre) {
    margin: 0;
    padding: var(--space-1);
    overflow: auto;
  }

  .preview-content :global(code) {
    padding: 0 4px;
    border-radius: 4px;
  }

  .preview-content :global(blockquote) {
    margin: 0;
    padding-left: var(--space-1);
    border-left: 2px solid #a3e635;
    color: var(--text-muted);
  }

  .preview-content :global(strong) {
    color: #f0f0f0;
  }

  .meta,
  .muted {
    color: var(--text-muted);
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
    color: var(--text-muted);
    font-size: 14px;
  }

  @media (max-width: 960px) {
    .split-layout {
      grid-template-columns: 1fr;
    }
  }
</style>