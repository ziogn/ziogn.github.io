# Phase 5: 数据层扩展 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-10
**Phase:** 5-数据层扩展
**Areas discussed:** 数据层形态

---

## 数据层形态

| Option | Description | Selected |
|--------|-------------|----------|
| Composable + provide/inject | useTagFilter() composable，配合 provide/inject 让 TagCloudLayout 和 DocList 共享同一状态实例 | ✓ |
| 共享 reactive 模块 | 一个 .ts 模块导出共享的 ref(new Set())、computed 等响应式全局变量 | |

**User's choice:** Composable + provide/inject

## Composable 返回值范围

| Option | Description | Selected |
|--------|-------------|----------|
| 完整版：包括兼容标签计算 | selectedTags + toggleTag/clearTags + filteredDocs + compatibleTags | ✓ |
| 精简版：仅 AND 筛选 | selectedTags + toggleTag/clearTags + filteredDocs | |

**User's choice:** 完整版，包含兼容标签计算

## 文件位置

| Option | Description | Selected |
|--------|-------------|----------|
| theme/util/useTagFilter.ts | 与 tagChip.ts 同目录，方便管理 | ✓ |
| theme/composables/useTagFilter.ts | 新建 composables/ 目录 |

**User's choice:** theme/util/useTagFilter.ts

## Deferred Ideas

None.
