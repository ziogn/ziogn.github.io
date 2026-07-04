# External Integrations

**Analysis Date:** 2026-07-04

## APIs & External Services

**Search:**
- Algolia libraries present in `node_modules/` (algoliasearch, @docsearch/react, @algolia/client-search, etc.) but **not actively configured**. The site uses VitePress's `local` search provider backed by MiniSearch 7.2.0, not Algolia's hosted search.

**Social Links:**
- GitHub - Configured in `docs/.vitepress/config.mts` via `themeConfig.socialLinks` (uses @iconify-json/simple-icons for the GitHub icon)
  - Link: `https://github.com/ziogn/ziogn.github.io`
  - No API calls made; rendered as a static link in the navigation bar

**Icon Sets:**
- Simple Icons (`@iconify-json/simple-icons` 1.2.86) - Used for static icon rendering in navigation. No external API calls.

## Data Storage

**Databases:**
- None. This is a static documentation site with no data persistence layer.

**File Storage:**
- Local filesystem only. All Markdown content stored as `docs/*.md` files.

**Caching:**
- Vite dev cache at `docs/.vitepress/cache/deps/` - Local build cache only, no external caching service.

## Authentication & Identity

**Auth Provider:**
- None. The site is fully public with no authentication requirements.
- No analytics or tracking integrations detected.

## Monitoring & Observability

**Error Tracking:**
- None detected. No Sentry, DataDog, or similar.

**Logs:**
- None. Static site with no server-side logging.

## CI/CD & Deployment

**Hosting:**
- GitHub Pages - Deployment target, configured to serve from `gh-pages` branch
  - Configuration: No `.github/workflows/` directory found — deployment is manual only

**Deployment Pipeline:**
- `deploy.sh` - Manual shell script that:
  1. Builds the site (`npm run build`)
  2. Copies `docs/.vitepress/dist/` to a temp directory
  3. Initializes a new git repo on the `gh-pages` branch
  4. Force-pushes to `origin gh-pages`
  - Not triggered by CI — requires manual execution via `npm run deploy` or `bash deploy.sh`
  - Uses `git -c user.name="ziogn" -c user.email="ziogn@users.noreply.github.com"` for the gh-pages commit

**Badges/Linting:**
- None detected (no CI badges, no linting configuration).

## Environment Configuration

**Required env vars:**
- None. The site has no runtime environment dependencies.

**Secrets location:**
- Not applicable. No secrets present in the project.

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None.

## External Code Dependencies

**CDN/Font Loading:**
- None. All dependencies are local npm packages. No external CDN references detected.

**Google Fonts:**
- Not detected. Font stack in `custom.css` (`Inter`, `PingFang SC`, `Microsoft YaHei`, `JetBrains Mono`, `Fira Code`) uses system fonts only. No `@import` or external font loading.

---

*Integration audit: 2026-07-04*
