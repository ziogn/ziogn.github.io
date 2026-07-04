# Phase 1: Tag Indexing in Search - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

将 docs 目录下所有 Markdown 文档的 frontmatter `tags` 字段内容纳入 VitePress 本地搜索（MiniSearch）的索引，使得用户在搜索框中输入关键词时，能匹配到标签内容。标签匹配的结果参与搜索排序但不在搜索结果中额外展示。

这是 Phase 1，只涉及「普通搜索能匹配到 tags」——不涉及 `tag:` 前缀搜索、自动补全、标签页面等后续功能。
</domain>

<decisions>
## Implementation Decisions

### Tags 索引实现路径
- **D-01:** 使用「自定义 Search Provider」方案，替换 VitePress 的 `provider: 'local'`，直接控制 MiniSearch 配置，将 `tags` 作为独立字段索引。
- **D-02:** 一次性搭建完整框架，为后续 Phase 2（tag: 前缀搜索）和 Phase 3（标签自动补全）预留扩展点。
- **D-03:** 自定义 Search Provider 代码放在 `docs/.vitepress/search/` 目录下，独立于 config.mts，保持模块化。
- **D-04:** MiniSearch 索引 tags 字段时，同时存储标签名称和关联的文档元信息（标题、路径），便于后续扩展。

### 搜索结果中标签展示
- **D-05:** 搜索结果不额外展示标签信息（纯匹配，不修改现有搜索 UI 渲染）。
- **D-06:** 标签匹配的文档在搜索结果中权重略高，通过 MiniSearch 的 Boost 机制实现。
- **D-07:** 标签字段权重使用 MiniSearch 默认配置，不做额外降低处理。

### 中文标签搜索优化
- **D-08:** 不对中文标签做额外分词处理，依赖 MiniSearch 默认行为。中文逐字分词在搜索完整标签时通常能正常匹配。
- **D-09:** 英文标签在索引时统一转小写，确保大小写不敏感搜索。
- **D-10:** 对于包含连字符的标签（如 `docker-compose`），部分匹配即可（输入 `compose` 能匹配 `docker-compose`）。MiniSearch 默认按连字符拆分即可满足需求。
- **D-11:** 标签字段在搜索结果中使用默认权重，不做特殊调节。

### Claude's Discretion
- 自定义 Search Provider 的具体 API 实现方式由实现者根据 VitePress local search provider 接口自行决定。
- MiniSearch 的 boost 系数由实现者根据实际效果微调。
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Search Configuration
- `docs/.vitepress/config.mts` — VitePress 配置文件，包含当前 `provider: 'local'` 搜索配置（第 69-77 行）。自定义 Search Provider 需要在此替换 provider 配置。
- `docs/.vitepress/theme/index.ts` — 主题入口，如需自定义搜索 UI 组件可在此注册。
- `docs/.vitepress/theme/custom.css` — 自定义 CSS 样式文件。

### Frontmatter Pattern
- `docs/*.md` — 参考任意一篇文档的 frontmatter tags 字段格式（数组形式，如 `[nginx, devops, 运维]`）

### Requirement Definition
- `.planning/REQUIREMENTS.md` — SEARCH-01 完整定义
- `.planning/ROADMAP.md` — Phase 1 的 Goal 和 Success Criteria

### Codebase Structure
- `.planning/codebase/STACK.md` — 技术栈，MiniSearch 7.2.0 是核心搜索库
- `.planning/codebase/STRUCTURE.md` — 代码库目录结构
- `.planning/codebase/CONVENTIONS.md` — 编码约定（TypeScript 偏好、模块导出模式等）
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- VitePress 已配置 `provider: 'local'`（MiniSearch），`themeConfig.search` 已有完整的中文翻译和配置——自定义 provider 应继承此配置。
- 品牌色 (#6366f1 indigo)、字体栈等 CSS 变量已定义在 `custom.css` 中——如有需要可复用。

### Established Patterns
- 配置逻辑在 `docs/.vitepress/config.mts` 中使用 `export default defineConfig(...)` 模式。
- 主题扩展使用 `import DefaultTheme from 'vitepress/theme'` + CSS 覆盖模式。
- 代码风格为 minimal type annotations，camelCase 变量命名，无 linter/formatter。

### Integration Points
- 自定义 Search Provider 需要在 `config.mts` 的 `themeConfig.search` 中替换 `provider: 'local'` 配置。
- provider 需要导出符合 VitePress `LocalSearch` 接口的对象（包含 `provider` 方法和 `options`）。
- 文档目录为 `docs/`，所有 `.md` 文件平铺。tags 在 frontmatter 的 `tags` 数组中。
</code_context>

<specifics>
## Specific Ideas

无特定参考实现——对 VitePress local search provider API 需要查阅 VitePress 官方文档了解自定义 provider 接口要求。

自定义 Search Provider 需要处理的场景：
- 构建时扫描所有文档的 frontmatter，提取 tags 信息
- 构建 MiniSearch 索引时：
  - tags 作为独立字段，boost 高于标题/正文
  - 标签名存储 + 关联文档元信息（标题、路径）
  - 英文标签统一转小写
- 搜索时：正常搜索流程中 tags 内容参与匹配和排序
- 为后续 Phase 预留扩展点（tag: 前缀解析、标签列表获取等）
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 1-Tag Indexing in Search*
*Context gathered: 2026-07-05*
