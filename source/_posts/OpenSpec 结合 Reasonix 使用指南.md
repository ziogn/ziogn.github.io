---
title: OpenSpec 结合 Reasonix 使用指南
date: "2026-08-21 22:45"
updated: "2026-08-21 23:00"
tags: [openspec, reasonix, spec-driven-development, ai-agents, 使用指南]
description: "OpenSpec 规范驱动开发框架与 Reasonix AI 编码代理的结合使用指南：三种集成方案、OPSX 工作流与端到端实战"
version: 0.0.1
author: ziogn
aliases: [OpenSpec Reasonix 集成, OpenSpec 与 Reasonix]
source: "https://github.com/Fission-AI/OpenSpec"
---


# OpenSpec 结合 Reasonix 使用指南

## 1. 认识 OpenSpec

### 1.1 问题：含糊的 prompt 与失控的 agent

直接对 AI 编码代理说"帮我加个深色模式"，通常会得到一份方向大致正确、但细节处处需要返工的代码：主题变量散落各处、没有持久化、切换时闪白、验收标准完全靠猜。需求越复杂，这种"一次性 prompt 式开发"的返工成本越高——**人类和 AI 从未就"到底要构建什么"达成过一致，代码就已经写出来了**。

### 1.2 OpenSpec 的定位

OpenSpec（GitHub: Fission-AI/OpenSpec）是一个开源的、面向 AI 编码助手的**规范驱动开发（Spec-Driven Development, SDD）**框架：

- **AI 原生**：整个工作流就是为"AI 编码助手 + 人类审查"设计的
- **纯 Markdown**：所有规格、提案、任务都是 `.md` 文件，无数据库、无 API key、无锁定
- **轻量**：一个 npm 包 + 一个 `openspec/` 目录，不侵入你的项目结构
- **可移植**：specs 与变更历史不依赖任何厂商的 prompt 格式，切换编码代理不损失任何东西

它的核心心智模型只有一句话：

> **spec 引领，代码跟随（the spec leads, the code follows）。**

在动手写代码之前，人类与 AI 先通过提案（proposal）、规格（specs）、设计（design）、任务清单（tasks）四层产物对齐意图；实现阶段 AI 严格按照任务清单执行；完成后变更归档回主规格，规格成为持续演进的事实来源（source of truth）。

### 1.3 OpenSpec 解决什么

| 传统 AI 开发 | OpenSpec 工作流 |
|-------------|----------------|
| 一个含糊 prompt 直接写码 | 先写 proposal（为什么改）并经人类审查 |
| 验收全靠猜 | specs 中的 GIVEN/WHEN/THEN 场景即验收标准 |
| 任务边界模糊，agent 容易跑偏 | tasks.md 拆解为可勾选的原子任务 |
| 需求变更后代码与文档脱节 | spec delta 同步合并，归档后 specs 永远反映当前状态 |
| 换一个 agent 工具就得重新磨合 | 纯 Markdown + `openspec update` 即可迁移 |

OpenSpec 特别适合**既有代码库的增量开发**（bug 修复、功能迭代、重构），这也是多数项目的常态。一句话原型、纯探索性实验则可以跳过它，或先用 `/opsx:explore` 想清楚再决定。

## 2. 认识 Reasonix

Reasonix 是运行在终端与桌面的 AI 编码代理平台。要理解它如何与 OpenSpec 结合，只需要掌握它与本主题相关的三个机制（依据 Reasonix v1.31.1 官方指南）：

### 2.1 Skills：四类约定目录自动发现

Reasonix 按以下优先级发现项目级 skills（同名校名高优先级覆盖低优先级）：

```text
<workspace>/{.reasonix,.agents,.agent,.claude}/skills/
```

布局支持两种形式：`<name>/SKILL.md` 目录形式，或 `<name>.md` 扁平文件形式。技能被识别后即出现在会话的 `/skill` 列表与 Skills 索引中，可被 `/name`、`run_skill` 或自然语言调用。

**这一点是本文的核心前提**：`.agents/skills/` 正是 OpenSpec `--tools agents` 的写入位置——两者天然对齐，这是集成方案一的原理基础。

### 2.2 Commands：约定目录的 slash 模板

Reasonix 从约定 commands 目录加载 slash 命令模板，目录层级映射为命令名：

```text
git/commit.md  →  /git:commit
```

