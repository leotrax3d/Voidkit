<script lang="ts">
  export let open = false;

  function handleBackdropClick(): void {
    open = false;
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      open = false;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div class="modal-overlay" on:click={handleBackdropClick} on:keydown={handleKeydown} role="dialog" aria-modal="true" aria-labelledby="help-title" tabindex="-1">
    <div class="modal-content" on:click|stopPropagation={() => {}} role="presentation">
      <h2 id="help-title" class="modal-title">Keyboard Shortcuts</h2>
      
      <table class="shortcuts-table">
        <thead>
          <tr>
            <th>Shortcut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="key">/</td>
            <td>Focus search</td>
          </tr>
          <tr>
            <td class="key">Esc</td>
            <td>Clear search & close help</td>
          </tr>
          <tr>
            <td class="key">?</td>
            <td>Open this help menu</td>
          </tr>
        </tbody>
      </table>

      <button class="close-button" on:click={() => (open = false)} aria-label="Close help menu">
        ✕
      </button>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal-content {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-3);
    max-width: 400px;
    width: 90%;
    position: relative;
  }

  .modal-title {
    margin: 0 0 var(--space-2) 0;
    font-size: 18px;
    color: var(--text-primary);
  }

  .shortcuts-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    margin-bottom: var(--space-2);
  }

  thead {
    border-bottom: 1px solid var(--border);
  }

  th {
    text-align: left;
    padding: var(--space-1) 0;
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  td {
    padding: var(--space-1) var(--space-1) var(--space-1) 0;
    color: var(--text-primary);
  }

  td.key {
    font-family: JetBrains Mono, monospace;
    color: var(--accent);
    font-weight: 600;
  }

  .close-button {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 150ms ease;
  }

  .close-button:hover,
  .close-button:focus-visible {
    color: var(--text-primary);
    outline: none;
  }
</style>
