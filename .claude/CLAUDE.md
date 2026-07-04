<!-- GSD:project-start source:PROJECT.md -->

## Project

**Ziogn Notes — Tag 搜索**

个人技术文档 VitePress 知识库，以中文 Markdown 文档为主，涵盖 DevOps、Flutter、Java、AI 模型评测、GSD 使用教程等主题。每篇文档的 YAML frontmatter 中维护了 `tags` 标签字段，目标是让这些标签成为可搜索的导航维度，帮助用户更快找到相关文档。

**Core Value:** 用户可以通过标签快速定位相关文档，尤其是当文档量增长后，标签搜索成为比全文搜索更精准的发现方式。

### Constraints

- **搜索体验**: 必须保持 VitePress 原生搜索弹窗的交互风格，`tag:` 前缀的搜索行为应在同一个搜索框内完成
- **文档格式**: 不能破坏现有 frontmatter 格式，标签继续由 `tags` 数组字段维护
- **构建流程**: 不能增加复杂的外部依赖，维持静态站点特性

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- Markdown - All documentation content in `docs/*.md` (17 documents)
- TypeScript - VitePress configuration at `docs/.vitepress/config.mts`
- CSS - Custom theme styling at `docs/.vitepress/theme/custom.css`
- HTML - Static output generated to `docs/.vitepress/dist/`
- JavaScript - Vite cache bundles in `docs/.vitepress/cache/deps/`

## Runtime

- Node.js (required by `vitepress` CLI and `vite` dev server)
- Package Manager: npm
- Lockfile: `package-lock.json` (present, version 3, 96072 bytes)

## Frameworks

- VitePress 1.6.4 - Static site generator for Markdown documentation. Serves as both dev server (`vitepress dev docs`) and build tool (`vitepress build docs`)
- Vue 3.5.38 - Underlying UI framework used by VitePress for theme rendering and component system
- Vite 5.4.21 - Build tool and dev server used by VitePress for HMR and production bundling
- Shiki 2.5.0 - Code syntax highlighter with custom language aliases configured in `docs/.vitepress/config.mts`
- MiniSearch 7.2.0 - Local full-text search client, configured via VitePress `themeConfig.search.provider: 'local'`
- vitepress-sidebar 1.36.1 - Auto-generates sidebar from file tree at `docs/.vitepress/config.mts`. Custom post-processing to flatten root groups and strip `/docs` prefix from links.
- Not detected

## Key Dependencies

- `vitepress` ^1.6.4 - The site generator itself
- `vitepress-sidebar` ^1.36.1 - Auto-sidebar generation
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

