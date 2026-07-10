# Ziogn Notes

## What This Is

个人技术文档 VitePress 知识库，以中文 Markdown 文档为主，涵盖 DevOps、Flutter、Java、AI 模型评测、GSD 使用教程等主题。每篇文档的 YAML frontmatter 中维护了 `tags` 标签字段，目标是让这些标签成为可搜索的导航维度，帮助用户更快找到相关文档。

## Core Value

用户可以通过标签快速定位相关文档，尤其是当文档量增长后，标签搜索成为比全文搜索更精准的发现方式。

## Current Milestone: v1.2.0 标签云页面交互筛选

**Goal:** 标签云页面支持标签点击筛选文档列表，多选 AND 逻辑，兼容性高亮

**Target features:**
- 左标签右列表的双栏布局
- 标签点击筛选文档列表
- 多标签 AND 组合筛选
- AND 兼容性高亮

## Requirements

### Validated

- ✓ **全文搜索** — VitePress local search with MiniSearch
- ✓ **标签索引构建** — `virtual:tag-index` Vite 插件从 frontmatter 提取标签
- ✓ **标签芯片筛选** — 搜索弹窗内可按标签 AND 过滤
- ✓ **标签颜色** — 基于哈希的确定性 HSL 颜色，亮/暗模式自适应
- ✓ **品牌色** — 靛蓝 (#6366f1) 主题色
- ✓ **自动侧边栏** — vitepress-sidebar 自动生成
- ✓ **标签云页面** — 独立标签云页面`/tags`，导航栏右侧图标入口（Phase 1）
- ✓ **标签云标签展示** — 标签云页面展示所有标签及其文档计数（Phase 1）
- ✓ **标签云公用 CSS** — `.tag-chip-base` 全局类提取到 custom.css，标签芯片样式组件间共享（Phase 2）
- ✓ **首页改造** — 首页移除「开始浏览」按钮，Hero 下方展示标签云区域（Phase 2）
- ✓ **首页文档列表标题更新** — 首页文档列表标题从"其他"改为"文章列表"（Phase 3 — complete 2026-07-06）
- ✓ **首页标签交互筛选** — 首页标签多选 AND 筛选文档列表（Phase 4 — complete 2026-07-06，后被移除）

### Active

- [ ] **TAGCLOUD-04**: 标签云页面使用左标签右列表的双栏布局
- [ ] **TAGCLOUD-05**: 用户点击标签云中的标签可筛选下方文档列表
- [ ] **TAGCLOUD-06**: 用户可选择多个标签，文档列表按 AND 逻辑过滤
- [ ] **TAGCLOUD-07**: 已选中的标签有视觉高亮状态，再次点击可取消选中
- [ ] **TAGCLOUD-08**: 选中标签后，兼容的标签（与所有已选标签同属至少一篇文档）高亮显示

### Out of Scope

- 标签 CRUD 管理界面 — 标签通过 frontmatter 维护，无需管理 UI
- 标签关联推荐 — 不自动推荐相关标签，仅展示已有标签
- 标签层级/分类 — 保持扁平标签体系
- 标签云跳转到搜索弹窗 — 用户选择在标签云页面内直接筛选
- 首页标签云筛选 — 首页标签云已移除，筛选功能集中在 /tags 页面

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

*Last updated: 2026-07-10 — Milestone v1.2.0 started*

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
