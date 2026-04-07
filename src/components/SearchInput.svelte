<script lang="ts">
  export let value = '';
  export let id = 'search-tools';
  export let label = 'Search tools';
  export let placeholder = 'Search tools...';
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
