<script lang="ts">
  import { page } from '$app/stores';
</script>

<section class="error-page">
  <div class="error-content">
    <h1 class="error-code">404</h1>
    <h2 class="error-title">Tool not found</h2>
    <p class="error-description">This tool doesn't exist yet. Try searching for another tool or explore our collection.</p>
    <a class="back-link" href="/">← Back to all tools</a>
  </div>
</section>

<style>
  .error-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    padding: var(--space-3);
    background: var(--bg);
  }

  .error-content {
    display: grid;
    gap: var(--space-2);
    text-align: center;
    max-width: 500px;
  }

  .error-code {
    font-size: 72px;
    color: var(--accent);
    margin: 0;
    font-weight: 700;
  }

  .error-title {
    font-size: 28px;
    color: var(--text-primary);
    margin: 0;
  }

  .error-description {
    font-size: 16px;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.6;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin-top: var(--space-1);
    color: var(--accent);
    border-bottom: 1px solid transparent;
    transition: border-color 150ms ease;
  }

  .back-link:hover,
  .back-link:focus-visible {
    border-bottom-color: var(--accent);
    outline: none;
  }
</style>
