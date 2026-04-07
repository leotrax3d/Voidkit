<script lang="ts">
  import SearchInput from './SearchInput.svelte';
  import { getGroupedTools } from '$lib/tools';
  import type { CategoryGroup, Tool } from '$lib/types';

  export let tools: Tool[] = [];
  export let activePath = '/';
  export let collapsed = false;
  export let mobileOpen = false;

  let query = '';

  $: normalizedQuery = query.trim().toLowerCase();
  $: filteredTools = normalizedQuery
    ? tools.filter((tool) => {
        const haystack = `${tool.name} ${tool.description} ${tool.category} ${tool.slug}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : tools;

  $: groupedTools = getGroupedTools(filteredTools) as CategoryGroup[];

  function isActiveTool(slug: string): boolean {
    return activePath === `/tools/${slug}`;
  }
</script>

<aside class:collapsed class:mobile-open={mobileOpen} aria-label="Tools navigation">
  <div class="top-row">
    <a class="brand" href="/" aria-label="Voidkit home">Voidkit</a>
  </div>

  {#if !collapsed}
    <SearchInput bind:value={query} />

    <nav aria-label="Tool categories">
      {#if groupedTools.length === 0}
        <p class="empty">No tools found.</p>
      {:else}
        {#each groupedTools as group}
          <section class="group" aria-label={group.category}>
            <h2>{group.category}</h2>
            <ul>
              {#each group.tools as tool}
                <li>
                  <a class:active={isActiveTool(tool.slug)} href={`/tools/${tool.slug}`}>
                    <svelte:component this={tool.icon} aria-hidden="true" size={15} />
                    <span>{tool.name}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      {/if}
    </nav>
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
  }

  .group {
    display: grid;
    gap: var(--space-1);
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
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px 12px;
    background: var(--surface);
    color: var(--text-primary);
    font-size: 14px;
  }

  li a.active {
    border-color: var(--accent);
    color: var(--accent);
  }

  li a:hover,
  li a:focus-visible {
    border-color: var(--accent);
    outline: none;
  }

  .empty {
    color: var(--text-muted);
    font-size: 12px;
  }

  aside.collapsed {
    width: 70px;
    min-width: 70px;
    padding: var(--space-2) var(--space-1);
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
