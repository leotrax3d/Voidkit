import { Coins, Dice5, Dices, ListOrdered, Users } from 'lucide-svelte';
import type { CategoryGroup, Tool } from '$lib/types';

export const tools: Tool[] = [
  {
    id: 'random-number',
    name: 'Random Number Generator',
    description: 'Generate one or many random integers within a custom range.',
    category: 'Zufall & Entscheidung',
    icon: Dice5,
    slug: 'random-number'
  },
  {
    id: 'dice-roller',
    name: 'Wuerfel',
    description: 'Roll one or more dice and track your recent outcomes.',
    category: 'Zufall & Entscheidung',
    icon: Dices,
    slug: 'dice-roller'
  },
  {
    id: 'coin-flip',
    name: 'Muenzwurf',
    description: 'Flip a coin once or in batches with session statistics.',
    category: 'Zufall & Entscheidung',
    icon: Coins,
    slug: 'coin-flip'
  },
  {
    id: 'list-randomizer',
    name: 'Listenrandomizer',
    description: 'Shuffle line-based lists instantly with Fisher-Yates.',
    category: 'Zufall & Entscheidung',
    icon: ListOrdered,
    slug: 'list-randomizer'
  },
  {
    id: 'group-splitter',
    name: 'Gruppenteiler',
    description: 'Split names or items into random balanced groups.',
    category: 'Zufall & Entscheidung',
    icon: Users,
    slug: 'group-splitter'
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
