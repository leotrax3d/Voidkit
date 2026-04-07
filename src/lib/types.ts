import type { ComponentType } from 'svelte';

export type ToolCategory = string;

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: ComponentType;
  slug: string;
}

export interface CategoryGroup {
  category: ToolCategory;
  tools: Tool[];
}
