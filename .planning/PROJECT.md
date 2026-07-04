# Ziogn Notes — Tag 搜索

## What This Is

个人技术文档 VitePress 知识库，以中文 Markdown 文档为主，涵盖 DevOps、Flutter、Java、AI 模型评测、GSD 使用教程等主题。每篇文档的 YAML frontmatter 中维护了 `tags` 标签字段，目标是让这些标签成为可搜索的导航维度，帮助用户更快找到相关文档。

## Core Value

用户可以通过标签快速定位相关文档，尤其是当文档量增长后，标签搜索成为比全文搜索更精准的发现方式。

## Requirements

### Validated

- ✓ 已有 VitePress 文档站（`docs/` 目录）— 已有
- ✓ 每篇文档 frontmatter 包含 `tags` 数组字段 — 已有
- ✓ 已有本地搜索配置（MiniSearch provider）— 已有

### Active

- [ ] **SEARCH-01**: 普通搜索（无 `tag:` 前缀）时，标签内容也纳入搜索结果
- [ ] **SEARCH-02**: 输入 `tag:` 前缀时仅搜索标签，支持多个标签用空格分隔做交集筛选（如 `tag: flutter dart` 匹配同时含两个标签的文档）
- [ ] **PAGE-01**: 标签汇总页面，展示所有标签及其对应文章数量，标签可点击跳转到筛选结果

### Out of Scope

- 标签的 CRUD 管理界面 — 标签直接在文档 frontmatter 中维护
- 标签层级或父子关系 — 仅平铺标签
- 文章分类系统（如目录树分类）— 已有 sidebar 承担此角色
- 外部搜索服务（Algolia 等）— 维持本地搜索

## Context

### 现有代码库状态

- **框架**: VitePress 1.6.4 + Vue 3.5.38 + Vite 5.4.21
- **搜索**: 已配置 provider: 'local'（MiniSearch），已有中文翻译
- **文档**: 约 15 篇中文 Markdown 文档，平铺在 `docs/` 目录下
- **主题**: 自定义主题，继承 DefaultTheme，indigo 品牌色
- **部署**: 手动运行 `deploy.sh` 推送到 GitHub Pages `gh-pages` 分支
- **Frontmatter 模式**: 各文档 frontmatter 字段不完全一致（tags, aliases, author, version, description 等可选），但 `tags` 为数组格式 `[tag1, tag2]`

### 现有问题

- 文档全部平铺无子目录（随数量增长不可持续）
- `ignoreDeadLinks: true` 全局关闭了死链检测
- 无 CI/CD 管线
- hero 按钮指向不存在的 `/其他/` 路径

### 技术考虑

VitePress 本地搜索使用 MiniSearch，默认索引 title 和正文。需要将 frontmatter 中的 `tags` 纳入索引，并支持 `tag:` 前缀的特殊搜索逻辑。标签页需从所有文档的 frontmatter 中汇总生成。

## Constraints

- **搜索体验**: 必须保持 VitePress 原生搜索弹窗的交互风格，`tag:` 前缀的搜索行为应在同一个搜索框内完成
- **文档格式**: 不能破坏现有 frontmatter 格式，标签继续由 `tags` 数组字段维护
- **构建流程**: 不能增加复杂的外部依赖，维持静态站点特性

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 集成到现有 local search | 维持统一搜索体验，避免多入口 | — Pending |
| tag: 前缀触发纯标签搜索 | 与普通搜索意图分离，语义清晰 | — Pending |
| 标签页用静态生成 | 构建时从 frontmatter 提取，无需运行时计算 | — Pending |
| 空格分隔多标签做交集 | 精准筛选，避免结果膨胀 | — Pending |

---
*Last updated: 2026-07-05 after initialization (roadmap created)*
