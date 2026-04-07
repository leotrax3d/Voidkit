<script lang="ts">
  import type { Tool } from '$lib/types';

  export let tool: Tool;
</script>

<article class="card">
  <p class="category">{tool.category}</p>
  <div class="header-row">
    <svelte:component this={tool.icon} aria-hidden="true" size={17} />
    <h3>{tool.name}</h3>
  </div>
  <p class="description">{tool.description}</p>
  <a class="card-link" href={`/tools/${tool.slug}`} aria-label={`Open ${tool.name}`}>
    Open
  </a>
</article>

<style>
  .card {
    display: grid;
    gap: var(--space-1);
    grid-template-rows: auto auto 1fr auto;
    min-height: 224px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-2);
  }

  .category {
    font-size: 12px;
    color: var(--text-muted);
  }

  .header-row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  h3 {
    font-size: 16px;
    color: var(--text-primary);
  }

  .description {
    font-size: 14px;
    color: var(--text-muted);
  }

  .card-link {
    width: fit-content;
    font-size: 14px;
    color: var(--accent);
    border-color: var(--accent);
  }

  .card-link:hover,
  .card-link:focus-visible {
    background: #1f1f1f;
  }
</style>
