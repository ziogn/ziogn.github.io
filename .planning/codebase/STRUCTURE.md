# Codebase Structure

**Analysis Date:** 2026-07-04

## Directory Layout

```
ziogn.github.io/
├── docs/                               # Site source content (VitePress root)
│   ├── .vitepress/                     # VitePress configuration
│   │   ├── cache/                      # Vite dependency cache (gitignored)
│   │   ├── dist/                       # Static build output (gitignored)
│   │   ├── config.mts                  # Main VitePress config (TypeScript)
│   │   └── theme/
│   │       ├── custom.css              # CSS variable overrides (brand color, fonts)
│   │       └── index.ts                # Theme entry: extends DefaultTheme
│   ├── index.md                        # Homepage (home layout with hero)
│   ├── Certbot使用指南.md               # DevOps: Certbot/SSL tutorial
│   ├── DeepSeek V4 Flash vs MiniMax M3 模型对比分析.md  # AI: Model comparison
│   ├── deepseek-v4-flash-gsd-core-调研报告.md           # AI: Research report
│   ├── docker-compose使用教程.md        # DevOps: Docker compose tutorial
│   ├── Flutter开发知识库.md              # Knowledge base: Flutter
│   ├── gsd-core-配置文件解读.md          # GSD: Config file reference
│   ├── GSD-gsd-core 模型解析与 Agent 模型切换.md  # GSD: Model switching
│   ├── GSD-gsd-tools使用教程.md          # GSD: Tools tutorial (largest doc, 4361 lines)
│   ├── GSD使用教程-workspace.md          # GSD: Workspace isolation tutorial
│   ├── GSD使用教程-并行开发.md            # GSD: Parallel development tutorial
│   ├── GSD使用教程-命令速查.md            # GSD: Command reference
│   ├── java程序员面试.md                 # Knowledge base: Java interview (second largest, 4642 lines)
│   ├── nginx配置实战指南.md               # DevOps: Nginx config guide
│   └── 轻量级日志聚合服务调研.md           # Research: Log aggregation service survey
├── node_modules/                       # NPM dependencies (gitignored)
├── .gitignore                          # Git ignore rules
├── .planning/                          # GSD planning artifacts
│   └── codebase/                       # Codebase analysis documents (this file)
├── deploy.sh                           # Build + deploy script (gh-pages push)
├── package.json                        # NPM package config
└── package-lock.json                   # NPM lockfile
```

## Directory Purposes

**`docs/`:**
- Purpose: Root content directory for VitePress. All Markdown source files live here (flat, no subdirectories)
- Contains: 15 `.md` document files + 1 `index.md` homepage + `.vitepress/` configuration
- Key files: `index.md` (homepage), `config.mts` (site configuration)

**`docs/.vitepress/`:**
- Purpose: VitePress configuration, theme, build cache, and build output
- Contains: `config.mts`, `theme/` subdirectory, `cache/` (auto-generated, gitignored), `dist/` (auto-generated, gitignored)
- Key files: `config.mts`, `theme/index.ts`, `theme/custom.css`

**`docs/.vitepress/theme/`:**
- Purpose: Custom theme extending VitePress DefaultTheme
- Contains: Theme entry point and CSS overrides
- Key files: `index.ts` (imports and re-exports DefaultTheme, imports custom.css), `custom.css` (indigo brand color palette, Chinese font stack)

**Root (`/`):**
- Purpose: Project scaffolding
- Contains: `package.json`, `package-lock.json`, `deploy.sh`, `.gitignore`
- Key files: `package.json` (npm scripts: dev, build, preview, deploy), `deploy.sh` (build + gh-pages deployment automation)

## Key File Locations

**Entry Points:**
- `docs/index.md`: Homepage (home layout with hero section and document index)
- `docs/.vitepress/config.mts`: VitePress configuration entry (read by vitepress build/dev)

**Configuration:**
- `docs/.vitepress/config.mts`: Site metadata, theme, sidebar, search, markdown plugins, language/locale settings
- `docs/.vitepress/theme/custom.css`: Brand color CSS variables, font stacks (Inter + Chinese system fonts)
- `docs/.vitepress/theme/index.ts`: Theme registration
- `.gitignore`: Cache and build output exclusions
- `package.json`: NPM dependencies (`vitepress ^1.6.4`, `vitepress-sidebar ^1.36.1`), scripts

**Core Logic:**
- `docs/.vitepress/config.mts`: `fixLinkSpaces` (custom markdown-it plugin), `flattenRootGroup` (sidebar post-processing), `stripDocsPrefix` (URL normalization)
- `deploy.sh`: Build-and-deploy automation

**Testing:**
- Not detected. No test files, test configuration, or test scripts exist in this project.

## Naming Conventions

**Files:**
- Markdown content: `{Chinese-title}.md` — filenames are in Chinese with spaces between words, matching the rendered title (e.g., `GSD使用教程-命令速查.md`, `Nginx配置实战指南.md`)
- Some documents use hyphenated English or mixed-case titles: `deepseek-v4-flash-gsd-core-调研报告.md`, `docker-compose使用教程.md`
- Configuration files use standard VitePress conventions: `config.mts`, `index.ts`, `custom.css`

**Directories:**
- `.vitepress/`: Lowercase with leading dot (VitePress convention)
- `.vitepress/theme/`: Lowercase (VitePress convention)
- `.planning/`: Lowercase with leading dot (GSD convention)

## Where to Add New Code

**New Document:**
- Add `.md` file to `docs/` directory
- Include YAML frontmatter with at minimum `title` field (used by vitepress-sidebar for sidebar display text)
- The sidebar auto-generates from the filesystem — no manual sidebar config needed
- Add a link to the new document in `docs/index.md` under the appropriate heading section

**New Theme Override:**
- CSS overrides: `docs/.vitepress/theme/custom.css`
- Vue component overrides: Register custom components in `docs/.vitepress/theme/index.ts` (currently passes through DefaultTheme unchanged)

**New Configuration:**
- VitePress config changes: `docs/.vitepress/config.mts`
- Build/deploy changes: `deploy.sh`
- New npm dependencies: Add to `package.json` devDependencies

## Special Directories

**`docs/.vitepress/cache/`:**
- Purpose: Vite dependency pre-bundling cache
- Generated: Yes (by Vite upon first build/dev)
- Committed: No (listed in `.gitignore`)

**`docs/.vitepress/dist/`:**
- Purpose: Static build output (the deployable site)
- Generated: Yes (by `vitepress build docs` or `npm run build`)
- Committed: No (listed in `.gitignore`)

**`node_modules/`:**
- Purpose: NPM dependencies
- Generated: Yes (by `npm install`)
- Committed: No (listed in `.gitignore`)

**`.planning/`:**
- Purpose: GSD workflow artifacts (planning, codebase analysis, etc.)
- Generated: Yes (by GSD commands)
- Committed: Yes (tracked in git for cross-session continuity)

---

*Structure analysis: 2026-07-04*