`dir/file.md` 的斜杠变为冒号。`.claude/commands/` 同样属于扫描范围，因此 OpenSpec 为 Claude Code 生成的 `opsx/*.md` 命令文件有被 Reasonix 识别的可能（见第 6 章验证方法）。

### 2.3 Instructions：AGENTS.md 自动载入

`REASONIX.md`、`AGENTS.md`、`CLAUDE.md`（及各自的 `*.local.md`）都是被识别的指令文件名，启动时自动折入 system prompt，按"用户全局 → 祖先目录 → 项目目录 → 项目本地"的优先级加载。这意味着项目顶部写什么约定，agent 每次会话都会看到。

### 2.4 本仓库实证

本文所在仓库（ziogn_doc）的 `.claude/skills/doc-do/SKILL.md` 就是通过 `.claude` 约定目录被 Reasonix 发现并出现在 `/` 命令列表中的——证明 Reasonix 确实扫描这些目录，而非仅理论支持。

## 3. 安装与初始化

### 3.1 环境要求

- Node.js **20.19.0 或更高**（检查：`node --version`）
- npm（随 Node 自带）

### 3.2 安装 CLI

```bash
npm install -g @fission-ai/openspec@latest
openspec --version
```

OpenSpec 会收集匿名的命令名与版本统计（telemetry），需要隐私可在安装后随时关闭：

```bash
openspec config set telemetry.enabled false
# 或环境变量：export OPENSPEC_TELEMETRY=0
```

### 3.3 初始化项目

进入你的代码项目根目录：

```bash
cd your-project
openspec init
```

交互式初始化会提示你选择 AI 工具（支持 30+ 工具）。若目标是结合 Reasonix，非交互方式更直接——选择 `agents`（vendor-neutral 共享目标，写入 `.agents/skills/`）：

```bash
openspec init --tools agents --force
```

`--force` 自动清理旧版本遗留文件而不打断脚本。初始化生成：

```text
your-project/
├── openspec/
│   ├── specs/          # 主规格（事实来源）
│   ├── changes/        # 活动变更
│   └── config.yaml     # 项目配置（上下文）
└── .agents/
    └── skills/
        └── openspec-*/ # OpenSpec 工作流技能（供 Reasonix 等 AGENTS.md 兼容工具读取）
```

### 3.4 配置项目上下文（重要）

`openspec/config.yaml` 用于声明技术栈、目录约定、编码规范，agent 在生成任何代码之前都会读到它：

```yaml
# openspec/config.yaml
project: your-project
description: 后台管理系统前端
stack:
  - React 18 + TypeScript
  - Vite
  - Tailwind CSS
conventions:
  - 组件放 src/components/，页面放 src/pages/
  - 使用 react-query 处理服务端状态
  - 提交信息遵循 Conventional Commits
```

上下文写得越清楚，proposal/spec/tasks 与最终代码的贴合度越高。

### 3.5 验证初始化

```bash
openspec list          # 空列表即正常（还没有 change）
openspec validate --all --json   # 全量校验（JSON 输出，agent 友好）
```

## 4. OpenSpec 核心概念

### 4.1 双层目录：specs 与 changes

`openspec/` 下永远存在两个世界：

| 目录 | 含义 | 内容 |
|------|------|------|
| `openspec/specs/` | **事实来源**：系统当前应该是什么样 | 按模块整理的 spec 文件（Requirement + Scenario） |
| `openspec/changes/` | **提议变更**：正在评审/实现中的改动 | 每个变更一个子目录，含 proposal/spec delta/design/tasks |

`changes/` 里的 spec 是**增量（delta）**，使用 `ADDED / MODIFIED / REMOVED / RENAMED` 标记描述"相对主规格要改什么"；完成后经 sync 合并进 `specs/`，再归档到 `changes/archive/YYYY-MM-DD-<name>/` 保留审计轨迹。

### 4.2 Change 生命周期（spec-driven schema）

一次变更（change）走完以下产物链：

```text
proposal.md  为什么改（动机、目标、非目标）
    ↓
specs/*.md   改成什么样（Requirement + GIVEN/WHEN/THEN 场景 = 验收标准）
    ↓
design.md    怎么改（技术方案、模块影响）
    ↓
tasks.md     动手清单（1.1 / 1.2 / 2.1 编号，实现时逐项勾选）
    ↓
apply → verify → sync → archive
```

