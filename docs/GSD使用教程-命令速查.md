---
title: GSD 使用教程 - 命令速查
created: 2026-04-25 10:00
updated: 2026-06-04 05:30
version: 2.2.0
author: ziogn
source: https://github.com/open-gsd/gsd-core
tags: [GSD, 项目工作流, Claude Code, AI编程, OpenCode, 命令速查]
aliases: [GSD教程, Get-Shit-Done教程, gsd教程, GSD命令手册]
description: GSD 完整命令速查表，覆盖 v1.35.0+ 全部命令、命名空间元技能、旧命令迁移与新特性
---

# GSD 使用教程 - 命令速查

> 本手册覆盖 GSD 项目内部版本 v1.35.0+（预发布 v1.43.0-rc2），从 v1.6.0 全面更新。命令体系经历大幅重构：新增 7 个统一命令、6 个命名空间元技能、25+ 个旧命令被合并或移除。
>
> **版本号说明**：v1.35.0+ 为项目内部版本号（对应旧包 `get-shit-done-cc`），新包 `@opengsd/gsd-core` 采用独立版本号体系（当前 latest 为 1.2.0，但代码已包含 v1.35.0+ 的全部特性）。

## 目录

1. [概述与仓库迁移](#1-概述与仓库迁移)
2. [命名空间元技能速查](#2-命名空间元技能速查)
3. [旧命令迁移对照表](#3-旧命令迁移对照表)
4. [新命令详解](#4-新命令详解)
5. [现有命令新增标志速查](#5-现有命令新增标志速查)
6. [Package Legitimacy Gate](#6-package-legitimacy-gate)
7. [跨 AI 评审](#7-跨-ai-评审)
8. [MVP 与 TDD 规划模式](#8-mvp-与-tdd-规划模式)
9. [多运行时支持](#9-多运行时支持)
10. [版本演进关键里程碑](#10-版本演进关键里程碑)
11. [附录：快速命令索引](#11-附录快速命令索引)

---

## 1. 概述与仓库迁移

### 版本跨度

| 项目 | 旧值 | 新值 |
|------|------|------|
| 项目内部版本 | v1.6.0 | v1.35.0（稳定）/ v1.43.0-rc2（预发布） |
| 仓库 | `gsd-build/get-shit-done` | `open-gsd/gsd-core` |
| npm 包名 | `get-shit-done-cc` | `@opengsd/gsd-core` |

### 安装命令

```bash
# 新安装方式
npx @opengsd/gsd-core@latest

# 旧包名已废弃（deprecated），建议切换到 @opengsd/gsd-core
npx get-shit-done-cc@latest
```

### 仓库迁移说明

旧仓库 `gsd-build/get-shit-done` 已归档并重定向到 `open-gsd/gsd-core`。所有 Issue 和 PR 已迁移。旧包名 `get-shit-done-cc` 已标记 deprecated，建议切换到 `@opengsd/gsd-core`。

---

## 2. 命名空间元技能速查

> v1.40 引入。6 个命名空间路由器将技能列表的 token 成本从 ~2,150 降至 ~120。**叠加式设计** -- 所有原有命令仍可直接调用。

| 命令 | 路由到 | 典型场景 |
|------|--------|----------|
| `/gsd-workflow` | discuss / plan / execute / verify / phase / progress | 阶段流水线操作 |
| `/gsd-project` | milestones / audits / summary | 项目生命周期管理 |
| `/gsd-quality` | code-review / debug / audit / security / eval / ui | 质量门禁 |
| `/gsd-context` | map / graphify / docs / learnings | 代码库智能 |
| `/gsd-manage` | config / workspace / workstreams / thread / update / ship / inbox | 管理操作 |
| `/gsd-ideate` | explore / sketch / spike / spec / capture | 探索与捕获 |

```bash
# 命名空间路由器调用示例
/gsd-workflow          # 自动路由到 discuss/plan/execute/verify
/gsd-quality           # 自动路由到 code-review/debug/audit
/gsd-ideate            # 自动路由到 explore/sketch/spike
```

---

## 3. 旧命令迁移对照表

共 25+ 个命令被合并或移除，按功能分为 6 组。

### 3.1 工作空间命令合并

| 旧命令 | 新命令 | 说明 |
|--------|--------|------|
| `/gsd-new-workspace` | `/gsd-workspace --new` | 合并到统一工作空间命令 |
| `/gsd-list-workspaces` | `/gsd-workspace --list` | 合并到统一工作空间命令 |
| `/gsd-remove-workspace` | `/gsd-workspace --remove <name>` | 合并到统一工作空间命令 |

### 3.2 阶段管理命令合并

| 旧命令 | 新命令 | 说明 |
|--------|--------|------|
| `/gsd-add-phase` | `/gsd-phase "description"` | 合并到统一阶段命令 |
| `/gsd-insert-phase N` | `/gsd-phase --insert N` | 合并到统一阶段命令 |
| `/gsd-remove-phase N` | `/gsd-phase --remove N` | 合并到统一阶段命令 |
| `/gsd-list-phase-assumptions` | `/gsd-discuss-phase N --assumptions` | 变为 discuss-phase 的标志 |

### 3.3 配置命令合并

| 旧命令 | 新命令 | 说明 |
|--------|--------|------|
| `/gsd-settings` | `/gsd-config` | `/gsd-config` 为新增的统一配置命令，`/gsd-settings` 仍可用但建议迁移 |
| `/gsd-settings-advanced` | `/gsd-config --advanced` | 合并到统一配置命令 |
| `/gsd-settings-integrations` | `/gsd-config --integrations` | 合并到统一配置命令 |
| `/gsd-set-profile` | `/gsd-config --profile <name>` | 合并到统一配置命令 |

### 3.4 捕获命令合并

| 旧命令 | 新命令 | 说明 |
|--------|--------|------|
| `/gsd-note` | `/gsd-capture --note` | 合并到统一捕获命令 |
| `/gsd-add-todo` | `/gsd-capture "description"` | 合并到统一捕获命令 |
| `/gsd-check-todos` | `/gsd-capture --list` | 合并到统一捕获命令 |
| `/gsd-add-backlog` | `/gsd-capture --backlog` | 合并到统一捕获命令 |
| `/gsd-plant-seed` | `/gsd-capture --seed` | 合并到统一捕获命令 |

### 3.5 其他命令迁移

| 旧命令 | 新命令 | 说明 |
|--------|--------|------|
| `/gsd-research-phase` | `/gsd-plan-phase --research-phase N` | 变为 plan-phase 的模式标志 |
| `/gsd-reapply-patches` | `/gsd-update --reapply` | 变为 update 的标志 |
| `/gsd-scan` | `/gsd-map-codebase --fast` | 合并到 map-codebase |
| `/gsd-do` | `/gsd-progress --do "task"` | 变为 progress 的标志 |
| `/gsd-join-discord` | `/gsd-help` 中显示链接 | 不再是独立命令 |

### 3.6 新增统一命令替代的旧技能

以下 4 个旧命令已被合并到新命令的标志中：

| 旧命令 | 新命令 | 说明 |
|--------|--------|------|
| `/gsd-edit-phase` | `/gsd-phase --edit N` | 合并到统一阶段命令 |
| `/gsd-sketch-wrap-up` | `/gsd-sketch --wrap-up` | 变为 sketch 的标志 |
| `/gsd-spike-wrap-up` | `/gsd-spike --wrap-up` | 变为 spike 的标志 |
| `/gsd-code-review-fix` | `/gsd-code-review --fix --auto` | 变为 code-review 的标志 |

---

## 4. 新命令详解

### 4.1 /gsd-workspace

统一工作空间管理，替代原来三个独立命令（`/gsd-new-workspace`、`/gsd-list-workspaces`、`/gsd-remove-workspace`）。用于创建隔离的开发环境，每个工作空间包含独立的 `.planning/` 目录和仓库副本，适合多特性并行开发或多项目并管。

| 标志 | 说明 |
|------|------|
| `--new` | 创建新工作空间 |
| `--list` | 列出所有活跃工作空间 |
| `--remove <name>` | 移除指定工作空间 |
| `--name <name>` | 指定工作空间名称 |
| `--repos <list>` | 指定关联仓库 |
| `--path <path>` | 指定工作空间路径 |
| `--strategy <type>` | 工作空间策略 |
| `--branch <name>` | 指定分支 |
| `--auto` | 自动配置 |

```bash
/gsd-workspace --new --name feature-x --repos "repo-a,repo-b"
/gsd-workspace --list
/gsd-workspace --remove feature-x
```

### 4.2 /gsd-phase

统一阶段 CRUD 管理，替代原来三个独立命令（`/gsd-add-phase`、`/gsd-insert-phase`、`/gsd-remove-phase`）。直接操作 `ROADMAP.md` 中的阶段定义，支持追加、插入、移除和编辑阶段条目。

| 标志 | 说明 |
|------|------|
| `"description"` | 追加新阶段（默认行为） |
| `--insert N` | 在第 N 阶段后插入 |
| `--remove N` | 移除第 N 阶段 |
| `--edit N` | 编辑第 N 阶段 |
| `--force` | 强制操作 |

```bash
/gsd-phase "Add user authentication"
/gsd-phase --insert 3 --force
/gsd-phase --remove 5
```

### 4.3 /gsd-mvp-phase

引导式 MVP 规划命令，适用于需要快速验证核心功能的早期阶段。执行流程：交互式收集用户故事 → 运行 SPIDR（Splitting）拆分检查，确保需求粒度过关 → 在 `ROADMAP.md` 中写入 `Mode: mvp` 标记 → 最终委托给 `/gsd-plan-phase` 生成详细执行计划。与直接使用 `--mvp` 标志的区别在于增加了交互式故事收集和拆分检查两个前置步骤。

```bash
/gsd-mvp-phase 1
```

### 4.4 /gsd-config

统一配置管理命令，整合了原来三个独立配置命令（`/gsd-settings`、`/gsd-settings-advanced`、`/gsd-settings-integrations`）和配置切换命令（`/gsd-set-profile`）。支持交互式配置和标志式配置两种模式，是调整 GSD 运行时行为的统一入口。

| 标志 | 说明 |
|------|------|
| `--advanced` | 高级配置（原 settings-advanced） |
| `--integrations` | 第三方集成配置（原 settings-integrations） |
| `--profile <name>` | 切换配置（原 set-profile） |

```bash
/gsd-config                  # 交互式基本配置
/gsd-config --advanced       # 高级配置
/gsd-config --integrations   # 集成配置
/gsd-config --profile budget # 切换到 budget 配置
```

### 4.5 /gsd-surface

管理 GSD 技能的表面层（Surface Layer），控制各个技能的启用/禁用状态。技能表面层是 GSD 的插件化体系，通过启用或禁用特定技能来调整 AI 助手的能力集，减少不必要技能的 token 开销。

| 子命令 | 说明 |
|--------|------|
| `list` | 列出所有技能 |
| `status` | 显示技能状态 |
| `profile` | 显示当前配置 |
| `disable <skill>` | 禁用技能 |
| `enable <skill>` | 启用技能 |
| `reset` | 重置为默认 |

```bash
/gsd-surface list
/gsd-surface disable code-review
/gsd-surface enable code-review
/gsd-surface reset
```

### 4.6 /gsd-fast

极简内联任务执行模式，无子代理生成、无规划开销、无上下文备份。直接在当前上下文中执行任务，适用于不需要完整 GSD 工作流的轻量操作。典型场景：拼写修正、配置文件更改、简单重构、快速文件搜索等。与普通 GSD 命令相比，/gsd-fast 不创建阶段、不写入 .planning/ 目录，执行完毕即结束，token 开销极低。

```bash
/gsd-fast "Fix typo in README.md"
/gsd-fast "Update copyright year to 2026"
```

### 4.7 /gsd-capture

统一捕获命令，整合了原来五个独立捕获命令（`/gsd-add-todo`、`/gsd-note`、`/gsd-plant-seed`、`/gsd-add-backlog`、`/gsd-check-todos`）。用于在开发过程中快速记录想法、待办事项、远期需求和前瞻性思路，所有捕获项持久化保存，支持跨项目全局捕获。

| 标志 | 说明 |
|------|------|
| `"description"` | 添加待办（默认行为） |
| `--note "text"` | 添加笔记 |
| `--backlog "text"` | 添加到积压 |
| `--seed "text"` | 捕获前瞻性想法（带触发条件） |
| `--list` | 列出所有捕获项 |
| `--global` | 跨项目全局捕获 |

```bash
/gsd-capture "Add dark mode support"
/gsd-capture --note "Consider caching strategy"
/gsd-capture --backlog "GraphQL API layer"
/gsd-capture --seed "Add real-time when WebSocket ready"
/gsd-capture --list
```

---

## 5. 现有命令新增标志速查

### 5.1 /gsd-discuss-phase

`/gsd-discuss-phase` 是 GSD 工作流的第一个核心步骤，在规划阶段前通过自适应提问捕获实现决策。它像一位资深架构师一样追问细节，将模糊需求转化为明确的上下文记录，写入 `{phase}-CONTEXT.md`。新增标志使讨论过程更加灵活可控。

| 标志 | 说明 |
|------|------|
| `--all` | 跳过区域选择，交互式讨论所有灰色地带 |
| `--auto` | 自动选择推荐默认值 |
| `--batch` | 批量提问模式 |
| `--analyze` | 讨论中加入权衡分析 |
| `--power` | 基于文件的批量回答 |
| `--assumptions` | 展示 Claude 的实现假设（非交互式） |

```bash
/gsd-discuss-phase 1 --all --analyze
/gsd-discuss-phase 2 --assumptions
```

### 5.2 /gsd-plan-phase

`/gsd-plan-phase` 是 GSD 工作流的规划核心，对指定阶段进行研究、任务分解和验证。它读取 discuss-phase 产出的 `{phase}-CONTEXT.md`，运行领域研究，生成原子化任务计划（写入 `{phase}-PLAN.md`），并通过计划检查器验证。新增标志支持 PRD/ADR 输入、MVP/TDD 模式、外部评审反馈纳入等多种扩展能力。

| 标志 | 说明 |
|------|------|
| `--research-phase N` | 纯研究模式（替代已删除的 `/gsd-research-phase`） |
| `--view` | 配合 `--research-phase`，打印现有 RESEARCH.md |
| `--prd <file>` | 使用 PRD 文件替代 discuss-phase |
| `--ingest <path-or-glob>` | 使用 ADR 文件替代 discuss-phase |
| `--ingest-format <auto\|nygard\|madr\|narrative>` | ADR 解析器格式覆盖 |
| `--reviews` | 使用 REVIEWS.md 中的跨 AI 评审反馈重新规划 |
| `--validate` | 规划前运行状态验证 |
| `--bounce` | 规划后运行外部 bounce 验证 |
| `--skip-bounce` | 跳过 plan bounce |
| `--mvp` | 垂直 MVP 模式（UI->API->DB 特性切片） |
| `--tdd` | TDD 模式（行为添加任务以失败测试开始） |
| Package Legitimacy Gate | v1.42.1: 研究员推荐外部包时自动运行 slopcheck 验证 |

```bash
/gsd-plan-phase 1 --research-phase 1 --view
/gsd-plan-phase 2 --prd docs/prd.md
/gsd-plan-phase 3 --mvp --tdd
/gsd-plan-phase 4 --reviews --bounce
```

### 5.3 /gsd-execute-phase

`/gsd-execute-phase` 负责执行阶段中所有已规划的任务，采用波浪式并行化（Wave Parallelization）策略——将无依赖的任务放入同一波并行执行，依赖链的任务分波串行。每个子任务在独立子代理中运行，拥有专属上下文空间。新增标志提供了执行前验证和跨 AI 执行能力。

| 标志 | 说明 |
|------|------|
| `--validate` | 执行前运行状态验证 |
| `--cross-ai` | 委托给外部 AI CLI 执行 |
| `--no-cross-ai` | 强制本地执行 |

```bash
/gsd-execute-phase 1 --validate
/gsd-execute-phase 2 --cross-ai
/gsd-execute-phase 3 --no-cross-ai --wave 2
```

### 5.4 /gsd-progress

`/gsd-progress` 是 GSD 的状态查询和导航中枢，显示当前项目进度、已完成阶段和下一步建议。新增标志提供了自动推进（`--next`）、智能路由（`--do`）和完整性审计（`--forensic`）三种增强模式，使其从单纯的进度查看器升级为工作流指挥中心。

| 标志 | 说明 |
|------|------|
| `--next` | 自动推进到下一个逻辑工作步骤 |
| `--do "task"` | 分析自由文本意图并路由到最合适的 GSD 命令 |
| `--forensic` | 标准报告 + 6 项完整性审计 |

```bash
/gsd-progress
/gsd-progress --next
/gsd-progress --do "review phase 2"
/gsd-progress --forensic
```

### 5.5 /gsd-debug

`/gsd-debug` 提供了系统化的调试能力，跟踪每个调试会话的持久化状态。相比于直接在上下文中提问调试，它维护独立的调试会话记录（支持 list/status/continue），允许跨会话回溯。新增标志和 TDD 模式使调试过程更加结构化和可复现。

| 子命令/标志 | 说明 |
|-------------|------|
| `list` | 列出所有活跃调试会话 |
| `status <slug>` | 显示会话摘要 |
| `continue <slug>` | 恢复特定会话 |
| `--diagnose` | 仅诊断模式（不尝试修复） |
| TDD 模式 | `config.json` 中 `tdd_mode: true` 时，调试会话要求先写失败测试 |

```bash
/gsd-debug "Login button not responding"
/gsd-debug list
/gsd-debug status login-bug
/gsd-debug continue login-bug
/gsd-debug "API timeout" --diagnose
```

### 5.6 /gsd-code-review

`/gsd-code-review` 对指定阶段的变更代码进行质量评审，查找 bug、安全漏洞和设计问题。新增深度级别控制（quick/standard/deep）和自动修复迭代功能（`--fix --auto`），支持最多 3 轮 修复→重新评审 循环，确保问题闭环。

| 标志 | 说明 |
|------|------|
| `--depth=quick\|standard\|deep` | 评审深度级别 |
| `--files file1,file2,...` | 显式文件列表 |
| `--fix --auto` | 修复 + 重新评审迭代循环（最多 3 次） |
| fallow 预检 | 可选的结构预检（`code_quality.fallow.enabled`） |

```bash
/gsd-code-review 3 --depth=deep
/gsd-code-review 3 --files src/auth.ts,src/middleware.ts
/gsd-code-review 3 --fix --auto
```

### 5.7 /gsd-map-codebase

`/gsd-map-codebase` 使用并行映射器代理分析代码库结构，生成可查询的代码库智能文件。新增标志提供了快速扫描模式（替代已删除的 `/gsd-scan`）和基于查询的智能搜索能力，是了解不熟悉代码库的首选入口。

| 标志 | 说明 |
|------|------|
| `--fast` | 快速单代理扫描（替代已删除的 `/gsd-scan`） |
| `--query <term>` | 搜索可查询的代码库智能文件 |
| `--focus` | `--fast` 模式的聚焦区域 |

```bash
/gsd-map-codebase auth
/gsd-map-codebase --fast --focus security
/gsd-map-codebase --query authentication
```

### 5.8 其他命令变更

| 命令 | 新增标志 | 说明 |
|------|----------|------|
| `/gsd-pause-work` | `--report` | 生成会话后摘要报告 |
| `/gsd-new-milestone` | `--reset-phase-numbers` | 重置新里程碑的阶段编号为 1 |
| `/gsd-health` | `--context` | 探测上下文窗口利用率（60% 警告，70% 临界） |
| `/gsd-spike` | `--quick` / `--wrap-up` | 跳过对话 / 将发现打包为项目本地技能 |
| `/gsd-sketch` | `--quick` / `--wrap-up` | 跳过对话 / 将草图决策打包为项目本地技能 |
| `/gsd-manager` | `--analyze-deps` | 扫描 ROADMAP 阶段依赖关系 |
| `/gsd-autonomous` | `--interactive` | 精简上下文，带用户输入 |
| `/gsd-update` | `--sync` / `--reapply` | 更新后同步技能 / 恢复本地修改 |
| `/gsd-help` | `--brief` / `--full` / `<topic>` | ~10 行摘要 / 完整参考 / 单节查询 |

```bash
/gsd-pause-work --report
/gsd-new-milestone "v2.0" --reset-phase-numbers
/gsd-health --context
/gsd-spike --quick "can we stream LLM tokens through SSE"
/gsd-sketch --wrap-up
/gsd-manager --analyze-deps
/gsd-autonomous --interactive --from 3 --to 5
/gsd-update --sync --reapply
/gsd-help --brief plan-phase
```

---

## 6. Package Legitimacy Gate

> v1.42.1 引入。当研究员推荐外部包时自动运行 slopcheck 验证，防止引入垃圾包或不合法依赖。

| 判定 | 含义 | 用户操作 |
|------|------|----------|
| `[OK]` | 包合法，可信赖 | 无需操作，继续使用 |
| `[SUS]` | 可疑，需人工确认 | 用户决定是否采用 |
| `[SLOP]` | 不合法 / 垃圾包 | 自动拒绝，需寻找替代方案 |

触发条件：`/gsd-plan-phase` 研究阶段中，当研究员推荐 npm/pip/cargo 等外部包时自动运行。

---

## 7. 跨 AI 评审

`/gsd-review` 支持将阶段计划委托给外部 AI CLI 进行同伴评审，获得多视角反馈。

### 支持的评审器

| 评审器 | 类型 |
|--------|------|
| Gemini | 云端 LLM |
| Codex | 云端 LLM |
| Cursor | IDE 内置 |
| Qwen Code | 本地/云端 |
| CodeRabbit | 自动评审平台 |
| Claude | 云端 LLM |
| OpenCode | 本地 CLI |
| Antigravity | 本地 CLI |
| Ollama | 本地运行时 |
| LM Studio | 本地运行时 |
| llama.cpp | 本地运行时 |

### 使用方式

```bash
/gsd-review --phase 3 --all          # 所有可用评审器
/gsd-review --phase 3 --reviewers gemini,codex  # 指定评审器
```

评审结果写入 `.planning/phases/XX/REVIEWS.md`，可通过 `/gsd-plan-phase --reviews` 将反馈纳入重新规划。

---

## 8. MVP 与 TDD 规划模式

### 8.1 MVP 模式

垂直切片策略：每个特性从 UI -> API -> DB 全栈实现，形成 Walking Skeleton。

```bash
/gsd-plan-phase 1 --mvp        # 为阶段 1 启用 MVP 模式
/gsd-mvp-phase 1               # 引导式 MVP 规划（交互式收集用户故事）
```

### 8.2 TDD 模式

行为添加任务以失败测试开始，强制测试先行。

```bash
/gsd-plan-phase 1 --tdd        # 为阶段 1 启用 TDD 模式
```

全局配置：在 `config.json` 中设置 `tdd_mode: true`。

### 8.3 组合用法

```bash
/gsd-plan-phase 1 --mvp --tdd  # MVP + TDD 组合
```

---

## 9. 多运行时支持

> v1.35.0+ 扩展了运行时支持。不同运行时的命令前缀和安装方式有差异。

| 运行时 | 命令前缀 | 安装方式 |
|--------|----------|----------|
| Claude Code | `/gsd-*` | `npx @opengsd/gsd-core` |
| OpenCode | `/gsd-*` | 内置 |
| Gemini CLI | `/gsd:*` | 内置 |
| Cline | 通过 `.clinerules` | 配置文件注入 |
| CodeBuddy | 自动检测 | `~/.codebuddy/` |
| Qwen Code | 自动检测 | `~/.qwen/skills/gsd-*/SKILL.md` |
| Kilo | `/gsd-*` | 内置 |
| Codex | `$gsd-*` | 内置 |
| Copilot | `/gsd-*` | 内置 |
| Cursor | `/gsd-*` | 内置 |
| Windsurf | `/gsd-*` | 内置 |

---

## 10. 版本演进关键里程碑

| 版本 | 日期 | 关键变更 |
|------|------|----------|
| v1.6.0 | 旧版 | 本文档最初基于的版本 |
| v1.33.0 | 2026 年 | 共享行为引用、配置重构、COMMANDS.md 更新 |
| v1.35.0 | 2026-06-02 | 新增运行时（Cline/CodeBuddy/Qwen Code）、新命令（/gsd-from-gsd2、/gsd-ai-integration-phase、/gsd-eval-review）、/gsd-review 增强 |
| v1.40.0 | 2026 年 | 命名空间元技能（6 个路由器）、上下文窗口利用率守卫 |
| v1.42.1 | 2026 年 | Package Legitimacy Gate（slopcheck 验证） |
| v1.43.0-rc2 | 2026-05-17 | 预发布：CJS-SDK 迁移、分层帮助输出、知识图谱自动更新、安全加固 |

---

## 11. 附录：快速命令索引

按字母顺序排列所有当前可用命令。

### A

| 命令 | 说明 |
|------|------|
| `/gsd-add-tests N` | 为已完成阶段 N 生成单元测试和集成测试用例 |
| `/gsd-ai-integration-phase` | AI 框架选择向导，为项目阶段集成 LLM/AI 功能模块 |
| `/gsd-manager --analyze-deps` | 扫描 ROADMAP 阶段依赖关系并建议 Depends on 条目 |
| `/gsd-audit-fix` | 审计 → 分类优先级 → 自动修复 → 原子提交一键闭环 |
| `/gsd-audit-milestone` | 验证里程碑是否满足 DoD（完成的定义）各维度标准 |
| `/gsd-audit-uat` | 跨所有阶段审计未完成的 UAT 和验证项，追踪剩余工作 |
| `/gsd-autonomous` | 自主按顺序执行所有未完成的剩余阶段，支持 --from/--to 范围控制 |

### C

| 命令 | 说明 |
|------|------|
| `/gsd-capture` | 统一捕获：todo/note/seed/backlog，支持 --global 跨项目 |
| `/gsd-cleanup` | 归档已完成里程碑积累的阶段目录，释放 .planning/ 空间 |
| `/gsd-code-review N` | 评审阶段 N 的变更代码，查找 bug、安全漏洞和设计问题 |
| `/gsd-code-review-fix N` | 自动修复 code-review 发现的问题，支持 --auto 迭代循环 |
| `/gsd-complete-milestone` | 归档完成里程碑并打 git 标签，标记版本发布点 |
| `/gsd-config` | 统一配置管理（原 settings 系列），支持 --profile 切换配置集 |

### D-E

| 命令 | 说明 |
|------|------|
| `/gsd-debug` | 持久化调试会话：list/status/continue，支持 --diagnose 纯诊断 |
| `/gsd-discuss-phase [N]` | 通过自适应提问收集阶段 N 的实现决策和上下文 |
| `/gsd-docs-update` | 生成或更新经过代码库验证的技术文档和 README |
| `/gsd-eval-review` | 回溯审计已实现 AI 阶段的评估覆盖率和缺口 |
| `/gsd-execute-phase N` | 执行阶段 N 计划，采用波浪式并行化多代理执行 |
| `/gsd-explore` | 苏格拉底式头脑风暴会议，通过追问引导想法深化 |
| `/gsd-extract-learnings` | 从已完成阶段工作中提取可复用模式写入 learnings |

### F-G-H

| 命令 | 说明 |
|------|------|
| `/gsd-fast` | 极简内联任务执行，无子代理无规划，适合拼写修正/小重构 |
| `/gsd-forensics` | GSD 工作流失败或卡住时的事后调查诊断工具 |
| `/gsd-from-gsd2` | 从 GSD-2 格式项目反向迁移回 GSD v1 格式 |
| `/gsd-graphify` | 构建和查询 .planning/graphs/ 项目知识图谱 |
| `/gsd-health` | 验证 .planning/ 目录完整性和配置文件一致性 |
| `/gsd-help` | 显示所有命令和使用指南，支持 --brief/--full/&lt;topic> 分级输出 |

### I-K-L-M

| 命令 | 说明 |
|------|------|
| `/gsd-import` | 将外部计划文件导入 GSD 规划系统，支持 --from 指定路径 |
| `/gsd-ingest-docs` | 扫描仓库已有文档，引导初始化或合并 .planning/ 目录 |
| `/gsd-intel` | 查询已生成的代码库智能文件，适合快速了解项目结构 |
| `/gsd-manager` | 交互式命令中心仪表盘，一站式管理多个阶段和操作 |
| `/gsd-map-codebase` | 使用并行映射器代理分析代码库，生成可查询的智能文件 |
| `/gsd-milestone-summary` | 从里程碑工件生成全面的项目阶段摘要报告 |
| `/gsd-mvp-phase` | 引导式 MVP 规划：收集用户故事 → SPIDR 拆分 → 委托规划 |

### N-P

| 命令 | 说明 |
|------|------|
| `/gsd-new-milestone` | 启动下一个版本里程碑周期，支持 --reset-phase-numbers |
| `/gsd-new-project` | 初始化新 GSD 项目，交互式收集项目上下文和规划文档 |
| `/gsd-next` | 自动分析当前状态并推进到下一个逻辑工作步骤 |
| `/gsd-pause-work` | 中途停止时保存上下文到 continue-here.md，支持 --report |
| `/gsd-phase` | 统一阶段 CRUD：追加/插入/移除/编辑 ROADMAP.md 阶段 |
| `/gsd-plan-milestone-gaps` | 根据审计缺口自动创建新阶段以关闭差距 |
| `/gsd-plan-phase N` | 研究、任务分解、规划并验证阶段 N 的执行计划 |
| `/gsd-plan-review-convergence` | plan → review → replan 迭代直至无 HIGH 问题 |
| `/gsd-pr-branch` | 通过过滤 .planning/ 提交创建干净的 PR 分支准备合并 |
| `/gsd-profile-user` | 从会话行为分析生成开发者配置 profile |
| `/gsd-progress` | 显示项目状态和下一步建议，支持 --next/--do/--forensic |

### Q-R-S

| 命令 | 说明 |
|------|------|
| `/gsd-quick` | 执行临时任务但保持 GSD 质量标准，适合小型一次性操作 |
| `/gsd-resume-work` | 从上次暂停的会话恢复完整上下文和工作进度 |
| `/gsd-review` | 跨 AI 同伴评审阶段计划，支持 --gemini/--claude/--all |
| `/gsd-review-backlog` | 评审积压项目并决定是否提升到活跃里程碑 |
| `/gsd-secure-phase` | 回溯验证已完成阶段的威胁缓解和安全措施 |
| `/gsd-session-report` | 生成当前会话的完整工作摘要报告 |
| `/gsd-ship N` | 从已完成阶段 N 的工作创建 PR 并运行预合并检查 |
| `/gsd-sketch` | 通过可弃用的 HTML 模拟快速探索 UI/UX 设计方向 |
| `/gsd-sketch-wrap-up` | 将获胜的草图设计决策打包为项目本地可复用技能 |
| `/gsd-spike` | 运行 2-5 个聚焦式技术可行性实验，评估方案 |
| `/gsd-spike-wrap-up` | 将完成的 spike 发现和技术决策打包为项目本地技能 |
| `/gsd-stats` | 显示 GSD 项目统计信息（阶段、任务、完成度） |
| `/gsd-surface` | 管理技能表面层：list/status/disable/enable/reset |

### T-U-W

| 命令 | 说明 |
|------|------|
| `/gsd-thread` | 管理跨会话工作的持久化上下文线程，保持长期上下文连续性 |
| `/gsd-ui-phase` | 为前端阶段生成 UI 设计契约和交互规范文档 |
| `/gsd-ui-review` | 回溯 6 支柱视觉审计已实现的前端，自动生成评估报告 |
| `/gsd-ultraplan-phase` | 将规划阶段的复杂任务委托给外部 AI CLI 执行 |
| `/gsd-undo` | 基于阶段清单的安全 git 回滚，支持 --last/--phase/--plan |
| `/gsd-update` | 更新 GSD 自身版本并预览变更日志，支持 --sync/--reapply |
| `/gsd-validate-phase` | 回溯审计阶段并填补 Nyquist 验证缺口 |
| `/gsd-verify-work` | 对已完成工作进行用户验收测试（UAT）并自动诊断问题 |
| `/gsd-workspace` | 统一管理工作空间：创建/列出/移除隔离开发环境 |
| `/gsd-workstreams` | 管理多个 GSD 项目的并行工作流进度 |

### 命名空间命令

| 命令 | 说明 |
|------|------|
| `/gsd-workflow` | 路由到阶段流水线：discuss/plan/execute/verify/phase/progress |
| `/gsd-project` | 路由到项目生命周期：milestones/audits/summary |
| `/gsd-quality` | 路由到质量门禁：code-review/debug/audit/security/eval/ui |
| `/gsd-context` | 路由到代码库智能：map/graphify/docs/learnings |
| `/gsd-manage` | 路由到管理操作：config/workspace/workstreams/thread/update/ship/inbox |
| `/gsd-ideate` | 路由到探索与捕获：explore/sketch/spike/spec/capture |
