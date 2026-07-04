# Technology Stack

**Analysis Date:** 2026-07-04

## Languages

**Primary:**
- Markdown - All documentation content in `docs/*.md` (17 documents)
- TypeScript - VitePress configuration at `docs/.vitepress/config.mts`
- CSS - Custom theme styling at `docs/.vitepress/theme/custom.css`

**Secondary:**
- HTML - Static output generated to `docs/.vitepress/dist/`
- JavaScript - Vite cache bundles in `docs/.vitepress/cache/deps/`

## Runtime

**Environment:**
- Node.js (required by `vitepress` CLI and `vite` dev server)
- Package Manager: npm
- Lockfile: `package-lock.json` (present, version 3, 96072 bytes)

## Frameworks

**Core:**
- VitePress 1.6.4 - Static site generator for Markdown documentation. Serves as both dev server (`vitepress dev docs`) and build tool (`vitepress build docs`)
- Vue 3.5.38 - Underlying UI framework used by VitePress for theme rendering and component system
- Vite 5.4.21 - Build tool and dev server used by VitePress for HMR and production bundling

**Syntax Highlighting:**
- Shiki 2.5.0 - Code syntax highlighter with custom language aliases configured in `docs/.vitepress/config.mts`
  - Language aliases: `logql` -> `sql`, `logsql` -> `sql`, `alloy` -> `yaml`

**Search:**
- MiniSearch 7.2.0 - Local full-text search client, configured via VitePress `themeConfig.search.provider: 'local'`

**Sidebar Generation:**
- vitepress-sidebar 1.36.1 - Auto-generates sidebar from file tree at `docs/.vitepress/config.mts`. Custom post-processing to flatten root groups and strip `/docs` prefix from links.

**Testing:**
- Not detected

## Key Dependencies

**Direct (devDependencies):**
- `vitepress` ^1.6.4 - The site generator itself
- `vitepress-sidebar` ^1.36.1 - Auto-sidebar generation

**Critical Transitive Dependencies:**
- `vue` 3.5.38 - Declarative UI rendering
- `vite` 5.4.21 - Dev server and bundler
- `shiki` 2.5.0 - Syntax highlighting engine
- `minisearch` 7.2.0 - Client-side full-text search
- `@docsearch/css` 3.8.2 / `@docsearch/js` 3.8.2 - Search UI (used as foundation for local search)
- `@vueuse/core` 12.8.2 - Vue composition utilities
- `@iconify-json/simple-icons` 1.2.86 - Icon set (used for GitHub social link in config)
- `focus-trap` 7.8.0 - Keyboard focus trapping for modals
- `mark.js` 8.11.1 - Text highlight for search results
- `@shikijs/core` 2.5.0 / `@shikijs/transformers` 2.5.0 - Shiki core and transform pipeline
- `postcss` 8.5.15 - CSS processing pipeline
- `esbuild` 0.21.5 - Bundler used by Vite
- `rollup` 4.62.2 - Module bundler used by Vite

## Configuration

**Environment:**
- No `.env` files detected. Environment is purely local Node.js/npm.
- All configuration is in source-controlled files.

**Site Configuration:**
- `docs/.vitepress/config.mts` - Main VitePress configuration (title, description, theme, sidebar, search, markdown plugins)

**Theme Configuration:**
- `docs/.vitepress/theme/index.ts` - Theme entry point, imports `custom.css`
- `docs/.vitepress/theme/custom.css` - Custom CSS overrides (brand color to indigo #6366f1, Chinese font stack, home page styling)

**Build Output:**
- `docs/.vitepress/dist/` - Static site output (SSG-generated HTML, JS, CSS assets)

**Build Configuration:**
- `chunkSizeWarningLimit: 1000` in Vite config (raised from default 500KB)
- TypeScript: `type: "module"` in `package.json`, config written as `.mts` (ESM TypeScript)

## Platform Requirements

**Development:**
- Node.js (any LTS version supporting modern ESM)
- npm (comes with Node.js)
- Run `npm install` to restore dependencies
- Run `npm run dev` for development server with HMR
- Run `npm run build` for production build

**Production:**
- Static hosting (any web server: GitHub Pages, Nginx, S3, etc.)
- No server-side runtime required — fully SSG (Static Site Generation)
- Deployment target: GitHub Pages via `gh-pages` branch
- Deploy via `bash deploy.sh` or `npm run deploy`

---

*Stack analysis: 2026-07-04*
