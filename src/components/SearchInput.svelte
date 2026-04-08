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

<style>
  .search-input {
    display: grid;
    gap: var(--space-1);
  }

  .label {
    color: var(--text-muted);
    font-size: 12px;
  }

  input {
    width: 100%;
    background: var(--surface);
  }

  input::placeholder {
    color: var(--text-muted);
  }
</style>
