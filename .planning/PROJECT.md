# Ziogn Notes

## What This Is

个人技术文档 VitePress 知识库，以中文 Markdown 文档为主，涵盖 DevOps、Flutter、Java、AI 模型评测、GSD 使用教程等主题。每篇文档的 YAML frontmatter 中维护了 `tags` 标签字段，目标是让这些标签成为可搜索的导航维度，帮助用户更快找到相关文档。

## Core Value

用户可以通过标签快速定位相关文档，尤其是当文档量增长后，标签搜索成为比全文搜索更精准的发现方式。

## Requirements

### Validated

- ✓ **全文搜索** — VitePress local search with MiniSearch
- ✓ **标签索引构建** — `virtual:tag-index` Vite 插件从 frontmatter 提取标签
- ✓ **标签芯片筛选** — 搜索弹窗内可按标签 AND 过滤
- ✓ **标签颜色** — 基于哈希的确定性 HSL 颜色，亮/暗模式自适应
- ✓ **品牌色** — 靛蓝 (#6366f1) 主题色
- ✓ **自动侧边栏** — vitepress-sidebar 自动生成

### Active

- ✓ **标签云页面** — 独立标签云页面`/tags`，导航栏右侧图标入口（已验证 Phase 1）
- ✓ **标签云标签展示** — 标签云页面展示所有标签及其文档计数（已验证 Phase 1）
- [ ] **TAGCLOUD-03**: 用户点击标签云中的标签可跳转到搜索弹窗并自动选中该标签
- [ ] **HOME-01**: 首页不再显示「开始浏览」按钮
- [ ] **HOME-02**: 首页展示标签云区域，样式与搜索弹窗 tag chip 一致

### Out of Scope

- 标签 CRUD 管理界面 — 标签通过 frontmatter 维护，无需管理 UI
- 标签关联推荐 — 不自动推荐相关标签，仅展示已有标签
- 标签层级/分类 — 保持扁平标签体系

## Context

- 项目为纯静态 VitePress 站点，基于 SSG 构建
- 标签数据来源于 `virtual:tag-index` 虚拟模块（Vite 插件读取 frontmatter 构建）
- 搜索弹窗已实现完整标签芯片筛选 UI，包括：HSL 哈希颜色、AND 过滤、计数展示
- 标签芯片样式封装在 `VPLocalSearchBox.vue` 的 scoped CSS 中
- 14 篇文档各有 2-5 个标签，标签总数约 30+
- 部署到 GitHub Pages，无后端服务

## Constraints

- **搜索体验**: 必须保持 VitePress 原生搜索弹窗的交互风格，标签相关功能不应脱离搜索框
- **文档格式**: 不能破坏现有 frontmatter 格式，标签继续由 `tags` 数组字段维护
- **构建流程**: 不能增加复杂的外部依赖，维持静态站点特性
- **标签云样式**: 首页标签云应与搜索弹窗内的 tag chip 保持视觉一致性

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 使用 `virtual:tag-index` 虚拟模块提供标签数据 | 无需运行时请求，构建时静态注入 | ✓ Good |
| 标签颜色基于哈希计算而非预设映射 | 无需维护颜色配置表，自动适配新标签 | ✓ Good |
| 搜索/标签云复用同一标签数据源 | 保证两个展示面的标签数据一致 | ✓ Good |

---

*Last updated: 2026-07-05 — Phase 1 (标签云页面) complete*
