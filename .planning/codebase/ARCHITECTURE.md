<!-- refreshed: 2026-07-04 -->
# Architecture

**Analysis Date:** 2026-07-04

## System Overview

```text
┌──────────────────────────────────────────────────────────────┐
│                       VitePress SSG                           │
│              `docs/` (source) + `.vitepress/` (config)        │
├────────────────────────────┬─────────────────────────────────┤
│      Content (Markdown)    │      Theme & Configuration       │
│      `docs/*.md`           │      `docs/.vitepress/`          │
└────────────┬───────────────┴──────────┬──────────────────────┘
             │                          │
             ▼                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    Build Pipeline (SSG)                        │
│         VitePress build → static HTML/CSS/JS assets           │
│         `docs/.vitepress/dist/`                                │
└──────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│                   Deployment Target                            │
│         GitHub Pages (`gh-pages` branch)                       │
│         Triggered via `bash deploy.sh`                         │
└──────────────────────────────────────────────────────────────┘
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

**Overall:** Static Site Generator (SSG) with Markdown content, single-layer flat structure.

**Key Characteristics:**
- All content files reside in a single directory (`docs/`) with no subdirectory grouping
- Sidebar is auto-generated from the filesystem by `vitepress-sidebar`, with post-processing to flatten root grouping and strip `/docs` prefix from URLs
- Theme extends VitePress DefaultTheme with CSS variable overrides only (no component customization)
- Deployment is manual via shell script (not CI/CD)
- Chinese-language UI (zh-CN locale for search, navigation labels, outline, doc footer)

## Layers

**Content Layer:**
- Purpose: Store all site content as Markdown files with YAML frontmatter
- Location: `docs/`
- Contains: 15 Markdown documents + 1 index page (`index.md`)
- Depends on: Nothing
- Used by: VitePress build pipeline

**Configuration Layer:**
- Purpose: Configure VitePress SSG behavior, theme, sidebar, and markdown processing
- Location: `docs/.vitepress/`
- Contains: `config.mts` (TypeScript config), `theme/index.ts` (theme entry), `theme/custom.css` (style overrides)
- Depends on: `vitepress`, `vitepress-sidebar` packages
- Used by: VitePress build process

**Build Layer:**
- Purpose: Transform Markdown + config into static HTML/CSS/JS
- Location: `docs/.vitepress/dist/` (output)
- Contains: Static site assets, HTML pages, JS bundles, CSS, fonts
- Depends on: VitePress build pipeline

**Deployment Layer:**
- Purpose: Publish built static site to GitHub Pages
- Location: `deploy.sh` (script)
- Contains: Build-and-push shell script targeting `gh-pages` branch on GitHub
- Depends on: npm build, git push

## Data Flow

### Build Pipeline Flow

1. Content author writes/edits Markdown files in `docs/*.md` with YAML frontmatter (title, created, updated, version, author, tags, etc.)
2. VitePress `build` command reads `docs/.vitepress/config.mts` which:
   - Calls `generateSidebar()` from `vitepress-sidebar` to scan `docs/` and auto-generate sidebar items from the filesystem
   - Post-processes sidebar via `flattenRootGroup()` to unwrap the root grouping level
   - Post-processes sidebar via `stripDocsPrefix()` to remove `/docs` prefix from generated links (URLs should not contain the `docs` subdirectory segment)
3. Markdown is processed with a custom markdown-it plugin (`fixLinkSpaces`) that wraps URLs containing spaces in angle brackets
4. VitePress generates static HTML pages for each `.md` file plus `index.md` as the homepage
5. Build output is written to `docs/.vitepress/dist/`

### Deploy Flow

1. `bash deploy.sh` is invoked
2. Runs `npm run build` (vitepress build docs)
3. Copies `docs/.vitepress/dist/` contents to a temporary directory
4. Inits a new git repo in the temp dir on `gh-pages` branch
5. Force-pushes to the same repo's `gh-pages` branch
6. Cleans up temporary directory

**State Management:**
- No runtime state. Entirely static site generation. All state is in the filesystem (Markdown files on disk).

## Key Abstractions

**Sidebar Auto-generation + Post-processing:**
- Purpose: Automatically derive navigation sidebar from filesystem layout, then normalize for VitePress URL conventions
- Files: `docs/.vitepress/config.mts` (inline functions `flattenRootGroup` and `stripDocsPrefix`)
- Pattern: Two-stage transform pipeline — raw generation via `vitepress-sidebar`, then normalization via custom post-processing

**Custom markdown-it Plugin:**
- Purpose: Fix VitePress markdown-it limitation where URLs with spaces in brackets `[text](url with spaces)` are not automatically wrapped in angle brackets `<url with spaces>`
- Files: `docs/.vitepress/config.mts` (inline `fixLinkSpaces` function)
- Pattern: Pre-processing rule injected before VitePress's block parsing

**Theme Extension:**
- Purpose: Extend VitePress DefaultTheme with zero custom components, only CSS variable overrides
- Files: `docs/.vitepress/theme/index.ts`, `docs/.vitepress/theme/custom.css`
- Pattern: Import DefaultTheme, re-export it unchanged, import `custom.css` for CSS variable overrides (brand colors indigo, Chinese-capable font stacks)

## Entry Points

**Homepage:**
- Location: `docs/index.md`
- Triggers: Site root URL `/`
- Responsibilities: Landing page with hero section (name, tagline, action button linking to /java程序员面试/) and a flat list of all documents organized under a single "其他" (Other) heading

**Build Entry:**
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

**What happens:** Some documents link to other documents using bracket syntax with filenames containing spaces, e.g., `[GSD 使用教程](GSD使用教程-命令速查.md)`. VitePress's markdown-it parser does not natively handle spaces in link URLs.
**Why it's wrong:** Requires a custom markdown-it plugin (`fixLinkSpaces`) to wrap these URLs in angle brackets at build time. This adds complexity and a non-standard preprocessing step.
**Do this instead:** Use `vitepress-sidebar`'s auto-generated navigation for cross-linking, or ensure all filenames use only ASCII characters without spaces.

### Flat Content Directory

**What happens:** All 15 Markdown documents are placed in a single `docs/` directory with no subdirectory structure.
**Why it's wrong:** As the site grows, a flat directory becomes harder to navigate and manage. There is no thematic grouping at the file-system level (e.g., `docs/gsd/`, `docs/devops/`, `docs/research/`). All content categorization relies on the vitepress-sidebar auto-generation, which treats all files as peers.
**Do this instead:** Organize documents into subdirectories by topic (`docs/gsd-tutorials/`, `docs/devops/`, `docs/ai-research/`, `docs/knowledge-base/`). The `vitepress-sidebar` library automatically creates grouped sidebar sections for subdirectories, which would improve navigation without requiring manual sidebar configuration.

## Error Handling

**Strategy:** Not applicable. Static site has no runtime error handling. Build errors surface through VitePress CLI.

**Patterns:**
- `ignoreDeadLinks: true` in config suppresses dead-link warnings during build
- `chunkSizeWarningLimit: 1000` raises the default chunk size warning threshold from 500KB to 1000KB to suppress warnings for large documents (e.g., `GSD-gsd-tools使用教程.md` at 140KB, `java程序员面试.md` at 190KB)

## Cross-Cutting Concerns

**Logging:** None. Build output is standard CLI from VitePress.
**Validation:** `ignoreDeadLinks: true` means internal link validation is disabled. No automated frontmatter validation exists.
**Authentication:** None. Site is public, static, and unauthenticated.

---

*Architecture analysis: 2026-07-04*
