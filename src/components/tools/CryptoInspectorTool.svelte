<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import {
    analyzeCipherBatch,
    inspectionSummaryText,
    toInspectionJson,
    type BatchInspectionReport,
    type CipherCandidate,
    type InspectorMode
  } from '$lib/utils/cipher-inspector';
  import { onDestroy, onMount } from 'svelte';

  export let tool: Tool;

  let inputText = '';
  let mode: InspectorMode = 'single';
  let reportBundle: BatchInspectionReport = analyzeCipherBatch('', 'single');
  let selectedView: 'human' | 'json' = 'human';
  let showSensitive = false;
  let showPreviews = true;
  let copyStatus = '';
  let statusMessage = 'Paste a string to inspect classical ciphers.';
  let activeEntryIndex = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let analysisVersion = 0;

  const EXAMPLES = {
    caesar: 'KHOOR ZRUOG',
    rot13: 'URYYB, JBEYQ!',
    atbash: 'SVOOL DLIOW',
    vigenere: 'LXFOPVEFRNHR',
    affine: 'IHHWVCSWFRCP',
    railFence: 'WECRLTEERDSOEEFEAOCAIVDEN',
    polybius: '23 15 31 31 34',
    bacon: 'AAAAA AAAAA AABAA AABAB',
    morse: '.... . .-.. .-.. --- / .-- --- .-. .-.. -..'
  };

  function queueAnalysis(): void {
    if (debounceTimer) clearTimeout(debounceTimer);

    const delay = inputText.length > 3000 ? 420 : 220;
    const currentVersion = ++analysisVersion;
    debounceTimer = setTimeout(() => {
      if (currentVersion !== analysisVersion) return;

      reportBundle = analyzeCipherBatch(inputText, mode);
      activeEntryIndex = 0;
      const first = reportBundle.reports[0]?.report;
      statusMessage = first
        ? `Likely cipher: ${first.topMatch.name} (${first.topMatch.confidence}/100).`
        : 'No analyzable entries found.';
    }, delay);
  }

  $: {
    inputText;
    mode;
    queueAnalysis();
  }

  $: if (activeEntryIndex >= reportBundle.reports.length) {
    activeEntryIndex = 0;
  }

  onDestroy(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  function setMode(next: InspectorMode): void {
    mode = next;
    activeEntryIndex = 0;
  }

  function currentEntry() {
    return reportBundle.reports[activeEntryIndex] ?? reportBundle.reports[0];
  }

  function currentReport() {
    return currentEntry()?.report;
  }

  function summaryText(): string {
    const report = currentReport();
    return report ? inspectionSummaryText(report) : 'No summary available.';
  }

  function jsonText(): string {
    if (mode === 'batch') return JSON.stringify(reportBundle, null, 2);
    const report = currentReport();
    return report ? toInspectionJson(report) : '{}';
  }

  function clearInput(): void {
    inputText = '';
    copyStatus = '';
    activeEntryIndex = 0;
  }

  function loadExample(example: keyof typeof EXAMPLES): void {
    inputText = EXAMPLES[example];
  }

  function toggleSensitive(): void {
    showSensitive = !showSensitive;
  }

  function togglePreviews(): void {
    showPreviews = !showPreviews;
  }

  function sanitizeText(value: string): string {
    if (showSensitive) return value;
    if (value.length <= 12) return `${value.slice(0, 3)}...${value.slice(-2)}`;
    return `${value.slice(0, 8)}...${value.slice(-6)}`;
  }

  async function copyText(value: string, successMessage: string): Promise<void> {
    if (!browser || !value) return;

    try {
      await navigator.clipboard.writeText(value);
      copyStatus = successMessage;
      setTimeout(() => {
        if (copyStatus === successMessage) copyStatus = '';
      }, 1500);
    } catch {
      copyStatus = 'Clipboard permission unavailable.';
    }
  }

  function focusEntry(index: number): void {
    if (!browser || reportBundle.reports.length === 0) return;
    const clamped = Math.max(0, Math.min(index, reportBundle.reports.length - 1));
    const element = document.getElementById(`cipher-entry-${clamped + 1}`);
    if (element instanceof HTMLElement) {
      element.focus();
      activeEntryIndex = clamped;
    }
  }

  function focusNextEntry(): void {
    focusEntry(activeEntryIndex + 1);
  }

  function focusPreviousEntry(): void {
    focusEntry(activeEntryIndex - 1);
  }

  onMount(() => {
    if (!browser) return;

    const handleGlobalKeydown = (event: KeyboardEvent): void => {
      if (!event.altKey || selectedView !== 'human' || mode !== 'batch') return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusNextEntry();
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusPreviousEntry();
      }
    };

    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  });

  function candidateBarWidth(candidate: CipherCandidate): string {
    return `${candidate.confidence}%`;
  }

  function currentCandidate(): CipherCandidate | undefined {
    return currentReport()?.topMatch;
  }

  function currentSummaryClass(candidate?: CipherCandidate): string {
    return candidate ? `score-${candidate.band}` : 'score-weak';
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <section class="panel warning" aria-label="Safety notices">
    <h2>Safety Notice</h2>
    <ul>
      <li>Detection is heuristic and may be wrong.</li>
      <li>Do not paste real secrets in untrusted environments.</li>
      <li>Use the preview mode as a hint, not as proof.</li>
    </ul>
  </section>

  <section class="panel controls" aria-label="Inspector controls">
    <div class="row" role="radiogroup" aria-label="Input mode">
      <button class:active={mode === 'single'} type="button" on:click={() => setMode('single')}>Single-line</button>
      <button class:active={mode === 'multi'} type="button" on:click={() => setMode('multi')}>Multi-line</button>
      <button class:active={mode === 'batch'} type="button" on:click={() => setMode('batch')}>Batch (one per line)</button>
    </div>

    <label for="cipher-input">Paste input</label>
    <textarea
      id="cipher-input"
      rows={mode === 'single' ? 3 : 10}
      bind:value={inputText}
      spellcheck="false"
      placeholder="Paste suspected cipher text here..."
    ></textarea>

    <div class="row actions">
      <button type="button" on:click={() => copyText(summaryText(), 'Summary copied.')}>Copy analysis</button>
      <button type="button" on:click={() => copyText(jsonText(), 'JSON copied.')}>Copy JSON</button>
      <button type="button" on:click={togglePreviews}>{showPreviews ? 'Hide decoder previews' : 'Try decode'}</button>
      <button type="button" on:click={toggleSensitive}>{showSensitive ? 'Hide sensitive sections' : 'Show sensitive sections'}</button>
      <button type="button" on:click={clearInput}>Reset</button>
    </div>

    <div class="row examples" aria-label="Load examples">
      <span>Examples:</span>
      <button type="button" on:click={() => loadExample('caesar')}>Caesar</button>
      <button type="button" on:click={() => loadExample('rot13')}>ROT13</button>
      <button type="button" on:click={() => loadExample('atbash')}>Atbash</button>
      <button type="button" on:click={() => loadExample('vigenere')}>Vigenere</button>
      <button type="button" on:click={() => loadExample('railFence')}>Rail Fence</button>
      <button type="button" on:click={() => loadExample('morse')}>Morse</button>
    </div>
  </section>

  <section class="panel status" aria-live="polite" aria-atomic="true">
    <p>{statusMessage}</p>
    {#if copyStatus}
      <p class="copy-status">{copyStatus}</p>
    {/if}
  </section>

  <section class="panel summary" aria-label="Likely cipher summary">
    {#if currentCandidate()}
      <div class="summary-head">
        <div>
          <p class="eyebrow">Likely cipher</p>
          <h2>{currentCandidate()?.name}</h2>
          <p>{currentCandidate()?.reasons[0]}</p>
        </div>
        <div class={`score-chip ${currentSummaryClass(currentCandidate())}`}>
          {currentCandidate()?.confidence}/100
        </div>
      </div>

      <div class="confidence-track" aria-hidden="true">
        <div style={`width: ${currentCandidate()?.confidence ?? 0}%`}></div>
      </div>

      <div class="badge-row">
        <span class="badge">{currentCandidate()?.band}</span>
        <span class="badge">{currentCandidate()?.validation}</span>
        <span class="badge">{currentReport()?.candidates.length} candidates</span>
      </div>
    {:else}
      <p class="muted">Paste input to see ranked cipher matches.</p>
    {/if}
  </section>

  <section class="panel view-toggle" aria-label="Result view">
    <div class="row">
      <button class:active={selectedView === 'human'} type="button" on:click={() => (selectedView = 'human')}>Human view</button>
      <button class:active={selectedView === 'json'} type="button" on:click={() => (selectedView = 'json')}>JSON view</button>
    </div>
  </section>

  {#if selectedView === 'human'}
    <section class="panel" aria-label="Human-readable inspection results">
      {#if reportBundle.warnings.length > 0}
        <div class="inline-warnings">
          {#each reportBundle.warnings as warning}
            <p>{warning.message}</p>
          {/each}
        </div>
      {/if}

      {#if reportBundle.reports.length === 0}
        <p class="muted">Paste input to start analysis.</p>
      {:else}
        {#if mode === 'batch' && reportBundle.reports.length > 1}
          <div class="panel nav-panel" aria-label="Result navigation">
            <div class="row nav-row">
              <button type="button" on:click={focusPreviousEntry}>Previous entry</button>
              <button type="button" on:click={focusNextEntry}>Next entry</button>
              <span class="muted">Keyboard: Alt + Arrow Up / Alt + Arrow Down</span>
            </div>
            <div class="row jump-row">
              {#each reportBundle.reports as entry, i}
                <button
                  type="button"
                  class:active={i === activeEntryIndex}
                  on:click={() => focusEntry(i)}
                  aria-label={`Jump to entry ${entry.index}`}
                >
                  #{entry.index}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <div class="results-grid">
          {#each reportBundle.reports as entry, i}
            <article
              id={`cipher-entry-${entry.index}`}
              class="result-card"
              class:compact={mode === 'batch'}
              tabindex="-1"
              aria-label={`Entry ${entry.index} likely ${entry.report.topMatch.name}`}
              on:focus={() => (activeEntryIndex = i)}
            >
              <header class="result-head">
                <h3>Entry {entry.index}</h3>
                <span class={`badge score ${currentSummaryClass(entry.report.topMatch)}`}>{entry.report.topMatch.confidence}/100</span>
              </header>

              <p class="preview">Input preview: {sanitizeText(entry.valuePreview)}</p>

              <div class="top-match">
                <p><strong>Top match:</strong> {entry.report.topMatch.name}</p>
                <p><strong>Tier:</strong> {entry.report.topMatch.band}</p>
                <p><strong>Validation:</strong> {entry.report.topMatch.validation}</p>
                <p><strong>Why:</strong> {entry.report.topMatch.reasons.join(' ')}</p>
                <p><strong>Less likely:</strong> {entry.report.topMatch.whyLessLikely.join(' ')}</p>
              </div>

              <div class="meta-grid">
                <p><strong>Length:</strong> {entry.report.topMatch.metadata.length}</p>
                <p><strong>Entropy:</strong> {entry.report.topMatch.metadata.entropy}</p>
                <p><strong>IOC:</strong> {entry.report.topMatch.metadata.indexOfCoincidence}</p>
                <p><strong>Words:</strong> {entry.report.topMatch.metadata.wordCount}</p>
              </div>

              {#if entry.report.topMatch.metadata.likelyPeriods}
                <p><strong>Likely periods:</strong> {entry.report.topMatch.metadata.likelyPeriods.join(', ')}</p>
              {/if}

              {#if showPreviews}
                <section class="decoder-section" aria-label="Decoder previews">
                  <h4>Decoder previews</h4>
                  <div class="preview-grid">
                    {#each entry.report.decoderPreviews as preview}
                      <article class="preview-card">
                        <header>
                          <strong>{preview.label}</strong>
                          <span class="badge">{preview.confidence}/100</span>
                        </header>
                        <p>{preview.note}</p>
                        <pre>{sanitizeText(preview.preview)}</pre>
                      </article>
                    {/each}
                  </div>
                </section>
              {/if}

              <details>
                <summary>All candidates ({entry.report.candidates.length})</summary>
                <div class="candidate-list">
                  {#each entry.report.candidates as candidate}
                    <article class="candidate-item">
                      <header>
                        <strong>{candidate.name}</strong>
                        <span class={`badge score ${candidate.band}`}>{candidate.confidence}/100</span>
                      </header>
                      <div class="confidence-track small" aria-hidden="true">
                        <div style={`width: ${candidateBarWidth(candidate)}`}></div>
                      </div>
                      <p>{candidate.reasons.join(' ')}</p>
                      <p class="muted">Why less likely: {candidate.whyLessLikely.join(' ')}</p>
                    </article>
                  {/each}
                </div>
              </details>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  {:else}
    <section class="panel" aria-label="Machine-readable inspection report">
      <h2>JSON report</h2>
      <pre>{jsonText()}</pre>
    </section>
  {/if}
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 1200px;
  }

  .tool-header {
    display: grid;
    gap: var(--space-1);
  }

  .panel {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }

  .warning ul {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 6px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .row button.active {
    border-color: var(--accent);
    color: var(--accent);
  }

  textarea,
  pre {
    width: 100%;
    resize: vertical;
    font-size: 13px;
  }

  pre {
    margin: 0;
    max-height: 340px;
    overflow: auto;
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #0f0f0f;
  }

  .copy-status {
    color: var(--accent);
  }

  .summary-head {
    display: flex;
    justify-content: space-between;
    gap: var(--space-1);
    align-items: flex-start;
  }

  .eyebrow,
  .muted,
  p,
  li,
  label {
    font-size: 14px;
    color: var(--text-muted);
    margin: 0;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 12px;
    margin-bottom: 4px;
  }

  .score-chip {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 8px 12px;
    font-weight: 700;
    min-width: 88px;
    text-align: center;
  }

  .score-definite {
    color: #7ee787;
    border-color: rgba(126, 231, 135, 0.35);
  }

  .score-likely {
    color: #9dc2ff;
    border-color: rgba(157, 194, 255, 0.35);
  }

  .score-possible {
    color: #ffd17a;
    border-color: rgba(255, 209, 122, 0.35);
  }

  .score-weak {
    color: #ff9b9b;
    border-color: rgba(255, 155, 155, 0.35);
  }

  .confidence-track {
    width: 100%;
    height: 10px;
    border-radius: 999px;
    overflow: hidden;
    background: #1a1a1a;
    border: 1px solid var(--border);
  }

  .confidence-track.small {
    height: 8px;
  }

  .confidence-track > div {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), rgba(126, 231, 135, 0.95));
  }

  .badge-row {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 12px;
  }

  .results-grid {
    display: grid;
    gap: var(--space-2);
  }

  .nav-panel {
    gap: var(--space-1);
    padding: var(--space-1);
    background: #101010;
  }

  .jump-row button {
    min-width: 44px;
  }

  .result-card {
    display: grid;
    gap: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-2);
    background: #111111;
  }

  .result-card.compact {
    padding: var(--space-1);
    gap: 8px;
  }

  .result-card:focus-visible,
  button:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .result-head,
  .preview-card header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .decoder-section {
    display: grid;
    gap: var(--space-1);
  }

  .preview-grid {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .preview-card,
  .candidate-item {
    display: grid;
    gap: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-1);
    background: #0f0f0f;
  }

  .candidate-list,
  .inline-warnings,
  .actions {
    display: grid;
    gap: var(--space-1);
  }

  .candidate-item p,
  .preview-card p {
    margin: 0;
  }

  .preview-card pre {
    max-height: 120px;
  }

  @media (max-width: 900px) {
    .meta-grid {
      grid-template-columns: 1fr;
    }

    .summary-head {
      flex-direction: column;
    }
  }
</style>