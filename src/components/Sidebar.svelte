<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import SearchInput from './SearchInput.svelte';
  import { getGroupedTools, getToolBySlug, tools as allTools } from '$lib/tools';
  import { getRecentTools, addRecentTool } from '$lib/utils/recent';
  import type { CategoryGroup, Tool } from '$lib/types';
  import { ExternalLink } from 'lucide-svelte';

  export let tools: Tool[] = [];
  export let activePath = '/';
  export let collapsed = false;
  export let mobileOpen = false;
  export let onToolNavigate: (() => void) | undefined = undefined;

  let query = '';
  let expandedCategories: Record<string, boolean> = {};
  let wasSearching = false;
  let selectedToolIndex = -1;

  onMount(() => {
    if (!browser) return;
    try {
      const stored = localStorage.getItem('voidkit_sidebar_expanded_categories');
      const parsed = stored ? (JSON.parse(stored) as string[]) : [];
      expandedCategories = parsed.reduce<Record<string, boolean>>((acc, category) => {
        acc[category] = true;
        return acc;
      }, {});
    } catch {
      expandedCategories = {};
    }
  });

  $: normalizedQuery = query.trim().toLowerCase();
  $: filteredTools = normalizedQuery
    ? tools.filter((tool) => {
        const haystack = `${tool.name} ${tool.description} ${tool.category} ${tool.slug}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : tools;

  $: groupedTools = getGroupedTools(filteredTools) as CategoryGroup[];

  // Get recent tools
  $: recentTools = getRecentTools().map(recent => getToolBySlug(recent.slug)).filter(Boolean) as Tool[];
  $: keyboardTools = normalizedQuery ? filteredTools : recentTools.length > 0 ? recentTools : filteredTools;
  $: if (selectedToolIndex >= keyboardTools.length) {
    selectedToolIndex = keyboardTools.length - 1;
  }
  $: if (normalizedQuery.length === 0 && selectedToolIndex >= recentTools.length) {
    selectedToolIndex = recentTools.length - 1;
  }
  $: {
    const searching = normalizedQuery.length > 0;
    if (searching && !wasSearching) {
      const next = { ...expandedCategories };
      for (const group of groupedTools) {
        next[group.category] = true;
      }
      expandedCategories = next;
    }
    wasSearching = searching;
  }

  function isActiveTool(slug: string): boolean {
    return activePath === `/tools/${slug}`;
  }

  function toggleCategory(category: string): void {
    const next = { ...expandedCategories };
    next[category] = !Boolean(next[category]);
    expandedCategories = next;
    
    if (browser) {
      try {
        const openCategories = Object.keys(expandedCategories).filter((key) => expandedCategories[key]);
        localStorage.setItem('voidkit_sidebar_expanded_categories', JSON.stringify(openCategories));
      } catch {
        // Persistence must never block the expand/collapse interaction.
      }
    }
  }

  function isGroupExpanded(category: string): boolean {
    return Boolean(expandedCategories[category]);
  }

  function handleGroupToggle(category: string, event: Event): void {
    const details = event.currentTarget as HTMLDetailsElement | null;
    if (!details) return;

    const next = { ...expandedCategories };
    next[category] = details.open;
    expandedCategories = next;

    if (browser) {
      try {
        const openCategories = Object.keys(expandedCategories).filter((key) => expandedCategories[key]);
        localStorage.setItem('voidkit_sidebar_expanded_categories', JSON.stringify(openCategories));
      } catch {
        // Persistence must never block the expand/collapse interaction.
      }
    }
  }

  function highlightMatch(text: string, query: string): string {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  async function openTool(slug: string): Promise<void> {
    addRecentTool(slug);
    selectedToolIndex = -1;
    onToolNavigate?.();
    await goto(`/tools/${slug}`);
  }

  function handleKeydown(event: CustomEvent<KeyboardEvent>): void {
    const e = event.detail;
    const toolsForNavigation = keyboardTools;
    if (!toolsForNavigation.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedToolIndex = Math.min(selectedToolIndex + 1, toolsForNavigation.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedToolIndex = Math.max(selectedToolIndex - 1, 0);
    } else if (e.key === 'Enter' && selectedToolIndex >= 0 && selectedToolIndex < toolsForNavigation.length) {
      e.preventDefault();
      const tool = toolsForNavigation[selectedToolIndex];
      void openTool(tool.slug);
    }
  }
</script>

<aside class:collapsed class:mobile-open={mobileOpen} aria-label="Tools navigation">
  <div class="top-row">
    <a class="brand" href="/" aria-label="Voidkit home">Voidkit</a>
  </div>

  {#if !collapsed}
    <SearchInput bind:value={query} on:keydown={handleKeydown} />

    <nav aria-label="Tool categories">
      {#if normalizedQuery && groupedTools.length === 0}
        <p class="empty">No tools found for '{normalizedQuery}'.</p>
      {:else if !normalizedQuery && recentTools.length > 0}
        <section class="group recent">
          <h2>Recent</h2>
          <ul>
            {#each recentTools as tool, idx}
              <li>
                <a 
                  class:active={isActiveTool(tool.slug)}
                  class:selected={selectedToolIndex === idx}
                  href={`/tools/${tool.slug}`}
                  on:click|preventDefault={() => openTool(tool.slug)}
                >
                  <svelte:component this={tool.icon} aria-hidden="true" size={15} />
                  <span>{tool.name}</span>
                </a>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if groupedTools.length > 0}
        {#each groupedTools as group}
          <details
            class="group"
            aria-label={group.category}
            open={isGroupExpanded(group.category)}
            on:toggle={(event) => handleGroupToggle(group.category, event)}
          >
            <summary
              class="category-header"
            >
              <span class="chevron" aria-hidden="true">▸</span>
              <h2>{group.category}</h2>
              <span class="count">({group.tools.length})</span>
            </summary>

            <ul>
              {#each group.tools as tool}
                <li>
                  <a 
                    class:active={isActiveTool(tool.slug)}
                    class:selected={normalizedQuery.length > 0 && selectedToolIndex === filteredTools.findIndex((entry) => entry.slug === tool.slug)}
                    href={`/tools/${tool.slug}`}
                    on:click|preventDefault={() => openTool(tool.slug)}
                  >
                    <svelte:component this={tool.icon} aria-hidden="true" size={15} />
                    <span>{@html highlightMatch(tool.name, normalizedQuery)}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </details>
        {/each}
      {/if}
    </nav>

    <footer class="sidebar-footer">
      <a class="github-link" href="https://github.com/leotrax3d/voidkit" target="_blank" rel="noopener noreferrer">
        <ExternalLink aria-hidden="true" size={14} />
        <span>GitHub</span>
      </a>
    </footer>
  {/if}
</aside>

<style>
  aside {
    display: grid;
    gap: var(--space-2);
    align-content: start;
    width: 290px;
    min-width: 290px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    padding: var(--space-2);
    height: 100dvh;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }

  aside::-webkit-scrollbar {
    width: 9px;
  }

  aside::-webkit-scrollbar-track {
    background: transparent;
  }

  aside::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  aside::-webkit-scrollbar-thumb:hover {
    background: var(--border-strong);
    background-clip: padding-box;
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand {
    font-size: 1rem;
    color: var(--text-primary);
  }

  nav {
    display: grid;
    gap: var(--space-2);
    padding-bottom: var(--space-1);
  }

  .group {
    display: grid;
    gap: var(--space-1);
  }

  .group > ul {
    margin-top: var(--space-1);
  }

  h2 {
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--space-1);
  }

  li a {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    border-left: 3px solid transparent;
    border-right: 1px solid var(--border);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--control-padding);
    background: var(--surface);
    color: var(--text-primary);
    font-size: 14px;
    transition: border-color 120ms ease, background-color 120ms ease, color 120ms ease, transform 120ms ease;
  }

  li a.active {
    border-left-color: var(--accent);
    border-right-color: var(--border);
    border-top-color: var(--border);
    border-bottom-color: var(--border);
    color: var(--accent);
    background: var(--surface-subtle);
  }

  li a.selected {
    background: var(--surface-hover);
    border-right-color: var(--border-strong);
  }

  li a:hover,
  li a:focus-visible {
    border-left-color: var(--accent);
    background: var(--surface-hover);
    border-right-color: var(--border-strong);
    transform: translateX(1px);
    outline: none;
  }

  .empty {
    color: var(--text-muted);
    font-size: 12px;
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    width: 100%;
    padding: var(--space-1) 0;
    background: none;
    border: none;
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition: color 120ms ease;
    list-style: none;
  }

  .category-header::-webkit-details-marker {
    display: none;
  }

  .category-header:hover,
  .category-header:focus-visible {
    color: var(--accent);
    outline: none;
  }

  .category-header h2 {
    margin: 0;
    flex: 1;
  }

  .chevron {
    display: inline-flex;
    font-size: 10px;
    color: var(--text-muted);
    transition: color 120ms ease, transform 120ms ease;
    transform: translateY(-1px);
  }

  .group[open] .chevron {
    transform: rotate(90deg);
  }

  .category-header:hover .chevron {
    color: var(--accent);
  }

  .count {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: normal;
    text-transform: none;
    letter-spacing: normal;
  }

  .sidebar-footer {
    margin-top: auto;
    padding-top: var(--space-2);
    border-top: 1px solid var(--border);
  }

  .github-link {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: 13px;
    color: var(--text-muted);
    border-bottom: 1px solid transparent;
    transition: color 120ms ease;
  }

  .github-link:hover,
  .github-link:focus-visible {
    color: var(--accent);
    border-bottom-color: var(--accent);
    outline: none;
  }

  aside.collapsed {
    width: 70px;
    min-width: 70px;
    padding: var(--space-2) var(--space-1);
  }

  aside.collapsed .sidebar-footer {
    display: none;
  }

  @media (max-width: 900px) {
    aside {
      position: fixed;
      z-index: 15;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      min-width: 100%;
      max-height: 78dvh;
      border-right: 0;
      border-top: 1px solid var(--border);
      transform: translateY(105%);
      transition: transform 160ms ease-out;
      border-top-left-radius: var(--radius);
      border-top-right-radius: var(--radius);
    }

    aside.mobile-open {
      transform: translateY(0%);
    }

    aside.collapsed {
      width: 100%;
      min-width: 100%;
      padding: var(--space-2);
    }
  }
</style>
