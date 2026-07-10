# Phase 5: 数据层扩展 - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

创建 `useTagFilter()` Vue Composable，为 /tags 页面提供响应式的标签选择状态管理与文档 AND 筛选核心逻辑。纯数据层，不涉及任何 UI 组件、点击事件处理器或视觉状态变化。

</domain>

<decisions>
## Implementation Decisions

### 数据层形态
- **D-01:** 采用 Vue Composable `useTagFilter()` 封装数据层，而非纯 TypeScript 模块。遵循 Vue 3 标准模式，便于测试和职责拆分。
- **D-02:** Composable 通过 provide/inject 机制在多组件间共享同一状态实例，确保 TagCloudLayout 和 DocList 状态同步。
- **D-03:** 文件位置在 `theme/util/useTagFilter.ts`，与 tagChip.ts 同目录。

### Composable 返回值范围
- **D-04:** useTagFilter 包含完整数据层能力：
  - `selectedTags` — 响应式 `Set<string>`，支持 add/remove/clear 编程式更新
  - `toggleTag(tag)` / `clearTags()` — 状态操作方法
  - `filteredDocs` — computed 属性，按 AND 逻辑筛选文档列表（无筛选时返回全文列表）
  - `compatibleTags` — computed 属性，计算与当前选中标签兼容的标签列表（TAGCLOUD-08 的纯数据计算，UI 层交给 Phase 6 实现）
- **D-05:** 筛选数据源来自 `virtual:tag-index`，每条文档需包含 `title`、URL 路径、`tags` 字段供下游渲染。

### 跨组件状态共享
- **D-06:** 在 Phase 6 的父容器（TagCloudLayout 或 /tags 页面入口）通过 `provide('tagFilterKey', useTagFilter())` 提供 Composable 实例，子组件通过 `inject('tagFilterKey')` 获取同一响应式实例。

### 兼容性处理策略
- **D-07:** 选中标签后，`compatibleTags` computed 计算与所有已选标签同属至少一篇文档的标签列表。当无选中标签时，所有标签视为兼容。
- **D-08:** 不兼容标签的数据是否置灰/隐藏属于视觉表现层，由 Phase 6 决定。Phase 5 只提供 "哪些标签兼容" 的计算结果。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 标签数据源与工具
- `docs/.vitepress/search/tag-index-plugin.ts` — `virtual:tag-index` Vite 插件定义，提供 `Record<url, {tags, title}>` 数据结构
- `docs/.vitepress/search/index.ts` — 搜索配置，含 tag 注入到 HTML 的处理

### 现有标签工具函数
- `docs/.vitepress/theme/util/tagChip.ts` — `TagItem` 接口、`tagHue()`、`tagChipStyle()`、`allTagsFromIndex()` 等共享工具函数

### 现有组件（供参考模式而非复用）
- `docs/.vitepress/theme/components/VPLocalSearchBox.vue` — 搜索弹窗内含 `selectedTags ref` + `toggleTag()` + AND 标签筛选实现，可作为 useTagFilter 实现参考

### 现有标签云组件（Phase 6 将改造）
- `docs/.vitepress/theme/components/TagCloudLayout.vue` — 当前仅展示所有标签，无交互

### 需求文档
- `.planning/REQUIREMENTS.md` — TAGCLOUD-06 归属 Phase 5
- `.planning/ROADMAP.md` §Phase 5 — 成功标准定义

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tagChip.ts` — `TagItem` 类型、`allTagsFromIndex()`、`tagChipStyle()` 可直接复用。`allTagsFromIndex` 在 VPLocalSearchBox 和 TagCloudLayout 中都已使用。
- `virtual:tag-index` 虚拟模块 — 标签数据源，构建时注入，无需运行时请求。

### Established Patterns
- 标签数据全量加载模式：现有组件都通过 `import tagIndex from 'virtual:tag-index'` 获取全量标签数据，在客户端做筛选（VPLocalSearchBox 的 `searchWithTagFilter`）。Phase 5 继续沿用此模式。
- 组件样式共享模式：`.tag-chip-base` 简化 CSS 类在 `custom.css` 中定义，组件内通过 scoped CSS 补充。

### Integration Points
- Phase 5 的 Composable 需要通过 Vue 的 `provide('/inject('tagFilterKey')` 模式供 Phase 6 的 TagCloudLayout 和 DocList 组件使用。
- Composable 放在 `theme/util/` 目录，可通过 VitePress 的主题系统自动导入或按需 import。
- 现有 TagCloudLayout.vue 需要改造以接收 selectedTags 状态并提供给标签按钮。

</code_context>

<specifics>
## Specific Ideas

- 参考 VPLocalSearchBox.vue 中 `selectedTags = ref(new Set())` 的实现方式，但提取为独立 composable
- 参考 VPLocalSearchBox.vue 中 `searchWithTagFilter` 的 AND 逻辑，但脱离 MiniSearch 依赖（直接对 tagIndex 做 Array.filter）
- `compatibleTags` 计算逻辑：对每个标签，检查是否存在一篇文档同时包含该标签和所有已选标签

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 5-数据层扩展*
*Context gathered: 2026-07-10*
