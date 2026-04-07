<script lang="ts">
  import { browser } from '$app/environment';
  import type { Tool } from '$lib/types';

  export let tool: Tool;

  type BaseValue = 2 | 8 | 10 | 16;

  const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

  const BASE_OPTIONS: Array<{ label: string; value: BaseValue }> = [
    { label: 'Binary (2)', value: 2 },
    { label: 'Octal (8)', value: 8 },
    { label: 'Decimal (10)', value: 10 },
    { label: 'Hex (16)', value: 16 }
  ];

  let fromBase: BaseValue = 10;
  let inputValue = '';
  let binaryValue = '';
  let octalValue = '';
  let decimalValue = '';
  let hexValue = '';
  let errorMessage = '';
  let copyMessage = '';

  function validateInput(rawValue: string, base: BaseValue): bigint | undefined {
    const trimmed = rawValue.trim();

    if (trimmed.length === 0) {
      errorMessage = '';
      binaryValue = '';
      octalValue = '';
      decimalValue = '';
      hexValue = '';
      return undefined;
    }

    const patterns: Record<BaseValue, RegExp> = {
      2: /^[-+]?[01]+$/,
      8: /^[-+]?[0-7]+$/,
      10: /^[-+]?\d+$/,
      16: /^[-+]?[0-9a-fA-F]+$/
    };

    if (!patterns[base].test(trimmed)) {
      errorMessage = `Input contains invalid characters for base ${base}.`;
      return undefined;
    }

    const negative = trimmed.startsWith('-');
    const digits = trimmed.replace(/^[-+]/, '');
    let total = 0n;

    for (const character of digits.toLowerCase()) {
      const digit = Number.parseInt(character, base);

      if (!Number.isFinite(digit) || digit < 0 || digit >= base) {
        errorMessage = `Input contains invalid characters for base ${base}.`;
        return undefined;
      }

      total = total * BigInt(base) + BigInt(digit);
    }

    if (negative) {
      total = -total;
    }

    if (total < -MAX_SAFE || total > MAX_SAFE) {
      errorMessage = 'Value exceeds the JavaScript safe integer range.';
      return undefined;
    }

    errorMessage = '';
    return total;
  }

  function groupBinaryDigits(value: bigint): string {
    const negative = value < 0n;
    const digits = (negative ? -value : value).toString(2);
    const grouped = digits.replace(/\B(?=(\d{4})+(?!\d))/g, ' ');
    return negative ? `-${grouped}` : grouped;
  }

  function formatBase(value: bigint, base: BaseValue): string {
    const negative = value < 0n;
    const digits = (negative ? -value : value).toString(base);
    const formatted = base === 16 ? digits.toUpperCase() : digits;
    return negative ? `-${formatted}` : formatted;
  }

  function updateConversion(): void {
    const parsed = validateInput(inputValue, fromBase);

    if (inputValue.trim().length === 0) {
      copyMessage = '';
      return;
    }

    if (parsed === undefined) {
      binaryValue = '';
      octalValue = '';
      decimalValue = '';
      hexValue = '';
      copyMessage = '';
      return;
    }

    binaryValue = groupBinaryDigits(parsed);
    octalValue = formatBase(parsed, 8);
    decimalValue = formatBase(parsed, 10);
    hexValue = formatBase(parsed, 16);
    copyMessage = '';
  }

  function handleBaseChange(value: string): void {
    fromBase = Number(value) as BaseValue;
    updateConversion();
  }

  async function copyValue(value: string): Promise<void> {
    if (!browser || value.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      copyMessage = 'Copied.';
    } catch {
      copyMessage = 'Copy failed.';
    }
  }

  $: {
    inputValue;
    fromBase;
    updateConversion();
  }
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel" aria-label="Base converter input section">
    <div class="field">
      <label for="from-base">From base</label>
      <select id="from-base" bind:value={fromBase} on:change={(event) => handleBaseChange((event.currentTarget as HTMLSelectElement).value)}>
        {#each BASE_OPTIONS as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <div class="field">
      <label for="base-input">Number</label>
      <input
        id="base-input"
        type="text"
        inputmode="text"
        bind:value={inputValue}
        class:error={errorMessage.length > 0}
        aria-invalid={errorMessage.length > 0}
        placeholder="Enter a number"
      />
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <h2>Result</h2>
      <span class="muted">Conversions update instantly</span>
    </div>

    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {:else if inputValue.trim().length === 0}
      <p class="muted">Enter a value to see all bases.</p>
    {:else}
      <div class="result-grid">
        <article class="result-row">
          <div>
            <span class="label">Binary</span>
            <code>{binaryValue}</code>
          </div>
          <button type="button" on:click={() => copyValue(binaryValue)} disabled={binaryValue.length === 0}>Copy</button>
        </article>

        <article class="result-row">
          <div>
            <span class="label">Octal</span>
            <code>{octalValue}</code>
          </div>
          <button type="button" on:click={() => copyValue(octalValue)} disabled={octalValue.length === 0}>Copy</button>
        </article>

        <article class="result-row">
          <div>
            <span class="label">Decimal</span>
            <code>{decimalValue}</code>
          </div>
          <button type="button" on:click={() => copyValue(decimalValue)} disabled={decimalValue.length === 0}>Copy</button>
        </article>

        <article class="result-row">
          <div>
            <span class="label">Hex</span>
            <code>{hexValue}</code>
          </div>
          <button type="button" on:click={() => copyValue(hexValue)} disabled={hexValue.length === 0}>Copy</button>
        </article>
      </div>
    {/if}

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

  input,
  select {
    width: 100%;
  }

  .output-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .result-grid {
    display: grid;
    gap: var(--space-1);
  }

  .result-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #111111;
  }

  .result-row div {
    display: grid;
    gap: 4px;
  }

  .label {
    color: var(--text-muted);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  code {
    color: var(--text-primary);
    font-size: 14px;
    word-break: break-all;
  }

  .error {
    color: #f08b8b;
    font-size: 14px;
  }

  .muted {
    color: var(--text-muted);
    font-size: 14px;
  }

  .copy-status {
    color: var(--accent);
    min-height: 21px;
  }

  .error {
    border-color: #b84a4a;
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

  @media (max-width: 720px) {
    .result-row {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
