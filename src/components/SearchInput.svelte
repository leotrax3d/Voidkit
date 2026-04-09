<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let value = '';
  export let id = 'search-tools';
  export let label = 'Search tools';
  export let placeholder = 'Search tools...';

  const dispatch = createEventDispatcher<{ keydown: KeyboardEvent }>();
</script>

<div class="search-input">
  <label class="label" for={id}>{label}</label>
  <div class="search-control">
    <input
      id={id}
      type="search"
      bind:value
      placeholder={placeholder}
      autocomplete="off"
      spellcheck="false"
      on:keydown={(event) => dispatch('keydown', event)}
    />
  </div>
</div>

<style>
  .search-input {
    display: grid;
    gap: var(--space-1);
  }

  .label {
    color: var(--text-muted);
    font-size: 13px;
  }

  .search-control {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-subtle);
    transition: border-color 120ms ease, background-color 120ms ease;
  }

  .search-control:hover {
    background: var(--surface-hover);
  }

  .search-control:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(163, 230, 53, 0.18);
    background: var(--surface);
  }

  input {
    width: 100%;
    border: 0;
    border-radius: inherit;
    background: transparent;
    box-shadow: none;
    -webkit-appearance: none;
    appearance: none;
  }

  input:focus-visible {
    border-color: transparent;
    box-shadow: none;
  }

  input::-webkit-search-decoration,
  input::-webkit-search-cancel-button,
  input::-webkit-search-results-button,
  input::-webkit-search-results-decoration {
    -webkit-appearance: none;
    appearance: none;
  }

  input::placeholder {
    color: var(--text-muted);
  }
</style>
