# Voidkit

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-ff3e00?logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7.x-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ed?logo=docker&logoColor=white)](docker-compose.yml)
[![GitHub stars](https://img.shields.io/github/stars/leotrax3d/voidkit?style=flat)](https://github.com/leotrax3d/voidkit/stargazers)
[![Last commit](https://img.shields.io/github/last-commit/leotrax3d/voidkit?style=flat)](https://github.com/leotrax3d/voidkit/commits/main)
[![Open issues](https://img.shields.io/github/issues/leotrax3d/voidkit?style=flat)](https://github.com/leotrax3d/voidkit/issues)

Minimal developer utilities toolkit. A fast, accessible, and extensible collection of tools for developers, built with modern web technologies.
<img width="1901" height="1028" alt="image" src="https://github.com/user-attachments/assets/4303ead5-3218-4367-9afe-26920fab0289" />

## Tech Stack

- **Framework**: [SvelteKit 2.0](https://kit.svelte.dev) + [Svelte 5](https://svelte.dev)
- **Language**: [TypeScript 5.x](https://www.typescriptlang.org) (strict mode)
- **Build**: [Vite 7.3.2](https://vitejs.dev)
- **Icons**: [lucide-svelte 0.470.0](https://lucide.dev)
- **Utilities**: [marked 18.0.0](https://marked.js.org), [dompurify 3.3.3](https://cure53.de/purify), [qrcode 1.5.4](https://davidsharp.com/qrcode/)

## Features

-  **Fast & Minimal** — Zero external UI libraries, optimized CSS, prerendered all routes
-  **Dark Theme** — Professional dark mode with lime accent (#a3e635)
-  **Keyboard Native** — Global shortcuts (/, ?, Esc), keyboard navigation, full a11y support
-  **Client-Side Only** — All tools run entirely in the browser (no server-side processing)
-  **Persistent State** — Tool history and preferences saved to localStorage
-  **Command Palette** — Live search with match highlighting and recent tool tracking
-  **Responsive** — Works seamlessly on desktop, tablet, and mobile

## Getting Started

### Installation

```bash
git clone https://github.com/leotrax3d/voidkit.git
cd voidkit
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
npm run preview  # Preview production build locally
```

### Lint & Check

```bash
npm run check   # TypeScript + Svelte diagnostics
npm run lint    # Static analysis
```

## Self-Hosting with Docker

**Option A - Docker Compose (recommended)**

```bash
curl -O https://raw.githubusercontent.com/leotrax3d/voidkit/main/docker-compose.yml
docker compose up -d
```

Then open http://localhost:3000

**Option B - Single Docker command**

```bash
docker run -p 3000:3000 ghcr.io/leotrax3d/voidkit:latest
```

**Option C - Build locally**

```bash
git clone https://github.com/leotrax3d/voidkit
cd voidkit
docker compose up -d --build
```

**Requirements:** Docker + Docker Compose (included in Docker Desktop)

## How to Add a Tool

Adding a new tool requires 3 simple steps:

### 1. Create the Tool Component

Create a new file in `src/components/tools/` named `YourToolName.svelte`:

```svelte
<script lang="ts">
  import { copy } from '$lib/actions/copy';
  import type { Tool } from '$lib/types';

  export let tool: Tool;

  let inputValue = '';
  let output = '';

  function calculate(): void {
    output = inputValue.toUpperCase(); // Your logic here
  }
</script>

<article class="tool">
  <h1>{tool.name}</h1>
  <p>{tool.description}</p>

  <input bind:value={inputValue} placeholder="Enter input..." />
  <button on:click={calculate}>Process</button>

  {#if output}
    <output>
      {output}
      <button use:copy={output}>Copy</button>
    </output>
  {/if}
</article>

<style>
  .tool {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }

  h1, p {
    margin: 0;
  }

  input, button {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text-primary);
  }

  input:focus-visible, button:focus-visible {
    border-color: var(--accent);
    outline: none;
  }

  output {
    padding: var(--space-2);
    background: #1f1f1f;
    border-radius: var(--radius);
    font-size: 13px;
    color: var(--text-muted);
    word-break: break-all;
  }
</style>
```

### 2. Register in Tools Registry

Add an entry to `src/lib/tools.ts`:

```typescript
import { YourToolNameIcon } from 'lucide-svelte';
import YourToolName from '../components/tools/YourToolName.svelte';

// Add to tools array:
{
  id: 'your-tool-slug',
  name: 'Your Tool Name',
  description: 'Brief description of what the tool does.',
  category: 'Category Name',
  icon: YourToolNameIcon,
  slug: 'your-tool-slug'
},

// Add to toolComponents mapping (in +page.svelte):
'your-tool-slug': YourToolName,
```

### 3. Create Route (Optional, for SEO)

Create/update `src/routes/tools/[slug]/+page.ts` if custom metadata is needed:

```typescript
import { getToolBySlug } from '$lib/tools';
import type { PageLoad } from './$types';

export const prerender = true;

export const entries = () => {
  return tools.map((tool) => ({ slug: tool.slug }));
};

export const load: PageLoad = async ({ params }) => {
  const tool = getToolBySlug(params.slug);
  if (!tool) throw new Error(`Tool not found: ${params.slug}`);

  return {
    tool,
    title: tool.name,
    description: tool.description
  };
};
```

The tool will automatically be prerendered and accessible at `/tools/your-tool-slug`.

## Tool Categories & List

| Category | Tools | Count |
|----------|-------|-------|
| Random & Decision | Random Number, Dice Roller, Coin Flip, List Randomizer, Group Splitter | 5 |
| Security & Encoding | Password Generator, Hash Generator, UUID Generator, Base64, QR Code | 5 |
| Text & Data | Character Counter, Text Diff, JSON Formatter, Lorem Ipsum, Markdown Preview | 5 |
| Calculators & Converters | Unit Converter, Timestamp Converter, Base Converter, Percentage Calculator | 4 |
| Design & Color | Color Picker, Contrast Checker, Gradient Generator, Shadow Generator | 4 |
| **Total** | **23 Tools** | **23** |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search input |
| `?` | Open help modal |
| `Esc` | Clear search & close help |
| `↑ / ↓` | Navigate search results (in sidebar) |
| `Enter` | Open selected tool |

## Project Structure

```
src/
├── routes/
│   ├── +layout.svelte          # App shell (sidebar, keyboard handlers)
│   ├── +page.svelte            # Landing page (hero, categories)
│   ├── +page.ts                # Landing metadata
│   ├── +error.svelte           # 404 error page
│   └── tools/[slug]/
│       ├── +page.svelte        # Dynamic tool view (breadcrumb, component router)
│       └── +page.ts            # Tool metadata + prerender config
├── components/
│   ├── Sidebar.svelte          # Navigation sidebar (search, categories, recent)
│   ├── SearchInput.svelte      # Search input component
│   ├── ToolCard.svelte         # Tool card (landing page grid)
│   ├── Breadcrumb.svelte       # Navigation breadcrumbs (tool pages)
│   ├── ShortcutHelpModal.svelte # Keyboard shortcuts help overlay
│   └── tools/                  # 23 individual tool implementations
├── lib/
│   ├── tools.ts                # Central tool registry (metadata + component mapping)
│   ├── types.ts                # TypeScript interfaces (Tool, CategoryGroup, etc.)
│   ├── actions/
│   │   └── copy.ts             # Reusable copy-to-clipboard action
│   └── utils/
│       ├── color.ts            # Color conversion utilities (HEX ↔ RGB ↔ HSL ↔ HSB ↔ CMYK)
│       └── recent.ts           # Recent tools tracking (localStorage)
├── app.css                     # Design tokens + global styles
├── app.html                    # HTML shell
└── app.d.ts                    # TypeScript declarations
```

## Design System

### Colors

```css
--bg:              #0d0d0d  /* Main background */
--surface:         #161616  /* Surface/card background */
--border:          #242424  /* Border color */
--accent:          #a3e635  /* Lime green accent */
--text-primary:    #f0f0f0  /* Primary text */
--text-muted:      #666     /* Muted/secondary text */
```

### Spacing

```css
--space-1: 8px
--space-2: 16px
--space-3: 24px
--space-4: 32px
```

### Typography

- **Font**: JetBrains Mono (monospace)
- **Heading**: Larger sizes, bold weight
- **Body**: 14px base size
- **Muted**: --text-muted color

### Components

- **Borders Only** — No shadows, 1px solid borders
- **Rounded Corners** — 6px border-radius
- **Transitions** — 120-150ms ease timing
- **Interactive** — Hover/focus states with accent color

## Code Standards

-  TypeScript strict mode throughout
-  No inline styles (CSS custom properties + classes only)
-  No external UI libraries
-  Full keyboard accessibility
-  Shared utility functions (color.ts, copy action, recent tracking)
-  localStorage keys prefixed with `voidkit_`
-  All tool routes prerendered
-  No unused imports, no console.logs

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Modern mobile browsers

## Performance

- **Client Bundle**: ~150KB gzip
- **Server Bundle**: ~127KB
- **All Routes Prerendered** ✓
- **Zero JS Waterfall** — Instant interaction
- **localStorage Persistence** — No network calls

## License

MIT

---

**Questions or suggestions?** Open an issue on [GitHub](https://github.com/leotrax3d/voidkit/issues) or submit a pull request!