一个典型 change 目录：

```text
openspec/changes/add-dark-mode/
├── .openspec.yaml        # 变更元数据（schema、创建日期）
├── proposal.md           # 为什么改
├── specs/
│   └── ui/spec.md        # delta：ADDED 深色模式需求的场景
├── design.md             # 技术方案：CSS 变量 + localStorage 持久化
└── tasks.md              # 1.1 创建 ThemeContext；1.2 添加 CSS 变量；...
```

任务清单格式（tasks.md 实现时由 agent 勾选）：

```markdown
## 1. 主题状态

- [ ] 1.1 创建 ThemeContext，提供主题状态与切换方法
- [ ] 1.2 接入 localStorage 持久化用户选择

## 2. 样式

- [ ] 2.1 定义深色模式 CSS 变量
- [ ] 2.2 切换组件绑定 ThemeContext
```

### 4.3 验收标准：GIVEN/WHEN/THEN 场景

spec 中的每个 Requirement 都配 Scenario，这是 AI 实现与人类验收的共同依据：

```markdown
## Requirement: 深色模式切换

### Scenario: 用户切换主题
- **GIVEN** 用户已打开应用
- **WHEN** 用户点击切换按钮选择深色模式
- **THEN** 页面立即应用深色主题
- **AND** 刷新页面后主题保持深色

### Scenario: 系统偏好
- **GIVEN** 用户系统为深色偏好且从未手动选择
- **WHEN** 应用首次加载
- **THEN** 应用自动使用深色主题
```

`openspec validate --strict` 会检查场景完整性——缺失的 GIVEN/WHEN/THEN 直接报错，从流程上堵住"需求没写清就开写"。

### 4.4 双通道：终端 CLI 与对话 OPSX

OpenSpec 有两类命令，运行在两个地方：

| 通道 | 形式 | 运行位置 | 用途 |
|------|------|---------|------|
| CLI | `openspec ...` | 终端 | 初始化、校验、浏览、归档等确定性操作 |
| OPSX | `/opsx:propose` 等 | AI 助手对话 | 由 agent 执行的规划/实现工作流 |

AI 代理在实现过程中主要与 CLI 交互（`openspec status --change <name> --json` 获取下一步指令、`openspec validate` 自检），OPSX 命令则把"走哪个流程"的编排交给了 agent 的技能/命令文件。本章"认识"就到这里，两类命令的具体用法在第 7、8 章实战中呈现。

## 5. 结合方案一：`.agents` 技能集成（推荐）

### 5.1 原理

OpenSpec 的 `agents` 工具 ID 是**厂商中立**目标：把工作流技能写入 `.agents/skills/openspec-*/SKILL.md`——这是被众多 AGENTS.md 兼容工具读取的共享根。而 Reasonix 的 skills 扫描目录恰好包含 `<workspace>/.agents/skills/`（见第 2 章）。二者零配置对齐。

额外收益：如果你同时使用其他支持 `.agents/skills` 的编码代理（如 Codex），一份技能树全部生效，无需为每个工具单独生成。

### 5.2 操作步骤

```bash
cd your-project
npm install -g @fission-ai/openspec@latest   # 首次安装
openspec init --tools agents --force         # 生成 .agents/skills/openspec-*/
```

检查产物：

```bash
ls .agents/skills/
# openspec-apply-change/  openspec-archive-change/  openspec-explore/
# openspec-propose/  openspec-sync-specs/  openspec-update-change/  ...
```

然后**在新的 Reasonix 会话中**（技能在会话启动时加载），`/` 命令列表或技能列表里应出现 `openspec-*` 系列。

### 5.3 技能名映射

core profile 默认生成 6 个技能，对应 OPSX 核心工作流：

| 技能名 | 对应命令 | 用途 |
|--------|---------|------|
| `openspec-explore` | `/opsx:explore` | 实现前先探讨：读代码、对比方案、把模糊想法收敛成计划 |
| `openspec-propose` | `/opsx:propose` | 一步创建 change 并生成 proposal/specs/design/tasks |
| `openspec-apply-change` | `/opsx:apply` | 按 tasks.md 逐项实现并勾选 |
| `openspec-update-change` | `/opsx:update` | 修订提案类产物并保持各文件一致（不改代码） |
| `openspec-sync-specs` | `/opsx:sync` | 把 delta spec 合并进主 specs（archive 会自动提示，一般无需手动） |
| `openspec-archive-change` | `/opsx:archive` | 归档已完成 change（含 sync 提示） |

