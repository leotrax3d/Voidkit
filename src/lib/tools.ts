import {
  Binary,
  Braces,
  Coins,
  Dice5,
  Dices,
  Diff,
  Fingerprint,
  FileText,
  Hash,
  KeyRound,
  ScrollText,
  ListOrdered,
  QrCode,
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
