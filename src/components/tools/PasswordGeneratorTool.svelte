<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';
  import { onMount } from 'svelte';

  export let tool: Tool;

  type StrengthLabel = 'Weak' | 'Fair' | 'Strong' | 'Very Strong';

  const STORAGE_KEY = 'voidkit_password-generator_settings';

  const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
  const NUMBERS = '0123456789';
  const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/|~';

  type PasswordEntry = {
    value: string;
    strength: StrengthLabel;
    entropy: number;
  };

  let useUppercase = true;
  let useLowercase = true;
  let useNumbers = true;
  let useSymbols = true;
  let length = 20;
  let count = 3;
  let passwords: PasswordEntry[] = [];
  let errorMessage = '';
  let hydrated = false;

  function randomInt(maxExclusive: number): number {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % maxExclusive;
  }

  function activeSets(): string[] {
    const sets: string[] = [];

    if (useUppercase) sets.push(UPPERCASE);
    if (useLowercase) sets.push(LOWERCASE);
    if (useNumbers) sets.push(NUMBERS);
    if (useSymbols) sets.push(SYMBOLS);

    return sets;
  }

  function charset(): string {
    return activeSets().join('');
  }

  function strengthFromEntropy(entropy: number): StrengthLabel {
    if (entropy < 40) return 'Weak';
    if (entropy < 60) return 'Fair';
    if (entropy < 80) return 'Strong';
    return 'Very Strong';
  }

  function pickCharacter(set: string): string {
    return set[randomInt(set.length)];
  }

  function shuffleCharacters(values: string[]): string[] {
    const next = [...values];

    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }

    return next;
  }

  function buildPassword(sets: string[], allCharacters: string): string {
    const requiredCharacters = sets.map((set) => pickCharacter(set));
    const paddingCharacters: string[] = [];

    while (requiredCharacters.length + paddingCharacters.length < length) {
      paddingCharacters.push(pickCharacter(allCharacters));
    }

    return shuffleCharacters([...requiredCharacters, ...paddingCharacters]).join('');
  }

  function generatePasswords(): void {
    const sets = activeSets();

    if (sets.length === 0) {
      passwords = [];
      errorMessage = 'Select at least one character set.';
      return;
    }

    if (length < sets.length) {
      passwords = [];
      errorMessage = 'Length must be at least the number of selected character sets.';
      return;
    }

    const allCharacters = charset();
    const entropy = length * Math.log2(allCharacters.length);

    passwords = Array.from({ length: count }, () => ({
      value: buildPassword(sets, allCharacters),
      strength: strengthFromEntropy(entropy),
      entropy
    }));
    errorMessage = '';
  }

  function persistSettings(): void {
    if (!browser) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        useUppercase,
        useLowercase,
        useNumbers,
        useSymbols,
        length,
        count
      })
    );
  }

  onMount(() => {
    if (!browser) {
      hydrated = true;
      return;
    }

    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          useUppercase?: boolean;
          useLowercase?: boolean;
          useNumbers?: boolean;
          useSymbols?: boolean;
          length?: number;
          count?: number;
        };

        useUppercase = parsed.useUppercase ?? true;
        useLowercase = parsed.useLowercase ?? true;
        useNumbers = parsed.useNumbers ?? true;
        useSymbols = parsed.useSymbols ?? true;
        length = parsed.length ?? 20;
        count = parsed.count ?? 3;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    hydrated = true;
    generatePasswords();
  });

  $: if (hydrated) {
    persistSettings();
    generatePasswords();
  }

  async function copyPassword(value: string): Promise<void> {
    if (!browser) return;

    await navigator.clipboard.writeText(value);
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel" aria-label="Password generator input section">
    <div class="toggle-grid">
      <label><input type="checkbox" bind:checked={useUppercase} /> Uppercase letters (A-Z)</label>
      <label><input type="checkbox" bind:checked={useLowercase} /> Lowercase letters (a-z)</label>
      <label><input type="checkbox" bind:checked={useNumbers} /> Numbers (0-9)</label>
      <label><input type="checkbox" bind:checked={useSymbols} /> Symbols (!@#$%^&*...)</label>
    </div>

    <div class="field">
      <label for="password-length">Length: {length}</label>
      <input id="password-length" type="range" min="4" max="128" bind:value={length} />
    </div>

    <div class="field short">
      <label for="password-count">Count (1-10)</label>
      <input id="password-count" type="number" min="1" max="10" bind:value={count} />
    </div>

    <button class="primary" type="button" on:click={generatePasswords}>Generate</button>
  </section>

  {#if errorMessage}
    <section class="panel warning panel-subtle" aria-live="polite" aria-atomic="true">
      <p>{errorMessage}</p>
    </section>
  {/if}

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <span class="muted">Generated passwords</span>
    </div>

    {#if passwords.length === 0}
      <p class="muted">No passwords generated yet.</p>
    {:else}
      <ul>
        {#each passwords as entry}
          <li>
            <code>{entry.value}</code>
            <span class="strength">{entry.strength}</span>
            <button type="button" on:click={() => copyPassword(entry.value)}>Copy</button>
          </li>
        {/each}
      </ul>
    {/if}
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

  .toggle-grid {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toggle-grid label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--text-muted);
    font-size: 14px;
  }

  .field {
    display: grid;
    gap: var(--space-1);
  }

  .short {
    max-width: 220px;
  }

  .primary {
    border-color: var(--accent);
    color: var(--accent);
    justify-self: start;
  }

  .warning p {
    color: var(--error-text);
  }

  .output-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--space-1);
  }

  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-1);
    background: var(--surface-subtle);
  }

  code {
    font-size: 14px;
    color: var(--text-primary);
    word-break: break-all;
  }

  .strength {
    color: var(--text-muted);
    font-size: 14px;
    white-space: nowrap;
  }

  h1 {
    font-size: 24px;
  }

  h2 {
    font-size: 16px;
  }

  p,
  label,
  .muted {
    font-size: 14px;
    color: var(--text-muted);
  }

  @media (max-width: 720px) {
    .toggle-grid {
      grid-template-columns: 1fr;
    }

    li {
      grid-template-columns: 1fr;
    }
  }
</style>