扩展工作流（`openspec config profile` 启用后生成）：`openspec-new-change`、`openspec-continue-change`、`openspec-ff-change`、`openspec-verify-change`、`openspec-bulk-archive-change`、`openspec-onboard`。

### 5.4 调用方式

在 Reasonix 会话中，三种方式皆可：

```text
# 1. 斜杠技能调用
/openspec-propose add-dark-mode

# 2. 自然语言指定技能
请使用 openspec-propose 技能为"添加深色模式"创建变更提案

# 3. 直接描述意图（agent 自动选择合适技能）
为项目添加深色模式支持，走完整的 OpenSpec change 流程
```

### 5.5 注意事项

- `agents` 目标**只写技能、不生成命令文件**（无命令适配器），所以没有 `/opsx:xxx` 形式的对话命令——按技能名调用即可，行为是等价的
- OpenSpec **不会创建或修改 AGENTS.md**（旧版遗留的标记块会在 `openspec update` 时被清理）
- OpenSpec 只管理 `.agents/skills/` 下的 `openspec-*` 目录与 `.openspec-target` 标记文件，其余文件一律不动；但 `openspec update` 会**覆盖重写**技能目录内的内容，如需定制请复制到自有技能目录

## 6. 结合方案二：`.claude` 技能 + 命令集成

### 6.1 原理

`.claude` 同样在 Reasonix 的 skills 约定目录列表中（本仓库的 doc-do 技能即由此被发现）。选择 `claude` 工具 ID 会额外生成**对话命令文件**（`.claude/commands/opsx/*.md`），理论上可获得 `/opsx:xxx` 形式的命令入口。

```bash
openspec init --tools claude --force
```

生成物：

```text
.claude/
├── skills/
│   └── openspec-*/SKILL.md      # 同样的技能树
└── commands/
    └── opsx/
        └── propose.md / apply.md / archive.md ...   # OPSX 对话命令
```

### 6.2 在 Reasonix 中的可用性

- **技能部分**：`.claude/skills/openspec-*/` 与方案一相同，Reasonix 必然发现（已实证）
- **命令部分**：Reasonix 从约定 commands 目录加载 slash 模板，`.claude/commands/` 属于扫描范围；若生成文件为 `opsx/propose.md` 形式，命令名为 `/opsx:propose`
- **验证方法**：新会话中键入 `/` 查看命令列表是否出现 `opsx` 系列；未出现则说明当前版本 Reasonix 不扫描该子路径，退回技能调用或方案三

### 6.3 与方案一的权衡

| 维度 | 方案一 `.agents` | 方案二 `.claude` |
|------|-----------------|-----------------|
| 命令入口 | 无（按技能名调用） | 有 `/opsx:xxx`（待实测确认） |
| 多代理共享 | 优（Codex 等也读 `.agents`） | 仅 Claude 系 |
| Reasonix 发现性 | 官方文档明确 | 技能部分实证、命令部分待验证 |
| 与 OpenSpec 官方工具表 | `agents` 是专门为共享场景设计的目标 | `claude` 面向 Claude Code 集成 |

**建议**：追求稳妥与共享选方案一；如果你想优先尝试 `/opsx:` 命令形式且项目只用 Claude 系工具，选方案二；两者同时 `--tools agents,claude` 也是允许的（各自写各自目录）。

## 7. 结合方案三：CLI 对话驱动（兜底）

### 7.1 原理

OpenSpec 的技能文件本质是"告诉 agent 如何走流程"的提示工程。不生成任何技能文件，直接告诉 agent 按 OpenSpec 流程操作 CLI，同样能获得完整工作流——这对所有 AI 代理通用，也适合不想在仓库里增加技能文件的场景。

### 7.2 初始化

```bash
npm install -g @fission-ai/openspec@latest
cd your-project
openspec init --tools none --force   # 不生成任何工具集成文件
```

`openspec/` 目录照常创建，只是跳过工具配置。

### 7.3 会话提示词模板

在 Reasonix（或任何代理）会话中，用一段固定话术建立工作流约定（可写入项目 CLAUDE.md 使其长期生效）：

