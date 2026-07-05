# Phase 02：首页改造 - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

首页 Hero 区域改造：
- **HOME-01**: 移除 Hero 中的"开始浏览"action 按钮
- **HOME-02**: 首页新增标签云展示区域，样式与搜索弹窗 tag chip 一致

不包含点击标签跳转搜索功能（TAGS-04 为 v2 需求，在后续阶段实现）。
</domain>

<decisions>
## Implementation Decisions

### 标签云位置
- **D-01:** 标签云在 Hero 正下方展示（紧接 tagline 之后）
- **D-02:** 标签云与 Hero 之间有间距分隔（~48px gap）
- **D-03:** 标签云区域有标题（如"内容分类"、"标签"等）
- **D-04:** 水平居中对齐，有最大宽度限制（与 Hero 内容区同宽）
- **D-05:** 文档列表（"全部文档"区域）保留在标签云下方

### 组件复用策略
- **D-06:** 创建独立组件 `HomeTagCloud.vue`，不复用 `TagCloudLayout.vue`
- **D-07:** 标签芯片公共样式提取到共享 CSS（custom.css），减少三处（SearchBox、TagCloudLayout、HomeTagCloud）的样式重复

### Layout 集成方式
- **D-08:** 通过 VitePress DefaultTheme 的 `home-hero-after` Layout slot 注入 HomeTagCloud 组件

### 展示上限与排序
- **D-09:** 展示全部标签（不限制数量）
- **D-10:** 按文档数降序排列
- **D-11:** 标签芯片自然换行排列（flex wrap）
- **D-12:** 显示统计信息（标签总数、覆盖文档数）
- **D-13:** 纯展示模式，无点击交互（cursor: default）
- **D-14:** 移动端布局与桌面端一致（flex wrap 自适应）

### Hero 空间处理
- **D-15:** 仅移除"开始浏览"按钮（删除 hero.actions 配置）
- **D-16:** Hero padding 和其余内容保持不变
- **D-17:** 文档列表标题从"其他"改为"全部文档"（在 index.md 中修改）

### Claude's Discretion
- 标签云区域标题的具体文案由实现时确定（如"内容分类"或"标签"）
- 间距 gap 的具体像素值由实现时决定（~48px 为参考）
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 首页布局
- `docs/index.md` — 首页 markdown 源文件。需要删除 hero.actions 配置，修改"其他" heading 为"全部文档"

### Theme 和组件
- `docs/.vitepress/theme/index.ts` — Theme 入口，Layout 插槽注入点。已有 TagCloudNavButton 通过 nav-bar-content-after 注入，需在此处添加 home-hero-after 插槽
- `docs/.vitepress/theme/components/TagCloudLayout.vue` — 标签云页面全屏布局组件（参考样式，不直接复用）
- `docs/.vitepress/theme/components/VPLocalSearchBox.vue` — 搜索弹窗标签芯片样式参考

### 工具函数
- `docs/.vitepress/theme/util/tagChip.ts` — 标签颜色工具（allTagsFromIndex、tagChipStyle、tagHue），首页标签云直接复用

### 样式
- `docs/.vitepress/theme/custom.css` — 自定义品牌色和字体。标签芯片公共样式将提取至此
- `docs/.vitepress/config.mts` — VitePress 配置（引用即可，无需修改）
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tagChip.ts` — `allTagsFromIndex(tagIndex)` 提取所有标签、`tagChipStyle(name, isDark)` 生成 HSL 颜色样式。首页标签云直接复用
- `virtual:tag-index` Vite 虚拟模块 — 标签数据源，构建时静态注入

### Established Patterns
- 标签芯片样式：pill 形状（border-radius: 999px）、HSL 确定性色相、hover 亮度提升 + translateY
- 数据流：Vite 构建时提取 frontmatter tags → virtual:tag-index → Vue 组件计算属性展开

### Integration Points
- `theme/index.ts` — 通过 `home-hero-after` Layout slot 注入 HomeTagCloud 组件。当前 theme/index.ts 已定义 Layout() 渲染函数，需在内添加一个新的插槽命名槽
- `index.md` — 需修改 hero.actions 配置（删除"开始浏览"按钮）、修改 h2 heading 文字
</code_context>

<specifics>
## Specific Ideas

无特殊参考要求 — 按标准 VitePress 组件开发和 CSS 提取方式实现。
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 02-首页改造*
*Context gathered: 2026-07-05*
