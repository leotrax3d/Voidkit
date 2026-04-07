<script lang="ts">
  import ToolCard from '../components/ToolCard.svelte';
  import { getGroupedTools, tools } from '$lib/tools';

  $: groupedTools = getGroupedTools(tools);
</script>

<section class="landing">
  <header class="page-header">
    <h1>Voidkit</h1>
    <p>Minimal developer utilities, organized and extensible by design.</p>
  </header>

  {#each groupedTools as group}
    <section class="category-block" aria-label={group.category}>
      <h2>{group.category}</h2>
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
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }

  h1 {
    font-size: 28px;
  }

  .page-header p {
    font-size: 14px;
    color: var(--text-muted);
  }

  .category-block {
    display: grid;
    gap: var(--space-2);
  }

  h2 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--text-muted);
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
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
