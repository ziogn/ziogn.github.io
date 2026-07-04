# Phase 1: Tag Indexing in Search - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05
**Phase:** 1-Tag Indexing in Search
**Areas discussed:** Tags 索引实现路径, 搜索结果中标签展示, 中文标签搜索优化

---

## Tags 索引实现路径

| Option | Description | Selected |
|--------|-------------|----------|
| 自定义 Search Provider | 替换 VitePress local search provider，直接控制 MiniSearch 的 fields 配置 | ✓ |
| 构建时内容注入 | 利用 transformHtml 钩子注入隐藏元素 | |
| Markdown-it 插件 | 将 frontmatter tags 追加到内容末尾 | |
| 先用简单方案 | 先简单做，后续重构 | |

**User's choice:** 自定义 Search Provider
**Notes:** 
- 一次性搭建完整框架，为 Phase 2/3 预留扩展点
- 代码放在 `docs/.vitepress/search/` 独立目录
- MiniSearch 索引存储标签名称 + 关联文档元信息

## 搜索结果中标签展示

| Option | Description | Selected |
|--------|-------------|----------|
| 纯匹配，不额外展示 | 标签只影响匹配和排名 | ✓ |
| 摘要中显示标签 | 搜索结果摘要尾部显示「标签: xx」 | |
| 高亮匹配的标签 | 通过摘要文本高亮匹配 | |

**User's choice:** 纯匹配，不额外展示
**Notes:**
- 标签匹配权重略高，通过 MiniSearch boost 实现
- 不修改现有搜索 UI 渲染

## 中文标签搜索优化

| Option | Description | Selected |
|--------|-------------|----------|
| 不做处理 | 依赖 MiniSearch 默认行为 | ✓ |
| 引入分词库 | 构建时使用 jieba 分词 | |
| MiniSearch 自定义处理 | 通过 processTerm 统一处理 | |

**User's choice:** 不做处理，依赖 MiniSearch 默认行为
**Notes:**
- 英文标签统一转小写
- 连字符标签支持部分匹配
- 标签字段使用默认权重

## Claude's Discretion

- 自定义 Search Provider 的具体 API 实现方式
- MiniSearch boost 系数由实现者微调

## Deferred Ideas

None — discussion stayed within phase scope.