```text
本项目使用 OpenSpec 规范驱动开发。所有功能/修复/重构都按以下流程执行：

1. 先运行 `openspec new change <kebab-case-name>` 创建变更
2. 编写 proposal.md（动机与目标），等待我确认
3. 编写 specs/（Requirement + GIVEN/WHEN/THEN 场景）、design.md、tasks.md
4. 运行 `openspec validate --strict` 校验，通过后等待我确认
5. 按 tasks.md 逐项实现，每完成一项勾选 [x]，实现期间可运行 `openspec status --change <name> --json` 确认进度
6. 全部完成运行 `openspec validate --all`，然后执行 `openspec archive <name>`（归档前询问我是否 sync）
```

关键命令速查（agent 模式全部支持 `--json` 输出）：

| 命令 | 用途 |
|------|------|
| `openspec list` | 查看全部 changes/specs |
| `openspec show <name>` | 查看某个 change 内容 |
| `openspec status --change <name>` | 查看产物完成状态与下一步 |
| `openspec validate <name>` / `--strict` | 校验变更完整性 |
| `openspec instructions --change <name>` | 获取"下一步该创建什么"的指令 |
| `openspec new change <name>` | 创建变更骨架 |
| `openspec archive <name>` / `--yes` | 归档变更（非交互需 `--yes`） |

### 7.4 适用场景

- 临时/一次性项目，不想留下 `.agents` 或 `.claude` 目录
- CI 流水线或脚本化流程（agent 通过命令行驱动）
- 你的代理工具暂不支持技能目录，且不想手工移植
- 团队想统一"流程约定写在 CLAUDE.md"的单一事实来源

## 8. 端到端实战：一个完整 change

以"为现有 Web 项目添加深色模式"为例，走通结合方案一（`.agents` 技能）+ Reasonix 的全流程。

### 8.1 Explore：先想清楚（可选）

```text
你: /openspec-explore
    我们想支持深色模式，但不确定用 CSS 变量还是 Tailwind dark 类，帮我调研现有样式结构
AI: 读取代码后给出对比与建议，并提示可 /openspec-propose 开启变更
```

### 8.2 Propose：创建变更与规划产物

```text
你: /openspec-propose add-dark-mode
AI: Created openspec/changes/add-dark-mode/
    ✓ proposal.md   （为什么改、目标、非目标）
    ✓ specs/ui/spec.md  （ADDED 深色模式需求 + 3 个场景）
    ✓ design.md     （CSS 变量方案 + localStorage 持久化）
    ✓ tasks.md      （1.1 ThemeContext / 1.2 持久化 / 2.1 CSS 变量 / 2.2 切换组件）
    Ready for implementation. Run /openspec-apply-change.
```

此时**一行代码都还没写**。你逐份 review 四个文件，发现遗漏就 `/openspec-update-change` 修订；确认无误后校验：

```bash
openspec validate add-dark-mode --strict
# ✓ proposal, specs, design, tasks 全部有效
```

### 8.3 Apply：按任务实现

```text
你: /openspec-apply-change add-dark-mode
AI: 读取 tasks.md，逐项实现并勾选：
    Working on 1.1: 创建 ThemeContext ...   [x] 1.1
    Working on 1.2: localStorage 持久化 ... [x] 1.2
    Working on 2.1: 定义深色 CSS 变量 ...   [x] 2.1
    Working on 2.2: 切换组件绑定 ...        [x] 2.2
    运行 npm test -- --run 通过，无回归
```

中途被打断也没关系，重新调用时 agent 会从 tasks.md 未勾选项续做。

### 8.4 Verify + Archive：校验并归档

```text
你: /openspec-verify-change add-dark-mode
AI: COMPLETENESS ✓ 4/4 任务完成 ✓ 场景已覆盖
    CORRECTNESS  ✓ 实现符合 spec 意图（警告：系统偏好场景无单测覆盖）
    COHERENCE    ✓ 与 design.md 一致
    Critical: 0  Warnings: 1

你: /openspec-archive-change add-dark-mode
AI: 检测到 delta specs 未同步 → 已合并进 openspec/specs/ui/spec.md
    ✓ 变更归档至 openspec/changes/archive/2026-08-21-add-dark-mode/
```

归档后主 specs 即反映"项目已支持深色模式"，后续任何 change 都以它为基线。

### 8.5 全程命令轨迹（终端视角）

