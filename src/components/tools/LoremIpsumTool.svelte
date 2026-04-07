<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import { onMount } from 'svelte';

  export let tool: Tool;

  type GenerationMode = 'words' | 'sentences' | 'paragraphs';

  const WORD_BANK = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
    'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'ut',
    'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi',
    'ut', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'dolor', 'in',
    'reprehenderit', 'in', 'voluptate', 'velit', 'esse', 'cillum', 'dolore', 'eu', 'fugiat', 'nulla',
    'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'in',
    'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'pharetra',
    'hendrerit', 'vestibulum', 'fermentum', 'integer', 'lobortis', 'tristique', 'facilisi', 'morbi'
  ];

  let mode: GenerationMode = 'words';
  let amount = 20;
  let startWithLorem = true;
  let outputText = '';
  let copyMessage = '';

  function randomInt(maxExclusive: number): number {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % maxExclusive;
  }

  function randomWord(): string {
    return WORD_BANK[randomInt(WORD_BANK.length)];
  }

  function capitalise(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function makeWordSequence(wordCount: number, forceLoremStart: boolean): string {
    const words: string[] = [];

    if (forceLoremStart && wordCount > 0) {
      words.push('Lorem');
    }

    if (forceLoremStart && wordCount > 1) {
      words.push('ipsum');
    }

    while (words.length < wordCount) {
      words.push(randomWord());
    }

    return words.join(' ');
  }

  function makeSentence(): string {
    const wordCount = 8 + randomInt(11);
    const sentence = makeWordSequence(wordCount, startWithLorem);
    return `${capitalise(sentence.trim())}.`;
  }

  function makeParagraph(): string {
    const sentenceCount = 2 + randomInt(3);
    return Array.from({ length: sentenceCount }, () => makeSentence()).join(' ');
  }

  function generate(): void {
    if (amount < 1) {
      outputText = '';
      return;
    }

    if (mode === 'words') {
      outputText = makeWordSequence(amount, startWithLorem);
      if (startWithLorem && outputText.length > 0) {
        outputText = capitalise(outputText);
      }
    } else if (mode === 'sentences') {
      outputText = Array.from({ length: amount }, () => makeSentence()).join(' ');
    } else {
      outputText = Array.from({ length: amount }, () => makeParagraph()).join('\n\n');
    }

    copyMessage = '';
  }

  onMount(() => {
    generate();
  });

  function regenerate(): void {
    generate();
  }

  async function copyOutput(): Promise<void> {
    if (!browser || outputText.length === 0) return;

    try {
      await navigator.clipboard.writeText(outputText);
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

  <section class="panel" aria-label="Lorem Ipsum options">
    <div class="field">
      <label for="lorem-mode">Type</label>
      <select id="lorem-mode" bind:value={mode}>
        <option value="words">Words</option>
        <option value="sentences">Sentences</option>
        <option value="paragraphs">Paragraphs</option>
      </select>
    </div>

    <div class="field range-field">
      <div class="range-head">
        <label for="lorem-amount">Amount: {amount}</label>
        <span class="muted">1-100</span>
      </div>
      <input id="lorem-amount" type="number" min="1" max="100" bind:value={amount} />
      <input type="range" min="1" max="100" bind:value={amount} aria-label="Amount slider" />
    </div>

    <label class="toggle"><input type="checkbox" bind:checked={startWithLorem} /> Start with "Lorem ipsum..."</label>

    <button class="primary" type="button" on:click={generate}>Generate</button>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <div class="actions">
        <button type="button" on:click={copyOutput} disabled={outputText.length === 0}>Copy</button>
        <button type="button" on:click={regenerate}>Regenerate</button>
      </div>
    </div>

    <textarea readonly bind:value={outputText} rows="14" placeholder="Generated text appears here."></textarea>
    <p class="copy-status">{copyMessage}</p>
  </section>
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 980px;
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

  .range-head,
  .output-head,
  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .range-field {
    max-width: 360px;
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--text-muted);
    font-size: 14px;
  }

  .primary {
    border-color: var(--accent);
    color: var(--accent);
  }

  textarea {
    width: 100%;
    min-height: 220px;
    resize: vertical;
  }

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
</style>