<script lang="ts">
  import { browser } from '$app/environment';
  import { copy } from '$lib/actions/copy';
  import type { Tool } from '$lib/types';
  import {
    buildCronExpression,
    canonicalizeCronExpression,
    describeCronExpression,
    getNextCronExecutions,
    parseCronExpression,
    type CronFieldState
  } from '$lib/utils/cron';
  import { onMount } from 'svelte';

  export let tool: Tool;

  type Preset = {
    name: string;
    fields: CronFieldState;
  };

  const STORAGE_KEY = 'voidkit_cron-expression-builder';
  const PRESETS: Preset[] = [
    {
      name: 'Jede Minute',
      fields: { minute: '*', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' }
    },
    {
      name: 'Alle 5 Minuten',
      fields: { minute: '*/5', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' }
    },
    {
      name: 'Stündlich',
      fields: { minute: '0', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' }
    },
    {
      name: 'Täglich um 00:00',
      fields: { minute: '0', hour: '0', dayOfMonth: '*', month: '*', dayOfWeek: '*' }
    },
    {
      name: 'Wöchentlich montags',
      fields: { minute: '0', hour: '0', dayOfMonth: '*', month: '*', dayOfWeek: '1' }
    },
    {
      name: 'Monatlich am 1.',
      fields: { minute: '0', hour: '0', dayOfMonth: '1', month: '*', dayOfWeek: '*' }
    }
  ];

  const EXAMPLES: Preset[] = [
    {
      name: 'Alle 15 Minuten während der Arbeitszeit',
      fields: { minute: '*/15', hour: '9-17', dayOfMonth: '*', month: '*', dayOfWeek: '1-5' }
    },
    {
      name: 'Erster Samstag jeden Monats',
      fields: { minute: '0', hour: '10', dayOfMonth: '1-7', month: '*', dayOfWeek: '6' }
    }
  ];

  const FIELD_LABELS: Array<{ key: keyof CronFieldState; label: string; placeholder: string }> = [
    { key: 'minute', label: 'Minute', placeholder: '*' },
    { key: 'hour', label: 'Stunde', placeholder: '*' },
    { key: 'dayOfMonth', label: 'Tag des Monats', placeholder: '*' },
    { key: 'month', label: 'Monat', placeholder: '*' },
    { key: 'dayOfWeek', label: 'Wochentag', placeholder: '*' }
  ];

  const DEFAULT_FIELDS: CronFieldState = PRESETS[0].fields;

  let fields: CronFieldState = { ...DEFAULT_FIELDS };
  let cronInput = buildCronExpression(fields);
  let description = describeCronExpression(cronInput);
  let nextRuns: Date[] = [];
  let errorMessage = '';
  let copiedMessage = '';
  let hydrated = false;

  function persistState(): void {
    if (!browser || !hydrated) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fields, cronInput }));
  }

  function setFeedback(message: string): void {
    copiedMessage = message;
    setTimeout(() => {
      if (copiedMessage === message) {
        copiedMessage = '';
      }
    }, 1500);
  }

  function refreshFromFields(): void {
    cronInput = buildCronExpression(fields);

    try {
      canonicalizeCronExpression(cronInput);
      description = describeCronExpression(cronInput);
      nextRuns = getNextCronExecutions(cronInput, new Date(), 10);
      errorMessage = '';
      persistState();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid cron expression.';
      errorMessage = message;
      nextRuns = [];
    }
  }

  function applyCronInput(value: string): void {
    cronInput = value;

    try {
      const parsed = parseCronExpression(value);
      fields = { ...parsed };
      description = describeCronExpression(value);
      nextRuns = getNextCronExecutions(value, new Date(), 10);
      errorMessage = '';
      persistState();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Invalid cron expression.';
      nextRuns = [];
    }
  }

  function applyField(key: keyof CronFieldState, value: string): void {
    fields = { ...fields, [key]: value };
    refreshFromFields();
  }

  function applyPreset(preset: Preset): void {
    fields = { ...preset.fields };
    refreshFromFields();
  }

  function resetBuilder(): void {
    fields = { ...DEFAULT_FIELDS };
    cronInput = buildCronExpression(fields);
    description = describeCronExpression(cronInput);
    nextRuns = getNextCronExecutions(cronInput, new Date(), 10);
    errorMessage = '';
    persistState();
  }

  function loadExample(example: Preset): void {
    fields = { ...example.fields };
    refreshFromFields();
  }

  function formatRunTime(date: Date): string {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  onMount(() => {
    if (!browser) {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { fields?: CronFieldState; cronInput?: string };
        if (parsed.fields) {
          fields = { ...DEFAULT_FIELDS, ...parsed.fields };
        }

        if (parsed.cronInput) {
          cronInput = parsed.cronInput;
        }
      }
    } catch {
      // ignore bad persisted data
    }

    hydrated = true;

    if (cronInput.trim().length > 0) {
      applyCronInput(cronInput);
    } else {
      refreshFromFields();
    }
  });
