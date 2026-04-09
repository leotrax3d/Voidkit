<script lang="ts">
  import ToolCard from '../components/ToolCard.svelte';
  import { getGroupedTools, tools, stats } from '$lib/tools';

  $: groupedTools = getGroupedTools(tools);
</script>

<section class="landing">
  <header class="page-header">
    <div class="hero">
      <h1>Voidkit</h1>
      <p class="tagline">Minimal developer utilities, organized and extensible by design.</p>
      <p class="stats">{stats.tools} tools &middot; {stats.categories} categories</p>
    </div>
  </header>

  {#each groupedTools as group}
    <section class="category-block" aria-label={group.category}>
      <h2>{group.category} <span class="count">({group.tools.length})</span></h2>
      <div class="grid">
        {#each group.tools as tool}
          <ToolCard {tool} />
        {/each}
      </div>
    </section>
  {/each}
</section>

<style>
  .landing {
    display: grid;
    gap: var(--space-3);
  }

  .page-header {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }

  .hero {
    display: grid;
    gap: var(--space-1);
  }

  h1 {
    font-size: 32px;
    color: var(--text-primary);
    margin: 0;
  }

  .tagline {
    font-size: 16px;
    color: var(--text-muted);
    margin: 0;
  }

  .stats {
    font-size: 14px;
    color: var(--accent);
    margin: 0;
    font-weight: 500;
  }

  .category-block {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--text-muted);
    margin: 0;
  }

  .count {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: normal;
    text-transform: none;
    letter-spacing: normal;
  }

  .grid {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 980px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .category-block {
      padding: var(--space-2);
    }

    .grid {
      grid-template-columns: 1fr;
    }

    h1 {
      font-size: 24px;
    }

    .tagline {
      font-size: 14px;
    }
  }
</style>
