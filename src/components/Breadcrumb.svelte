<script lang="ts">
  import { getToolBySlug } from '$lib/tools';

  export let slug: string;

  $: tool = getToolBySlug(slug);
  $: category = tool?.category || 'Unknown';
</script>

<nav class="breadcrumb" aria-label="Breadcrumb navigation">
  <ol>
    <li>
      <a href="/">Voidkit</a>
    </li>
    <li class="separator">/</li>
    <li>
      <span>{category}</span>
    </li>
    <li class="separator">/</li>
    <li>
      <span class="current">{tool?.name || 'Tool'}</span>
    </li>
  </ol>
</nav>

<style>
  .breadcrumb {
    margin-bottom: var(--space-3);
  }

  ol {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  li {
    display: flex;
    align-items: center;
  }

  a {
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 150ms ease;
  }

  a:hover,
  a:focus-visible {
    border-bottom-color: var(--accent);
    outline: none;
  }

  .separator {
    margin: 0 var(--space-half);
  }

  .current {
    color: var(--text-primary);
    font-weight: 500;
  }
</style>