</script>

<section class="tool-page" aria-label={tool.name}>
  <header class="tool-header">
    <h1>{tool.name}</h1>
    <p>{tool.description}</p>
  </header>

  <div class="divider"></div>

  <section class="panel presets" aria-label="Cron presets">
    <div class="panel-head">
      <h2>Presets</h2>
      <p class="muted">Schnelle Vorlagen für häufige Cron-Expressions.</p>
    </div>

    <div class="preset-grid">
      {#each PRESETS as preset}
        <button type="button" on:click={() => applyPreset(preset)}>{preset.name}</button>
      {/each}
    </div>
  </section>

  <section class="panel builder" aria-label="Cron fields">
    <div class="field-grid">
      {#each FIELD_LABELS as field}
        <label class="field" for={`cron-${field.key}`}>
          <span>{field.label}</span>
          <input
            id={`cron-${field.key}`}
            type="text"
            value={fields[field.key]}
            placeholder={field.placeholder}
            spellcheck="false"
            on:input={(event) => applyField(field.key, (event.currentTarget as HTMLInputElement).value)}
            aria-label={field.label}
          />
        </label>
      {/each}
    </div>

    <label class="cron-field" for="cron-expression">
      <span>Cron expression</span>
      <input id="cron-expression" type="text" value={cronInput} spellcheck="false" on:input={(event) => applyCronInput((event.currentTarget as HTMLInputElement).value)} aria-label="Cron expression input" />
    </label>

    <div class="actions">
      <button type="button" class="primary" use:copy={cronInput} on:click={() => setFeedback('Cron copied.')}>Copy Cron</button>
      <button type="button" on:click={resetBuilder}>Reset</button>
      <div class="example-group">
        <span class="muted">Beispiele</span>
        <div class="example-buttons">
          {#each EXAMPLES as example}
            <button type="button" on:click={() => loadExample(example)}>{example.name}</button>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <section class="panel output" aria-live="polite">
    <div class="output-head">
      <div>
        <h2>Beschreibung</h2>
        <p class="muted">{description}</p>
      </div>
      <p class="copy-status">{copiedMessage}</p>
    </div>

    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}

    <div class="preview-grid">
      <section class="preview-list" aria-label="Nächste Ausführungen">
        <h3>Nächste 10 Ausführungen</h3>
        {#if nextRuns.length === 0}
          <p class="muted">Keine Vorschau verfügbar, bis die Expression gültig ist.</p>
        {:else}
          <ol>
            {#each nextRuns as run}
              <li>{formatRunTime(run)}</li>
            {/each}
          </ol>
        {/if}
      </section>

      <section class="preview-list" aria-label="Cron format Hilfe">
        <h3>Format</h3>
        <ul>
          <li>Minute: 0-59, Listen, Bereiche, Schritte</li>
          <li>Stunde: 0-23</li>
          <li>Tag des Monats: 1-31</li>
          <li>Monat: 1-12</li>
          <li>Wochentag: 0-6, wobei 0 Sonntag ist</li>
        </ul>
      </section>
    </div>
  </section>
</section>

<style>
  .tool-page {
    display: grid;
    gap: var(--space-2);
    max-width: 1160px;
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

  .panel-head,
  .output-head,
  .actions,
  .example-group {
    display: grid;
    gap: var(--space-1);
  }

  .preset-grid,
  .example-buttons {
    display: grid;
    gap: var(--space-1);
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  }

  .field-grid {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .field,
  .cron-field {
    display: grid;
    gap: var(--space-1);
  }

  .field span,
  .cron-field span,
  .muted {
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .output {
    gap: var(--space-3);
  }

  .output-head {
    grid-template-columns: 1fr auto;
    align-items: start;
  }

  .copy-status,
  .error,
  .preview-list li,
  .preview-list p,
  .preview-list ul {
    margin: 0;
  }

  .error {
    color: #ef4444;
    padding: var(--space-1);
    border: 1px solid rgba(239, 68, 68, 0.4);
    border-radius: var(--radius);
    background: rgba(239, 68, 68, 0.08);
  }

  .preview-grid {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .preview-list {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #111111;
  }

  ol,
  ul {
    padding-left: var(--space-2);
    display: grid;
    gap: 6px;
  }

  .actions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
  }

  @media (max-width: 1024px) {
    .field-grid,
    .preview-grid,
    .actions {
      grid-template-columns: 1fr;
    }
  }
</style>