<script lang="ts">
  import { page } from '$app/stores';
  import Breadcrumb from '../../../components/Breadcrumb.svelte';
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
  import ColorPickerTool from '../../../components/tools/ColorPickerTool.svelte';
  import ContrastCheckerTool from '../../../components/tools/ContrastCheckerTool.svelte';
  import GradientGeneratorTool from '../../../components/tools/GradientGeneratorTool.svelte';
  import ShadowGeneratorTool from '../../../components/tools/ShadowGeneratorTool.svelte';
  import CronExpressionBuilderTool from '../../../components/tools/CronExpressionBuilderTool.svelte';
  import ColorPaletteGeneratorTool from '../../../components/tools/ColorPaletteGeneratorTool.svelte';
  import CaesarCipherTool from '../../../components/tools/CaesarCipherTool.svelte';
  import VigenereCipherTool from '../../../components/tools/VigenereCipherTool.svelte';
  import PlayfairCipherTool from '../../../components/tools/PlayfairCipherTool.svelte';
  import HillCipherTool from '../../../components/tools/HillCipherTool.svelte';
  import SubstitutionCipherTool from '../../../components/tools/SubstitutionCipherTool.svelte';
  import ColumnarTranspositionTool from '../../../components/tools/ColumnarTranspositionTool.svelte';
  import MorseCodeTool from '../../../components/tools/MorseCodeTool.svelte';
  import JwtDecoderTool from '../../../components/tools/JwtDecoderTool.svelte';
  import Base32Base58Tool from '../../../components/tools/Base32Base58Tool.svelte';
  import CryptoInspectorTool from '../../../components/tools/CryptoInspectorTool.svelte';
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
    'percentage-calculator': PercentageCalculatorTool,
    'color-picker': ColorPickerTool,
    'contrast-checker': ContrastCheckerTool,
    'gradient-generator': GradientGeneratorTool,
    'shadow-generator': ShadowGeneratorTool,
    'cron-expression-builder': CronExpressionBuilderTool,
    'color-palette-generator': ColorPaletteGeneratorTool,
    'caesar-cipher': CaesarCipherTool,
    'vigenere-cipher': VigenereCipherTool,
    'playfair-cipher': PlayfairCipherTool,
    'hill-cipher': HillCipherTool,
    'substitution-cipher': SubstitutionCipherTool,
    'columnar-transposition': ColumnarTranspositionTool,
    'morse-code': MorseCodeTool,
    'jwt-decoder': JwtDecoderTool,
    'base32-base58': Base32Base58Tool,
    'crypto-inspector': CryptoInspectorTool
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
  <Breadcrumb slug={slug || ''} />
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
