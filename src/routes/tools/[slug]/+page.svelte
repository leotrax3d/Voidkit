<script lang="ts">
  import { page } from '$app/stores';
  import RandomNumberTool from '../../../components/tools/RandomNumberTool.svelte';
  import DiceRollerTool from '../../../components/tools/DiceRollerTool.svelte';
  import CoinFlipTool from '../../../components/tools/CoinFlipTool.svelte';
  import ListRandomizerTool from '../../../components/tools/ListRandomizerTool.svelte';
  import GroupSplitterTool from '../../../components/tools/GroupSplitterTool.svelte';
  import PasswordGeneratorTool from '../../../components/tools/PasswordGeneratorTool.svelte';
  import HashGeneratorTool from '../../../components/tools/HashGeneratorTool.svelte';
  import UuidGeneratorTool from '../../../components/tools/UuidGeneratorTool.svelte';
  import Base64Tool from '../../../components/tools/Base64Tool.svelte';
  import QrCodeTool from '../../../components/tools/QrCodeTool.svelte';
  import CharacterCounterTool from '../../../components/tools/CharacterCounterTool.svelte';
  import TextDiffTool from '../../../components/tools/TextDiffTool.svelte';
  import JsonFormatterTool from '../../../components/tools/JsonFormatterTool.svelte';
  import LoremIpsumTool from '../../../components/tools/LoremIpsumTool.svelte';
  import MarkdownPreviewTool from '../../../components/tools/MarkdownPreviewTool.svelte';
  import UnitConverterTool from '../../../components/tools/UnitConverterTool.svelte';
  import TimestampConverterTool from '../../../components/tools/TimestampConverterTool.svelte';
  import BaseConverterTool from '../../../components/tools/BaseConverterTool.svelte';
  import PercentageCalculatorTool from '../../../components/tools/PercentageCalculatorTool.svelte';
  import { getToolBySlug } from '$lib/tools';
  import type { Tool } from '$lib/types';

  const toolComponents = {
    'random-number': RandomNumberTool,
    'dice-roller': DiceRollerTool,
    'coin-flip': CoinFlipTool,
    'list-randomizer': ListRandomizerTool,
    'group-splitter': GroupSplitterTool,
    'password-generator': PasswordGeneratorTool,
    'hash-generator': HashGeneratorTool,
    'uuid-generator': UuidGeneratorTool,
    base64: Base64Tool,
    'qr-code': QrCodeTool,
    'character-counter': CharacterCounterTool,
    'text-diff': TextDiffTool,
    'json-formatter': JsonFormatterTool,
    'lorem-ipsum': LoremIpsumTool,
    'markdown-preview': MarkdownPreviewTool,
    'unit-converter': UnitConverterTool,
    'timestamp-converter': TimestampConverterTool,
    'base-converter': BaseConverterTool,
    'percentage-calculator': PercentageCalculatorTool
  } as const;

  let slug = '';
  let tool: Tool | undefined;
  let ActiveComponent:
    | (typeof toolComponents)[keyof typeof toolComponents]
    | undefined;

  $: slug = $page.params.slug ?? '';
  $: tool = getToolBySlug(slug);
  $: ActiveComponent = tool
    ? toolComponents[tool.slug as keyof typeof toolComponents]
    : undefined;
</script>

{#if !tool || !ActiveComponent}
  <section class="not-found">
    <h1>Tool not found</h1>
    <p>The requested tool does not exist in the registry.</p>
    <a href="/">Back to overview</a>
  </section>
{:else}
  <svelte:component this={ActiveComponent} {tool} />
{/if}

<style>
  .not-found {
    max-width: 720px;
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }

  h1 {
    margin: 0;
    font-size: 24px;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: var(--text-muted);
  }

  a {
    width: fit-content;
    color: var(--accent);
    border: 1px solid var(--accent);
  }

  a:hover {
    background: #1f1f1f;
  }
</style>
