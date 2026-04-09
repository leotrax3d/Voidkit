<script lang="ts">
  import '../app.css';

  import Sidebar from '../components/Sidebar.svelte';
  import ShortcutHelpModal from '../components/ShortcutHelpModal.svelte';
  import { tools } from '$lib/tools';
  import { page } from '$app/stores';

  let sidebarCollapsed = false;
  let mobileMenuOpen = false;
  let showHelp = false;

  $: currentPath = $page.url.pathname;

  function toggleSidebarCollapse(): void {
    sidebarCollapsed = !sidebarCollapsed;
  }

  function toggleMobileMenu(): void {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu(): void {
    mobileMenuOpen = false;
  }

  function focusSearchInput(): void {
    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.focus();
    }
  }

  function handleKeydown(e: KeyboardEvent): void {
    const isMeta = e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;

    if (e.key === '/' && !isMeta) {
      e.preventDefault();
      focusSearchInput();
    } else if (e.key === 'Escape') {
      showHelp = false;
      closeMobileMenu();
      focusSearchInput();
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement | null;
      if (searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.blur();
      }
    } else if (e.key === '?') {
      e.preventDefault();
      showHelp = !showHelp;
    }
  }
</script>

<svelte:head>
  <title>{$page.data.title || 'Voidkit'}</title>
  <meta name="description" content={$page.data.description || 'Minimal developer utilities'} />
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="app-shell">
  <Sidebar
    {tools}
    activePath={currentPath}
    collapsed={sidebarCollapsed}
    mobileOpen={mobileMenuOpen}
    onToolNavigate={closeMobileMenu}
  />

  <div class="content-shell">
    <header>
      <button
        class="hamburger"
        type="button"
        aria-label="Toggle tool navigation"
        aria-expanded={mobileMenuOpen}
        on:click={toggleMobileMenu}
      >
        Menu
      </button>

      <button
        class="collapse"
        type="button"
        aria-label="Collapse sidebar"
        aria-pressed={sidebarCollapsed}
        on:click={toggleSidebarCollapse}
      >
        {sidebarCollapsed ? 'Expand' : 'Collapse'}
      </button>
    </header>

    <main>
      <slot />
    </main>
  </div>
</div>

{#if mobileMenuOpen}
  <button
    class="backdrop"
    aria-label="Close navigation overlay"
    type="button"
    on:click={closeMobileMenu}
  ></button>
{/if}

<ShortcutHelpModal bind:open={showHelp} />

<style>
  .app-shell {
    display: flex;
    min-height: 100dvh;
    background: var(--bg);
  }

  .content-shell {
    flex: 1;
    display: grid;
    grid-template-rows: auto 1fr;
    min-width: 0;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  main {
    padding: var(--space-3);
  }

  .hamburger,
  .collapse {
    font-size: 14px;
  }

  .hamburger {
    display: none;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 12;
    border: 0;
    border-radius: 0;
    background: var(--overlay-dark);
  }

  @media (max-width: 900px) {
    .hamburger {
      display: inline-flex;
    }

    .collapse {
      display: none;
    }

    header {
      padding: var(--space-1) var(--space-2);
    }

    main {
      padding: var(--space-2);
    }
  }
</style>
