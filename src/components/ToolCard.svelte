<script lang="ts">
  import { addRecentTool } from '$lib/utils/recent';
  import type { Tool } from '$lib/types';

  export let tool: Tool;

  function handleCardClick(): void {
    addRecentTool(tool.slug);
  }
</script>

<a class="card" href={`/tools/${tool.slug}`} aria-label={`Open ${tool.name}`} on:click={handleCardClick}>
  <div class="card-inner">
    <p class="category">{tool.category}</p>
    <div class="header-row">
      <svelte:component this={tool.icon} aria-hidden="true" size={18} />
      <h3>{tool.name}</h3>
    </div>
    <p class="description">{tool.description}</p>
  </div>
</a>

<style>
  .card {
    display: grid;
    min-height: 216px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-2);
    text-decoration: none;
    color: inherit;
    transition: border-color 150ms ease, background-color 150ms ease;
  }

  .card:hover,
  .card:focus-visible {
    border-color: var(--accent);
    background: var(--surface-hover);
    outline: none;
  }

  .card-inner {
    display: grid;
    gap: var(--space-1);
    grid-template-rows: auto auto 1fr;
  }

  .category {
    font-size: 12px;
    color: var(--text-muted);
    margin: 0;
  }

  .header-row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  h3 {
    font-size: 16px;
    color: var(--text-primary);
    margin: 0;
  }

  .description {
    font-size: 14px;
    color: var(--text-muted);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
</style>
