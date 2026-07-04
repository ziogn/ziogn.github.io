# Coding Conventions

**Analysis Date:** 2026-07-04

## Naming Patterns

**Files:**
- Markdown documentation uses Chinese characters with spaces in filenames (e.g., `GSD-gsd-tools使用教程.md`, `docker-compose使用教程.md`, `nginx配置实战指南.md`)
- VitePress config uses `.mts` extension: `config.mts`
- Theme files: `index.ts`, `custom.css`
- Shell scripts: `deploy.sh`
- Package manifest: `package.json`, `package-lock.json`
- Gitignore: `.gitignore`

**Functions:**
- Config file functions use camelCase: `fixLinkSpaces`, `flattenRootGroup`, `stripDocsPrefix` (in `docs/.vitepress/config.mts`)

**Variables:**
- camelCase for TypeScript variables: `rawSidebar`, `fixed`, `DIST`, `TMP`, `PAGES_DIR`, `REMOTE`
- Single-letter parameters in callbacks: `md`, `_m`, `url`, `items`, `item`

**Types:**
- Minimal type annotations: `md: any`, `state: any`, `items: any[]`, `_m: string`, `url: string` (in `docs/.vitepress/config.mts`)

**Frontmatter fields (YAML):**
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

**Formatting:**
- No formatter configured (no `.prettierrc`, `biome.json`, or `.editorconfig` detected)
- TypeScript/JavaScript: No linting configuration (no `.eslintrc*`, `eslint.config.*` detected)

**Linting:**
- No linter configured for TypeScript or Markdown content
- No TypeScript `tsconfig.json` detected (project relies on VitePress defaults)

## Import Organization

**Order (in `docs/.vitepress/config.mts`):**
1. External framework imports: `import { defineConfig } from 'vitepress'`
2. Plugin/library imports: `import { generateSidebar } from 'vitepress-sidebar'`

**Theme imports (in `docs/.vitepress/theme/index.ts`):**
1. Theme import: `import DefaultTheme from 'vitepress/theme'`
2. Local CSS: `import './custom.css'`

**Path Aliases:**
- Not detected (no path aliases configured)

## Error Handling

**Patterns:**
- Minimal error handling in the codebase (documentation site with no application logic)
- Shell script uses `set -e` for fail-fast behavior and explicit directory existence check (`docs/.vitepress/config.mts`)
- No try/catch blocks in TypeScript/JavaScript code
- VitePress config sets `ignoreDeadLinks: true` to suppress broken link warnings

## Logging

**Framework:** None

**Patterns:**
- Shell deploy script (`deploy.sh`) uses `echo` with informative prefixes: `=== 1/3 ... ===`, Unicode symbols (`✓`, `✗`)
- No logging in TypeScript config code
- VitePress itself handles build-time logging

## Comments

**When to Comment:**
- Configuration logic includes multi-line comments explaining WHY a transformation is needed (see `docs/.vitepress/config.mts`)
- Comments are written in Chinese, matching the project's primary language
- Comments focus on explaining non-obvious workarounds or framework limitations

**JSDoc/TSDoc:**
- Not used. Function comments are plain multi-line `//` or `/* */` blocks

**Example:**
```typescript
// markdown-it 插件：在解析前自动将含空格的链接 URL 包裹角括号 `<url>`。
// markdown-it 原生不支持 `[text](url with spaces)`，但支持 `[text](<url with spaces>)`。
```

## Function Design

**Size:**
- Small, focused utility functions with a single responsibility
- Config file defines three functions: `fixLinkSpaces` (12 lines), `flattenRootGroup` (6 lines), `stripDocsPrefix` (8 lines)
- Each function is ~5-12 lines of logic

**Parameters:**
- Functions accept the minimal required input (typically `md` instance or sidebar items array)
- No default parameters used

**Return Values:**
- `flattenRootGroup` and `stripDocsPrefix` return transformed arrays
- `fixLinkSpaces` is a void function (mutates markdown-it state)

## Module Design

**Exports:**
- `docs/.vitepress/config.mts`: Uses `export default defineConfig({...})` pattern (ESM default export)
- `docs/.vitepress/theme/index.ts`: Uses `export default DefaultTheme` pattern

**Barrel Files:**
- Not used. Each module exports directly.

---

*Convention analysis: 2026-07-04*