```bash
openspec list                                   # 查看活动 changes
openspec show add-dark-mode                     # 查看产物内容
openspec status --change add-dark-mode          # 查看进度
openspec validate --all                         # 全量校验
git add openspec/ && git commit -m "feat: dark mode (spec)"   # 随代码一起提交
```

## 9. 最佳实践与注意事项

### 9.1 写清楚 config.yaml

项目上下文（技术栈、目录约定、规范）是 AI 生成贴合代码的前提。它比任何 prompt 都稳定——每个 change 的每个产物都会引用它。

### 9.2 始终显式指定 change 名

`/openspec-apply-change add-dark-mode` 优于不带名的调用。多变更并行时，带名调用不会误伤其他 change，agent 也无需猜上下文。

### 9.3 并行 change 与 spec 冲突

多个并行 change 同时改动同一模块的 spec 时，归档顺序决定合并结果。`openspec-bulk-archive-change` 会检测冲突并检查真实代码后按创建顺序合并；手动归档前用 `openspec list` 确认没有互相冲突的活动变更。

### 9.4 archive 前的检查顺序

```text
openspec validate --strict  →  /openspec-verify-change  →  /openspec-archive-change
```

validate 保证规格完整，verify 检查实现与规格一致（警告不阻塞归档，但建议处理），archive 自动完成 sync。

### 9.5 让 agent 用好 agent 模式命令

status / instructions / show / list 都支持 `--json`，agent 解析结构化输出比读终端文本可靠得多。在方案三的提示词模板中显式要求 agent 使用 `--json`。

### 9.6 环境变量与隐私

| 变量 | 作用 |
|------|------|
| `OPENSPEC_TELEMETRY=0` / `DO_NOT_TRACK=1` | 关闭匿名统计 |
| `OPENSPEC_NO_UPDATE_CHECK` | 关闭 CLI 更新检查（CI 场景） |
| `OPENSPEC_NO_ANIMATION` | 关闭 init 欢迎动画 |
| `CI=true` | 自动禁用 telemetry 与更新检查 |

### 9.7 不想被覆盖的内容

`openspec update` 只重写 OpenSpec 自己生成的目录与标记；技能文件里的定制会被覆盖，请把定制技能复制到独立目录（如 `.reasonix/skills/` 或你的自有 skills 路径）。

### 9.8 常见报错排查

| 报错 | 原因 | 处理 |
|------|------|------|
| `Change not found` | 未识别 change 名 | 显式带名调用；`openspec list` 确认目录存在 |
| `Commands not recognized` | 技能/命令未被代理加载 | 确认 `openspec init` 成功；`openspec update` 重生成；重启代理会话 |
| `Schema not found` | 指定的 workflow schema 不存在 | `openspec schemas` 查看可用列表 |
| `No artifacts ready` | 产物依赖未满足 | `openspec status --change <name>` 查看阻塞项 |
| validate 报场景缺失 | GIVEN/WHEN/THEN 不全 | 按 `--strict` 提示补全场景 |

## 10. 相关资源与进阶方向

### 10.1 官方文档

- 快速上手：`openspec init` 后的终端提示即入门引导
- CLI 参考：[docs/cli.md](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md)
- OPSX 命令参考：[docs/commands.md](https://github.com/Fission-AI/OpenSpec/blob/main/docs/commands.md)
- 工具集成表：[docs/supported-tools.md](https://github.com/Fission-AI/OpenSpec/blob/main/docs/supported-tools.md)
- 工作流模式：[docs/workflows.md](https://github.com/Fission-AI/OpenSpec/blob/main/docs/workflows.md)

### 10.2 进阶方向

- **Stores**：独立的 OpenSpec 仓库作为跨仓库规格源——平台团队拥有 specs，各代码仓库只读引用，消除 wiki 漂移
- **Workset**：个人工作视图，把分散在多处的内容组装进一个临时目录
- **自定义 Schema**：`openspec schema init/fork` 创建你自己的产物类型与模板，定制团队流程
- **多代理切换**：specs/changes 是纯 Markdown，`openspec update` 即可在任意支持工具间迁移

### 10.3 与既有工作流的衔接

OpenSpec 的"先对齐再实现"与任务拆解思路，可以和你已有的工作流管理系统（如 GSD、doc-do 一类文档工作流）互补：OpenSpec 管代码库内变更的规格与验收，文档工作流管知识库文档的生命周期。二者都以 Markdown 为事实来源，边界清晰、互不冲突。