- No `.env` files detected. Environment is purely local Node.js/npm.
- All configuration is in source-controlled files.
- `docs/.vitepress/config.mts` - Main VitePress configuration (title, description, theme, sidebar, search, markdown plugins)
- `docs/.vitepress/theme/index.ts` - Theme entry point, imports `custom.css`
- `docs/.vitepress/theme/custom.css` - Custom CSS overrides (brand color to indigo #6366f1, Chinese font stack, home page styling)
- `docs/.vitepress/dist/` - Static site output (SSG-generated HTML, JS, CSS assets)
- `chunkSizeWarningLimit: 1000` in Vite config (raised from default 500KB)
- TypeScript: `type: "module"` in `package.json`, config written as `.mts` (ESM TypeScript)

## Platform Requirements

- Node.js (any LTS version supporting modern ESM)
- npm (comes with Node.js)
- Run `npm install` to restore dependencies
- Run `npm run dev` for development server with HMR
- Run `npm run build` for production build
- Static hosting (any web server: GitHub Pages, Nginx, S3, etc.)
- No server-side runtime required — fully SSG (Static Site Generation)
- Deployment target: GitHub Pages via `gh-pages` branch
- Deploy via `bash deploy.sh` or `npm run deploy`

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Markdown documentation uses Chinese characters with spaces in filenames (e.g., `GSD-gsd-tools使用教程.md`, `docker-compose使用教程.md`, `nginx配置实战指南.md`)
- VitePress config uses `.mts` extension: `config.mts`
- Theme files: `index.ts`, `custom.css`
- Shell scripts: `deploy.sh`
- Package manifest: `package.json`, `package-lock.json`
- Gitignore: `.gitignore`
- Config file functions use camelCase: `fixLinkSpaces`, `flattenRootGroup`, `stripDocsPrefix` (in `docs/.vitepress/config.mts`)
- camelCase for TypeScript variables: `rawSidebar`, `fixed`, `DIST`, `TMP`, `PAGES_DIR`, `REMOTE`
- Single-letter parameters in callbacks: `md`, `_m`, `url`, `items`, `item`
- Minimal type annotations: `md: any`, `state: any`, `items: any[]`, `_m: string`, `url: string` (in `docs/.vitepress/config.mts`)
- `title`: Document title (string, may be quoted if contains special characters)
- `created`: Creation timestamp (`YYYY-MM-DD HH:mm` format)
- `updated`: Last update timestamp (`YYYY-MM-DD HH:mm` format)
- `version`: Semantic version string (`MAJOR.MINOR.PATCH`)
- `author`: Author name (`ziogn`)
- `source`: URL string or array of URLs
- `tags`: Array of lowercase, hyphen-separated tags (e.g., `[nginx, devops, 运维]`)
- `aliases`: Array of alias strings for cross-referencing
- `description`: Single-line summary string
- `layout`: Page layout type (used only in `docs/index.md`: `home`)

## Code Style

- No formatter configured (no `.prettierrc`, `biome.json`, or `.editorconfig` detected)
- TypeScript/JavaScript: No linting configuration (no `.eslintrc*`, `eslint.config.*` detected)
- No linter configured for TypeScript or Markdown content
- No TypeScript `tsconfig.json` detected (project relies on VitePress defaults)

## Import Organization

- Not detected (no path aliases configured)

## Error Handling

- Minimal error handling in the codebase (documentation site with no application logic)
- Shell script uses `set -e` for fail-fast behavior and explicit directory existence check (`docs/.vitepress/config.mts`)
- No try/catch blocks in TypeScript/JavaScript code
- VitePress config sets `ignoreDeadLinks: true` to suppress broken link warnings

## Logging

- Shell deploy script (`deploy.sh`) uses `echo` with informative prefixes: `=== 1/3 ... ===`, Unicode symbols (`✓`, `✗`)
- No logging in TypeScript config code
- VitePress itself handles build-time logging

## Comments

- Configuration logic includes multi-line comments explaining WHY a transformation is needed (see `docs/.vitepress/config.mts`)
- Comments are written in Chinese, matching the project's primary language
- Comments focus on explaining non-obvious workarounds or framework limitations
- Not used. Function comments are plain multi-line `//` or `/* */` blocks

## Function Design

- Small, focused utility functions with a single responsibility
- Config file defines three functions: `fixLinkSpaces` (12 lines), `flattenRootGroup` (6 lines), `stripDocsPrefix` (8 lines)
- Each function is ~5-12 lines of logic
- Functions accept the minimal required input (typically `md` instance or sidebar items array)
- No default parameters used
- `flattenRootGroup` and `stripDocsPrefix` return transformed arrays
- `fixLinkSpaces` is a void function (mutates markdown-it state)

## Module Design

- `docs/.vitepress/config.mts`: Uses `export default defineConfig({...})` pattern (ESM default export)
- `docs/.vitepress/theme/index.ts`: Uses `export default DefaultTheme` pattern
- Not used. Each module exports directly.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Content | All site content as Markdown documents | `docs/*.md` |
| VitePress Config | Site metadata, sidebar generation, markdown plugins, theme config | `docs/.vitepress/config.mts` |
| Custom Theme | Brand color overrides (indigo) and font stack configuration | `docs/.vitepress/theme/index.ts`, `docs/.vitepress/theme/custom.css` |
| Sidebar Generator | Auto-generate sidebar from filesystem via vitepress-sidebar | `docs/.vitepress/config.mts` (inline) |
| Deployment Script | Build and deploy to GitHub Pages gh-pages branch | `deploy.sh` |
| Package Config | NPM scripts, dependencies, project metadata | `package.json` |

## Pattern Overview

- All content files reside in a single directory (`docs/`) with no subdirectory grouping
- Sidebar is auto-generated from the filesystem by `vitepress-sidebar`, with post-processing to flatten root grouping and strip `/docs` prefix from URLs
- Theme extends VitePress DefaultTheme with CSS variable overrides only (no component customization)
- Deployment is manual via shell script (not CI/CD)
- Chinese-language UI (zh-CN locale for search, navigation labels, outline, doc footer)

## Layers

- Purpose: Store all site content as Markdown files with YAML frontmatter
- Location: `docs/`
- Contains: 15 Markdown documents + 1 index page (`index.md`)
- Depends on: Nothing
- Used by: VitePress build pipeline
- Purpose: Configure VitePress SSG behavior, theme, sidebar, and markdown processing
- Location: `docs/.vitepress/`
- Contains: `config.mts` (TypeScript config), `theme/index.ts` (theme entry), `theme/custom.css` (style overrides)
- Depends on: `vitepress`, `vitepress-sidebar` packages
- Used by: VitePress build process
- Purpose: Transform Markdown + config into static HTML/CSS/JS
- Location: `docs/.vitepress/dist/` (output)
- Contains: Static site assets, HTML pages, JS bundles, CSS, fonts
- Depends on: VitePress build pipeline
- Purpose: Publish built static site to GitHub Pages
- Location: `deploy.sh` (script)
- Contains: Build-and-push shell script targeting `gh-pages` branch on GitHub
- Depends on: npm build, git push

## Data Flow

### Build Pipeline Flow

### Deploy Flow

- No runtime state. Entirely static site generation. All state is in the filesystem (Markdown files on disk).

## Key Abstractions

- Purpose: Automatically derive navigation sidebar from filesystem layout, then normalize for VitePress URL conventions
- Files: `docs/.vitepress/config.mts` (inline functions `flattenRootGroup` and `stripDocsPrefix`)
- Pattern: Two-stage transform pipeline — raw generation via `vitepress-sidebar`, then normalization via custom post-processing
- Purpose: Fix VitePress markdown-it limitation where URLs with spaces in brackets `[text](url with spaces)` are not automatically wrapped in angle brackets `<url with spaces>`
- Files: `docs/.vitepress/config.mts` (inline `fixLinkSpaces` function)
- Pattern: Pre-processing rule injected before VitePress's block parsing
- Purpose: Extend VitePress DefaultTheme with zero custom components, only CSS variable overrides
- Files: `docs/.vitepress/theme/index.ts`, `docs/.vitepress/theme/custom.css`
- Pattern: Import DefaultTheme, re-export it unchanged, import `custom.css` for CSS variable overrides (brand colors indigo, Chinese-capable font stacks)

## Entry Points

- Location: `docs/index.md`
- Triggers: Site root URL `/`
- Responsibilities: Landing page with hero section (name, tagline, action button linking to /java程序员面试/) and a flat list of all documents organized under a single "其他" (Other) heading
- Location: `docs/.vitepress/config.mts`
- Triggers: `vitepress build docs` or `vitepress dev docs`
- Responsibilities: Define site metadata, theme, sidebar, search, markdown processing, and language/UI labels

## Architectural Constraints

- **Threading:** Not applicable. Static site generation is a build-time tool, single-threaded.
- **Global state:** None. No runtime state is maintained.
- **Circular imports:** Not applicable. No import graph exists between content files.
- **Flat content structure:** All `.md` files live in a single directory (`docs/`). No subdirectory-based categorization. This means sidebar grouping is not content-organization-driven; all items are peers.
- **Manual deployment:** There is no CI/CD pipeline. Deployment requires manual invocation of `bash deploy.sh`.

## Anti-Patterns

### URL Spaces in Markdown Links

### Flat Content Directory

## Error Handling

- `ignoreDeadLinks: true` in config suppresses dead-link warnings during build
- `chunkSizeWarningLimit: 1000` raises the default chunk size warning threshold from 500KB to 1000KB to suppress warnings for large documents (e.g., `GSD-gsd-tools使用教程.md` at 140KB, `java程序员面试.md` at 190KB)

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
