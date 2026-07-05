# Phase 02：首页改造 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05
**Phase:** 02-首页改造
**Areas discussed:** 标签云位置, 组件复用策略, 展示上限与排序, Hero 空间处理

---

## 标签云位置

| Option | Description | Selected |
|--------|-------------|----------|
| Hero 正下方（推荐） | 紧接 hero 的 name/text/tagline 之后展示。内容量少，视觉聚焦。 | ✓ |
| 文档列表上方 | 文档列表上方、保留现有布局结构。需用户滚动过 hero 才能看到。 | |

**User's choice:** Hero 正下方（推荐）
**Notes:** 无额外说明。

| Option | Description | Selected |
|--------|-------------|----------|
| 标签云在上，文档列表在下（推荐） | 两者都保留。Hero → 标签云 → 文档列表，从上到下三级布局。 | ✓ |
| 标签云替代文档列表 | 标签云展示在 Hero 下方，首页不再列出所有文档。 | |

**User's choice:** 标签云在上，文档列表在下（推荐）
**Notes:** 保留文档列表。

| Option | Description | Selected |
|--------|-------------|----------|
| 有间距间隔（推荐） | 与 Hero 和文档列表之间保留合理间距（如 48px gap） | ✓ |
| 无额外间距 | 标签云紧贴 Hero 底部开始。 | |

**User's choice:** 有间距间隔（推荐）
**Notes:** 无额外说明。

| Option | Description | Selected |
|--------|-------------|----------|
| 显示标题（推荐） | 显示一个小标题如「内容分类」或「标签」 | ✓ |
| 无标题 | 纯标签芯片展示，无标题 | |
| 你决定 | | |

**User's choice:** 显示标题（推荐）
**Notes:** 标题具体文案由实现时确定。

| Option | Description | Selected |
|--------|-------------|----------|
| 居中对齐（推荐） | 与 Hero 内容对齐（居中），视觉上统一 | ✓ |
| 左对齐 | 与文档列表中的链接对齐 | |

**User's choice:** 居中对齐（推荐）
**Notes:** 无额外说明。

| Option | Description | Selected |
|--------|-------------|----------|
| 通过 Layout 插槽注入 | 在 theme/index.ts 的 Layout 组件中通过布局插槽注入 | ✓ |
| Markdown 内组件（推荐） | 在 index.md 中用自定义组件标签 `<TagCloud />` 直接嵌入 markdown | |
| 你决定 | | |

**User's choice:** 通过 Layout 插槽注入
**Notes:** 将使用 VitePress DefaultTheme 的 `home-hero-after` slot。

| Option | Description | Selected |
|--------|-------------|----------|
| 有最大宽度（推荐） | 标签云区域设置最大宽度（与 Hero 内容区同宽） | ✓ |
| 全宽展示 | 标签云填满页面宽度 | |

**User's choice:** 有最大宽度（推荐）
**Notes:** 无额外说明。

---

## 组件复用策略

| Option | Description | Selected |
|--------|-------------|----------|
| 独立组件（推荐） | 为首页写独立组件 HomeTagCloud.vue | ✓ |
| 复用 TagCloudLayout.vue | 增强 TagCloudLayout.vue 支持通过 props 适配首页展示 | |
| 你决定 | | |

**User's choice:** 独立组件（推荐）
**Notes:** 无额外说明。

| Option | Description | Selected |
|--------|-------------|----------|
| 内联 scoped CSS | 组件内联定义全部样式 | |
| 提取公共样式（推荐） | 将标签芯片的公共样式提取到 custom.css | ✓ |
| 你决定 | | |

**User's choice:** 提取公共样式（推荐）
**Notes:** 减少三处（SearchBox、TagCloudLayout、HomeTagCloud）的样式重复。

---

## 展示上限与排序

| Option | Description | Selected |
|--------|-------------|----------|
| 按文档数排序（推荐） | 从多到少排列，用户先看到最热门的标签 | ✓ |
| 按名称排序 | 按标签名称的字母或拼音顺序排列 | |

**User's choice:** 按文档数排序（推荐）
**Notes:** 无额外说明。

| Option | Description | Selected |
|--------|-------------|----------|
| 展示全部 | 展示所有标签（目前 ~30+） | ✓ |
| 限制数量（推荐） | 只展示文档数最多的前 N 个 | |
| 你决定 | | |

**User's choice:** 展示全部
**Notes:** 无额外说明。

| Option | Description | Selected |
|--------|-------------|----------|
| 显示统计（推荐） | 展示文档总数和标签总数 | ✓ |
| 不显示统计 | 只展示标签芯片 | |

**User's choice:** 显示统计（推荐）
**Notes:** 与标签云页面的 subtitle 一致。

| Option | Description | Selected |
|--------|-------------|----------|
| 按行换行排列（推荐） | 所有标签依次排列，溢出时自然换行 | ✓ |
| 自动分布排列 | 每行数量根据容器宽度自适应排列 | |

**User's choice:** 按行换行排列（推荐）
**Notes:** 与标签云页面行为一致。

| Option | Description | Selected |
|--------|-------------|----------|
| 纯展示（推荐） | 保持纯展示（cursor: default），与当前 TagCloudLayout 行为一致 | ✓ |
| 预留点击状态 | 预先设计为可点击状态，但目前点击暂不执行操作 | |

**User's choice:** 纯展示（推荐）
**Notes:** 点击跳搜索推迟到后续阶段（TAGS-04）。

| Option | Description | Selected |
|--------|-------------|----------|
| 与桌面相同（推荐） | flex wrap 自然换行，间距自动适配 | ✓ |
| 移动端简化布局 | 移动端减少展示数量或改为单列滚动排列 | |

**User's choice:** 与桌面相同（推荐）
**Notes:** 无额外说明。

| Option | Description | Selected |
|--------|-------------|----------|
| 保持「其他」（推荐） | 保留「其他」标题不变 | |
| 改为更明确的标题 | 将「其他」改为更合适的标题 | ✓ |
| 你决定 | | |

**User's choice:** 改为更明确的标题
**Notes:** 新标题在下一题确定。

| Option | Description | Selected |
|--------|-------------|----------|
| 全部文档 | — | ✓ |
| 文档列表 | — | |
| 文章列表 | — | |
| 你决定 | — | |

**User's choice:** 全部文档
**Notes:** 无额外说明。

---

## Hero 空间处理

| Option | Description | Selected |
|--------|-------------|----------|
| 仅移除按钮（推荐） | 仅删除按钮，hero 的其他内容和间距保持不变 | ✓ |
| 移除 + 缩小 Hero 高度 | 移按钮后适当减小 hero 整体 padding | |
| 你决定 | | |

**User's choice:** 仅移除按钮（推荐）
**Notes:** 改动最小。

| Option | Description | Selected |
|--------|-------------|----------|
| 不改其他内容（推荐） | 保持现有 hero 内容不动 | ✓ |
| 添加额外文字 | 在 tagline 下方添加额外描述 | |

**User's choice:** 不改其他内容（推荐）
**Notes:** 无额外说明。

---

## Claude's Discretion

- 标签云区域标题的具体文案（由实现时确定，如"内容分类"或"标签"）
- 间距 gap 的具体像素值（~48px 为参考值）

## Deferred Ideas

无 — 讨论保持在阶段范围内。
