import {
  ArrowLeftRight,
  Binary,
  Braces,
  Camera,
  Clock3,
  Coins,
  ContrastIcon,
  Dice5,
  Dices,
  Diff,
  Fingerprint,
  FileText,
  Hash,
  KeyRound,
  Layers3Icon,
  ListOrdered,
  PaletteIcon,
  Percent,
  QrCode,
  ScrollText,
  SparklesIcon,
  Users
} from 'lucide-svelte';
import type { CategoryGroup, Tool } from '$lib/types';

export const tools: Tool[] = [
  {
    id: 'random-number',
    name: 'Random Number Generator',
    description: 'Generate one or many random integers within a custom range.',
    category: 'Random & Decision',
    icon: Dice5,
    slug: 'random-number'
  },
  {
    id: 'dice-roller',
    name: 'Dice Roller',
    description: 'Roll one or more dice and track your recent outcomes.',
    category: 'Random & Decision',
    icon: Dices,
    slug: 'dice-roller'
  },
  {
    id: 'coin-flip',
    name: 'Coin Flip',
    description: 'Flip a coin once or in batches with session statistics.',
    category: 'Random & Decision',
    icon: Coins,
    slug: 'coin-flip'
  },
  {
    id: 'list-randomizer',
    name: 'List Randomizer',
    description: 'Shuffle line-based lists instantly with Fisher-Yates.',
    category: 'Random & Decision',
    icon: ListOrdered,
    slug: 'list-randomizer'
  },
  {
    id: 'group-splitter',
    name: 'Group Splitter',
    description: 'Split names or items into random balanced groups.',
    category: 'Random & Decision',
    icon: Users,
    slug: 'group-splitter'
  },
  {
    id: 'caesar-cipher',
    name: 'Caesar Cipher',
    description: 'Encrypt or decrypt text with a configurable Caesar shift.',
    category: 'Crypto & Ciphers',
    icon: KeyRound,
    slug: 'caesar-cipher'
  },
  {
    id: 'vigenere-cipher',
    name: 'Vigenere Cipher',
    description: 'Apply keyword-based polyalphabetic encryption and decryption.',
    category: 'Crypto & Ciphers',
    icon: KeyRound,
    slug: 'vigenere-cipher'
  },
  {
    id: 'playfair-cipher',
    name: 'Playfair Cipher',
    description: 'Encrypt digraphs with a classic 5x5 Playfair matrix.',
    category: 'Crypto & Ciphers',
    icon: Braces,
    slug: 'playfair-cipher'
  },
  {
    id: 'hill-cipher',
    name: 'Hill Cipher (2x2)',
    description: 'Matrix-based Hill cipher for educational encryption and decryption.',
    category: 'Crypto & Ciphers',
    icon: Layers3Icon,
    slug: 'hill-cipher'
  },
  {
    id: 'substitution-cipher',
    name: 'Substitution Cipher',
    description: 'Use a custom or randomized monoalphabetic substitution map.',
    category: 'Crypto & Ciphers',
    icon: ArrowLeftRight,
    slug: 'substitution-cipher'
  },
  {
    id: 'columnar-transposition',
    name: 'Columnar Transposition',
    description: 'Transpose plaintext columns using a sortable keyword.',
    category: 'Crypto & Ciphers',
    icon: ListOrdered,
    slug: 'columnar-transposition'
  },
  {
    id: 'morse-code',
    name: 'Morse Code Translator',
    description: 'Convert text to Morse code and back with word separators.',
    category: 'Crypto & Ciphers',
    icon: FileText,
    slug: 'morse-code'
  },
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    description: 'Decode JWT header and payload locally without sending data anywhere.',
    category: 'Crypto & Ciphers',
    icon: Braces,
    slug: 'jwt-decoder'
  },
  {
    id: 'base32-base58',
    name: 'Base32/Base58 Converter',
    description: 'Encode and decode Base32 or Base58 values in one view.',
    category: 'Crypto & Ciphers',
    icon: Binary,
    slug: 'base32-base58'
  },
  {
    id: 'crypto-inspector',
    name: 'Crypto String Inspector',
    description: 'Classify, validate, and explain crypto-like strings with confidence scoring and JSON reports.',
    category: 'Crypto & Ciphers',
    icon: Fingerprint,
    slug: 'crypto-inspector'
  },
  {
    id: 'affine-cipher-advanced',
    name: 'Affine Cipher',
    description: 'Encode and decode affine substitutions with strict key invertibility checks.',
    category: 'Crypto & Ciphers',
    icon: KeyRound,
    slug: 'affine-cipher-advanced'
  },
  {
    id: 'polybius-square',
    name: 'Polybius Square',
    description: 'Convert letters to grid coordinates and decode coordinate pairs back to text.',
    category: 'Crypto & Ciphers',
    icon: Braces,
    slug: 'polybius-square'
  },
  {
    id: 'bacon-cipher',
    name: 'Bacon Cipher',
    description: 'Encode letters to A/B five-symbol groups and decode validated A/B streams.',
    category: 'Crypto & Ciphers',
    icon: Binary,
    slug: 'bacon-cipher'
  },
  {
    id: 'beaufort-cipher',
    name: 'Beaufort Cipher',
    description: 'Use reciprocal keyword substitution for both encryption and decryption.',
    category: 'Crypto & Ciphers',
    icon: KeyRound,
    slug: 'beaufort-cipher'
  },
  {
    id: 'autokey-cipher',
    name: 'Autokey Cipher',
    description: 'Apply keyword-driven polyalphabetic transforms with dynamic key continuation.',
    category: 'Crypto & Ciphers',
    icon: KeyRound,
    slug: 'autokey-cipher'
  },
  {
    id: 'gronsfeld-cipher',
    name: 'Gronsfeld Cipher',
    description: 'Shift letters with a numeric key sequence and strict key format validation.',
    category: 'Crypto & Ciphers',
    icon: Binary,
    slug: 'gronsfeld-cipher'
  },
  {
    id: 'porta-cipher',
    name: 'Porta Cipher',
    description: 'Use classical reciprocal keyed substitution based on alphabet pair tables.',
    category: 'Crypto & Ciphers',
    icon: ArrowLeftRight,
    slug: 'porta-cipher'
  },
  {
    id: 'adfgx',
    name: 'ADFGX Cipher',
    description: 'Apply ADFGX fractionation and columnar transposition with keyed square settings.',
    category: 'Crypto & Ciphers',
    icon: ListOrdered,
    slug: 'adfgx'
  },
  {
    id: 'adfgvx',
    name: 'ADFGVX Cipher',
    description: 'Encode and decode ADFGVX text with a 6x6 keyed square and transposition stage.',
    category: 'Crypto & Ciphers',
    icon: ListOrdered,
    slug: 'adfgvx'
  },
  {
    id: 'nihilist-cipher',
    name: 'Nihilist Cipher',
    description: 'Use Polybius-based numeric addition with a repeating keyed number stream.',
    category: 'Crypto & Ciphers',
    icon: Layers3Icon,
    slug: 'nihilist-cipher'
  },
  {
    id: 'password-generator',
    name: 'Password Generator',
    description: 'Generate secure passwords with strength indicators.',
    category: 'Security & Encoding',
    icon: KeyRound,
    slug: 'password-generator'
  },
  {
    id: 'hash-generator',
    name: 'Hash Generator',
    description: 'Generate SHA hashes for text using the Web Crypto API.',
    category: 'Security & Encoding',
    icon: Hash,
    slug: 'hash-generator'
  },
  {
    id: 'uuid-generator',
    name: 'UUID Generator',
    description: 'Generate v4 UUIDs quickly and copy them individually.',
    category: 'Security & Encoding',
    icon: Fingerprint,
    slug: 'uuid-generator'
  },
  {
    id: 'base64',
    name: 'Base64 Encoder/Decoder',
    description: 'Encode or decode Base64 text in a live two-panel view.',
    category: 'Security & Encoding',
    icon: Binary,
    slug: 'base64'
  },
  {
    id: 'qr-code',
    name: 'QR Code Generator',
    description: 'Generate downloadable SVG QR codes client-side.',
    category: 'Security & Encoding',
    icon: QrCode,
    slug: 'qr-code'
  },
  {
    id: 'character-counter',
    name: 'Character Counter',
    description: 'Track characters, words, sentences, paragraphs, lines, and reading time.',
    category: 'Text & Data',
    icon: FileText,
    slug: 'character-counter'
  },
  {
    id: 'text-diff',
    name: 'Text Diff',
    description: 'Compare two text blocks with a simple line-based diff.',
    category: 'Text & Data',
    icon: Diff,
    slug: 'text-diff'
  },
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format, minify, and validate JSON with client-side highlighting.',
    category: 'Text & Data',
    icon: Braces,
    slug: 'json-formatter'
  },
  {
    id: 'lorem-ipsum',
    name: 'Lorem Ipsum Generator',
    description: 'Generate classical Lorem Ipsum text by words, sentences, or paragraphs.',
    category: 'Text & Data',
    icon: ScrollText,
    slug: 'lorem-ipsum'
  },
  {
    id: 'markdown-preview',
    name: 'Markdown Preview',
    description: 'Edit Markdown with a live sanitized preview and formatting shortcuts.',
    category: 'Text & Data',
    icon: FileText,
    slug: 'markdown-preview'
  },
  {
    id: 'unit-converter',
    name: 'Unit Converter',
    description: 'Convert length, weight, temperature, area, volume, speed, and data units.',
    category: 'Calculators & Converters',
    icon: ArrowLeftRight,
    slug: 'unit-converter'
  },
  {
    id: 'timestamp-converter',
    name: 'Timestamp Converter',
    description: 'Convert between Unix timestamps, human dates, and live clock values.',
    category: 'Calculators & Converters',
    icon: Clock3,
    slug: 'timestamp-converter'
  },
  {
    id: 'base-converter',
    name: 'Number Base Converter',
    description: 'Convert numbers across binary, octal, decimal, and hex values.',
    category: 'Calculators & Converters',
    icon: Binary,
    slug: 'base-converter'
  },
  {
    id: 'percentage-calculator',
    name: 'Percentage Calculator',
    description: 'Calculate common percentage scenarios with live results.',
    category: 'Calculators & Converters',
    icon: Percent,
    slug: 'percentage-calculator'
  },
  {
    id: 'color-picker',
    name: 'Color Picker',
    description: 'Pick colors and convert between HEX, RGB, HSL, HSB, and CMYK.',
    category: 'Design & Color',
    icon: PaletteIcon,
    slug: 'color-picker'
  },
  {
    id: 'contrast-checker',
    name: 'Contrast Checker',
    description: 'Check WCAG contrast ratios and compliance for two colors.',
    category: 'Design & Color',
    icon: ContrastIcon,
    slug: 'contrast-checker'
  },
  {
    id: 'gradient-generator',
    name: 'Gradient Generator',
    description: 'Build linear, radial, and conic gradients with editable stops.',
    category: 'Design & Color',
    icon: SparklesIcon,
    slug: 'gradient-generator'
  },
  {
    id: 'shadow-generator',
    name: 'CSS Shadow Generator',
    description: 'Create box-shadow and text-shadow CSS with live previews.',
    category: 'Design & Color',
    icon: Layers3Icon,
    slug: 'shadow-generator'
  },
  {
    id: 'cron-expression-builder',
    name: 'Cron Expression Builder',
    description: 'Create, parse, and validate POSIX cron expressions with next run previews.',
    category: 'Development',
    icon: Clock3,
    slug: 'cron-expression-builder'
  },
  {
    id: 'camera-finger-counter',
    name: 'Camera Finger Counter',
    description: 'Count raised fingers in real time with on-device hand landmark detection.',
    category: 'Development',
    icon: Camera,
    slug: 'camera-finger-counter'
  },
  {
    id: 'color-palette-generator',
    name: 'Color Palette Generator',
    description: 'Generate harmony palettes with shades, WCAG contrast, and export formats.',
    category: 'Design & Color',
    icon: PaletteIcon,
    slug: 'color-palette-generator'
  }
];

export const categories = Array.from(new Set(tools.map((tool) => tool.category))).sort((a, b) =>
  a.localeCompare(b)
);

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}

export function getGroupedTools(source: Tool[] = tools): CategoryGroup[] {
  const groups = source.reduce<Map<string, Tool[]>>((acc, tool) => {
    const current = acc.get(tool.category) ?? [];
    current.push(tool);
    acc.set(tool.category, current);
    return acc;
  }, new Map());

  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, groupedTools]) => ({
      category,
      tools: groupedTools.sort((a, b) => a.name.localeCompare(b.name))
    }));
}

export const stats = {
  tools: tools.length,
  categories: categories.length
};
