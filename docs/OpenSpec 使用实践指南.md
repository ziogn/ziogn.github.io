---
title: OpenSpec 使用实践指南
created: 2026-08-22 22:34
updated: 2026-08-22 23:02
version: 0.0.1
author: ziogn
source: https://github.com/Fission-AI/OpenSpec
tags: [openspec, spec-driven-development, ai-coding, 使用指南, 实践]
aliases: [OpenSpec 使用文档, OpenSpec 实践]
description: OpenSpec 规范驱动开发工具的完整使用实践：六大真实场景举例、Spec 写作与审查方法、进阶配置与 CLI 速查
---

# OpenSpec 使用实践指南

## 1. OpenSpec 是什么

OpenSpec 是一个开源的轻量级规范驱动开发（Spec-Driven Development）CLI 工具，作用是在你和 AI 编码助手之间建立一层"书面共识"：**在写任何代码之前，先把要构建什么用 Markdown 明确下来并达成一致。**

它解决的问题很具体——AI 编码助手即使理解错了需求，也会自信地把代码写完。当需求只存在于聊天记录里时，AI 只能靠猜填补空白，而你发现问题时代码已经存在了。OpenSpec 把"对齐"这个动作提前到写码之前：修改一段提案只需一分钟，返工 400 行代码则贵得多。

| 传统 AI 开发 | 用 OpenSpec 之后 |
|-------------|----------------|
| 含糊 prompt 直接出码 | 先生成 proposal/specs/tasks 并经你审查 |
| 验收标准靠猜 | 场景中的 GIVEN/WHEN/THEN 就是验收标准 |
| 中途改需求导致代码与意图脱节 | 直接编辑产物文件，AI 按最新计划继续 |
| 换 AI 工具就要重新磨合 | 纯 Markdown + `openspec update` 即可迁移 |

适用边界也明确：非平凡的改动都值得走一遍流程；真正的一行错别字修复不必动用它。

### 1.1 核心心智模型

掌握三个模型即可开始：

**两半命令。** OpenSpec 一套工具分两个执行位置：

- `openspec ...` 是终端命令（引擎），负责初始化项目、检视状态、校验与归档；
- `/opsx:*` 是斜杠命令（方向盘），输入位置是 **AI 编码助手的聊天框**，不是终端。

```text
        你的终端                              你的 AI 助手聊天框
   ┌──────────────────┐              ┌────────────────────────────┐
   │  $ openspec init │   安装命令    │  /opsx:propose add-dark-mode│
   │  $ openspec list │  ──────────► │  /opsx:apply                │
   │  $ openspec view │              │  /opsx:archive              │
   └──────────────────┘              └────────────────────────────┘
```

把 `/opsx:propose` 敲进终端不会有任何反应——这是新手最常见的困惑。

**两大目录。** 初始化后项目里多出一个 `openspec/` 目录，其中 `specs/` 是事实来源（描述系统当前行为），`changes/` 存放进行中的变更（每个变更一个文件夹）。变更完成归档时，其规格差异合并回 `specs/`。

**动作而非阶段。** OpenSpec 现行标准工作流叫 OPSX：proposal → specs → design → tasks 的依赖关系只表示"什么成为可能"，不是强制关卡。实现中途发现设计错了？直接改 `design.md` 继续干，没有"回到规划阶段"的仪式。

## 2. 安装与初始化

### 2.1 安装 CLI

要求 Node.js 20.19.0 或更高版本（`node --version` 确认）。任选一种包管理器全局安装：

```bash
npm install -g @fission-ai/openspec@latest
```

```bash
pnpm add -g @fission-ai/openspec@latest
```

```bash
bun add -g @fission-ai/openspec@latest
```

验证安装（本文撰写时最新稳定版为 1.10.0）：

```bash
openspec --version
```

如果安装成功但提示 `command not found`，通常是全局 bin 目录不在 PATH 里，运行 `npm prefix -g` 找到位置后加入 PATH。

### 2.2 openspec init

进入项目目录执行初始化：

```bash
cd your-project
openspec init
```

init 会交互式询问你要为哪些 AI 工具生成工作流文件（支持 Claude Code、Cursor、Codex 等 30+ 工具），也可以跳过交互直接指定：

```bash
# 同时配置 Claude Code 与 Cursor
openspec init --tools claude,cursor
```

生成的文件因工具而异：Claude Code 得到 `.claude/skills/openspec-*/SKILL.md`，Cursor 得到 `.cursor/` 下的命令或技能文件。这些文件就是把 `/opsx:*` 命令注入你的 AI 助手的载体。

初始化过程中还会询问是否创建项目配置 `openspec/config.yaml`（可选但推荐，见第 11 章）。

**选择 profile。** 默认安装 core 命令集；想要扩展命令集（new/continue/ff/verify/bulk-archive/onboard）需要显式开启：

```bash
openspec config profile   # 交互式选择 expanded workflows
openspec update           # 将选择应用到当前项目
```

两套 profile 的差异见 3.3 节。新手建议先用默认 core 跑通闭环，再考虑是否升级。

## 3. 核心概念速览

### 3.1 目录结构

`openspec init` 之后的项目结构：

```text
openspec/
├── specs/                  # 事实来源：系统当前行为
│   ├── auth/
│   │   └── spec.md         # 认证域的行为规格
│   └── ui/
│       └── spec.md
├── changes/                # 进行中的变更，一个变更一个文件夹
│   ├── add-dark-mode/
│   │   ├── proposal.md     # 为什么改、改什么
│   │   ├── specs/          # delta specs：相对现状的差异
│   │   │   └── ui/
│   │   │       └── spec.md
│   │   ├── design.md       # 怎么改（技术方案）
│   │   ├── tasks.md        # 实现清单（可勾选）
│   │   └── .openspec.yaml  # 变更元数据（可选）
│   └── archive/            # 归档区
│       └── 2026-01-24-add-dark-mode/
└── config.yaml             # 项目配置（可选）
```

`specs/` 按域（domain）组织——auth/、payments/、ui/ 这类与团队思维一致的逻辑分组，不需要预先设计完整分类，第一次改动到哪个领域就建哪个目录。

### 3.2 四种 artifacts 与 delta spec

每个 change 文件夹里的产物各有分工：

| Artifact | 回答的问题 | 说明 |
|----------|-----------|------|
| `proposal.md` | Why & What | 意图、范围、高层方案 |
| `specs/`（delta） | What will be true | ADDED/MODIFIED/REMOVED 的需求差异 |
| `design.md` | How | 技术方案与架构决策 |
| `tasks.md` | Steps | 可勾选的实现清单 |

依赖顺序 proposal → specs/design → tasks 只是"使能器"而非门禁：可以随时回头修改任何产物，AI 始终以文件的当前内容为准。

**delta spec** 是 OpenSpec 处理存量系统的关键机制——不重述整个规格，只描述变化：

```markdown
# Delta for UI

## ADDED Requirements

### Requirement: Theme Selection
The system SHALL allow users to choose between light and dark themes.

#### Scenario: Manual toggle
- GIVEN a user on any page
- WHEN the user clicks the theme toggle
- THEN the theme switches immediately
- AND the preference persists across sessions

## MODIFIED Requirements

### Requirement: Session Timeout
The system SHALL expire sessions after 15 minutes of inactivity.
(Previously: 30 minutes)

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 15 minutes pass without activity
- THEN the session is invalidated

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA)
```

三种段落的归档语义：

| Delta 段落 | 归档时的动作 |
|-----------|------------|
| `ADDED Requirements` | 追加到主规格 |
| `MODIFIED Requirements` | 替换主规格中的同名需求（必须包含该需求的全部场景） |
| `REMOVED Requirements` | 从主规格删除 |

新建能力时可在 delta 开头加 `## Purpose` 段落，归档时会成为新主规格的 Purpose 描述。

### 3.3 core 与 expanded 两套命令

core（默认）提供六个命令，覆盖完整生命周期：

| 命令 | 用途 |
|------|------|
| `/opsx:explore` | 与 AI 探索想法，不产生任何产物 |
| `/opsx:propose` | 一步创建变更 + 全部规划产物 |
| `/opsx:apply` | 按 tasks.md 实现，逐项勾选 |
| `/opsx:update` | 修订现有产物并保持一致 |
| `/opsx:sync` | 手动合并 delta 到主规格（通常不需要） |
| `/opsx:archive` | 归档完成的变更 |

expanded 额外提供六个细粒度命令：

| 命令 | 用途 |
|------|------|
| `/opsx:new` | 只创建空变更骨架 |
| `/opsx:continue` | 按依赖图创建下一个产物 |
| `/opsx:ff` | 一次生成全部规划产物 |
| `/opsx:verify` | 三维度校验实现是否符合规格 |
| `/opsx:bulk-archive` | 批量归档多个变更 |
| `/opsx:onboard` | 用真实代码库引导走完一轮完整流程 |

不同工具的命令拼写略有差异：Claude Code / Gemini CLI 用 `/opsx:propose`；Cursor、GitHub Copilot IDE 用 `/opsx-propose`；Amazon Q 用 `@opsx-propose`；Codex 用 `$openspec-propose`。以 `openspec init` 结束时打印的 Getting started 行为准。

## 4. 实践一：标准功能开发全流程

这是最常用的路径，适合"知道要做什么"的中等规模功能。全程只有四个斜杠命令，下面用一个完整的对话示例演示从想法到归档的全过程。

假设需求：给应用加退出登录按钮。

**第一步：提出变更。** 在 AI 助手聊天框输入：

```text
You: /opsx:propose add-logout-button

AI:  Created openspec/changes/add-logout-button/
     ✓ proposal.md — why and what
     ✓ specs/      — the new requirement and its scenarios
     ✓ design.md   — technical approach
     ✓ tasks.md    — implementation checklist
     Ready for implementation. Run /opsx:apply.
```

**第二步：审查产物（关键步骤，别跳过）。** 打开生成的文件读一遍，此时发现问题只值一段话的成本。重点看两处：

`proposal.md` —— 意图和范围是否与你要求的一致，有没有夹带私货：

```markdown
# Proposal: Add Logout Button

## Intent
Users need a way to sign out from the current session.

## Scope
- Add logout button to the header
- Clear session state on click
- Show confirmation dialog before logout

## Approach
Reuse the existing auth service's session clearing;
button lives in the header navigation.
```

`specs/auth/spec.md` —— delta 是否定义了正确的"完成"，场景能否当验收标准：

```markdown
## ADDED Requirements

### Requirement: User Logout
The system SHALL allow an authenticated user to end their session.

#### Scenario: Successful logout
- GIVEN an authenticated user
- WHEN they click the logout button and confirm
- THEN the session is cleared
- AND the user is redirected to the login page

#### Scenario: Cancelled logout
- GIVEN an authenticated user
- WHEN they click logout but cancel the confirmation
- THEN the session remains active
```

发现偏差就直接编辑文件（纯 Markdown），或者告诉 AI 要改哪里，然后继续。

**第三步：实现。**

```text
You: /opsx:apply

AI:  Working through tasks...
     ✓ 1.1 Add logout button to header
     ✓ 1.2 Clear session on click
     ✓ 1.3 Add confirmation dialog
     All tasks complete!
```

AI 按 `tasks.md` 顺序执行，每完成一项就勾选一项。中断后再次执行会从第一个未勾选任务恢复。

**第四步：归档。**

```text
You: /opsx:archive

AI:  Archiving add-logout-button...
     ✓ Merged specs into openspec/specs/auth/spec.md
     ✓ Moved to openspec/changes/archive/2026-06-22-add-logout-button/
     Done. Ready for the next change.
```

delta 合并进主规格，变更文件夹带日期戳移入 archive。此后 `specs/auth/spec.md` 就包含了登出行为的正式定义——这份规格是这轮工作沉淀下来的副产品，下次任何人（或任何 AI 会话）触碰认证功能都能读到它。

整条路径小结：

```text
/opsx:explore（可选）→ /opsx:propose → 你审查 → /opsx:apply → /opsx:archive
```

## 5. 实践二：Bug 修复

Bug 修复的流程与功能开发完全相同，差别在于 proposal 的写法：**描述正确的行为，而不只是"修掉这个 bug"。** 这样修复落地后，规格里留下的是"正确行为"的定义，而不是一条神秘的 fix commit。

示例：登录后陷入重定向循环。

```text
You: /opsx:propose fix-login-redirect-loop

AI:  Created openspec/changes/fix-login-redirect-loop/
     The proposal captures the current broken behavior and the
     intended behavior. The delta spec MODIFIES the redirect
     requirement so it's now precise and testable.
     Ready for implementation.
```

对应的 delta 写成 MODIFIED——修正后的重定向需求替换旧定义：

```markdown
## MODIFIED Requirements

### Requirement: Post-Login Redirect
After successful login, the system SHALL redirect exactly once
to the post-login destination.

#### Scenario: Valid credentials land on dashboard
- GIVEN a logged-out user with valid credentials
- WHEN they submit the login form
- THEN they land on the dashboard
- AND no further redirect occurs
```

之后照常 `/opsx:apply` 和 `/opsx:archive`。

一个实用技巧：**好的修复场景就是散文版的回归测试**。"GIVEN 已登录用户 WHEN 提交有效凭据 THEN 落在仪表盘且不再被重定向"写清楚的那一刻，实现的靶子就立好了——将来无论是人还是 AI 改动登录逻辑，这条场景都是现成的验收标准。

## 6. 实践三：先探索再动手

当你"知道有问题但不知道怎么解"，或者几个方案之间拿不定主意时，先别急着 propose。`/opsx:explore` 是一个零成本的思考伙伴：它读你的代码、摆出各方案的取舍、帮你把模糊的想法磨成具体的变更——全程不创建任何产物、不写任何代码。

**什么时候用 explore：**

- 知道问题但不知道方案（"页面很慢""订单偶尔重复"）
- 需要在多个技术方案间做选择，想要基于真实代码的对比
- 接手陌生代码库，改之前想先弄懂某块机制
- 怀疑工作量大大小于或大于表面看起来

**explore 做什么 / 不做什么：**

| 做 | 不做 |
|----|------|
| 读代码回答真实问题 | 不创建 change 文件夹 |
| 对比方案并指出代价 | 不写 proposal/specs/design/tasks |
| 画图理清设计 | 不修改代码 |
| 把模糊想法收窄为可构建的范围 | 不产生任何提交 |

完整示例：排查"结账偶尔生成重复订单"。

```text
You: /opsx:explore

AI:  What would you like to explore?

You: Our checkout sometimes creates duplicate orders. I don't know why
     and I don't know how to fix it safely.

AI:  Let me dig into the checkout path...
     [reads the order service, the payment webhook handler, and the
      client submit logic]

     Here's what I found. There are two ways a duplicate can happen:

     1. The client can submit twice (double-click, retry on slow network).
        Nothing debounces it.
     2. The payment webhook can fire more than once, and the handler
        creates an order each time. There's no idempotency key.

     Cause #2 is the dangerous one: it can charge and fulfill twice.

     Three ways to fix it, roughly in order of robustness:
     - Idempotency key on the order-creation endpoint (handles both causes)
     - Dedup on the webhook by payment-intent id (handles #2 only)
     - Client-side debounce (handles #1 only, papers over the real bug)

     Given your code already stores the payment-intent id, the
     idempotency-key approach is a small change with the biggest payoff.
     Want me to scope that?

You: Yes, let's do the idempotency key.

You: /opsx:propose add-order-idempotency-key

AI:  Created openspec/changes/add-order-idempotency-key/, with a proposal
     and delta spec grounded in what we just found. Ready for implementation.
```

注意发生了什么：起点是"有问题但不敢碰"，几十秒的探索把它变成了命名清晰的根因、三个按健壮性排序的方案、一条与现有代码挂钩的推荐路径。随后的 proposal 是锋利的，因为思考已经完成。

**让探索更有效的技巧：**

- **带问题不带答案。** 说"登录很慢"给 AI 调查空间；说"加个 Redis 缓存"等于预支了一个没验证过的结论。
- **把取舍问出口。** "每个方案的坏处是什么"能得到更诚实的对比。
- **让它先读代码。** 最好的探索从 AI 实际查看代码开始，必要时直接指路。
- **中途放弃也是赢。** 探索发现想法不值得做，你用最低成本学到了这件事。

经验法则：任务越模糊，explore 回报越高；任务越清晰，越可以直接跳到 `/opsx:propose`。

## 7. 实践四：并行多变更管理

变更天然是独立文件夹，因此并行互不冲突。典型场景：功能做到一半，线上冒出一个紧急 bug 要插队。

```text
You: I'm partway through add-dark-mode, but I need to fix a login bug now.

You: /opsx:propose fix-login-redirect

AI:  Created openspec/changes/fix-login-redirect/. Ready for implementation.

You: /opsx:apply

AI:  Implemented the fix. All tasks complete.

You: /opsx:archive

AI:  ✓ Archived fix-login-redirect.

You: Back to dark mode.

You: /opsx:apply add-dark-mode

AI:  Resuming add-dark-mode. Picking up at task 2.3: Update Header...
```

三个要点：

1. **多个变更活跃时，用名字指路。** `/opsx:apply add-dark-mode` 明确告诉 AI 操作哪个变更；不传名字时 AI 会根据上下文推断，推断不了会提示你选。
2. **tasks.md 就是断点。** 勾选状态记录在文件里，恢复执行时 AI 从第一个未勾选任务继续，与你会话是否中断无关。
3. **批量归档用 bulk-archive（expanded）。** 多个变更同时完成时：

```text
You: /opsx:bulk-archive

AI:  Found 3 completed changes:
     - add-dark-mode (all tasks done)
     - fix-login-redirect (all tasks done)
     - update-footer (all tasks done)

     Checking for spec conflicts...
     ⚠ add-dark-mode and update-footer both touch specs/ui/

     Inspecting codebase to resolve...
     Both changes are implemented. Will apply in chronological order.

     Archive all 3 changes?

You: Yes

AI:  ✓ Archived add-dark-mode
     ✓ Archived fix-login-redirect
     ✓ Archived update-footer
     Specs merged in order: add-dark-mode → update-footer
```

bulk-archive 会检测多个变更触碰同一规格的情况，通过检查实际实现的代码来确定合并顺序，按创建时间先后归档。

团队场景下并行规则相同：不同人认领不同变更文件夹、各自开分支即可；唯一可能冲突的位置是两个变更 MODIFIED 同一条需求时的 specs 合并，届时按普通 git 冲突解决，保留符合现实的版本。

## 8. 实践五：纯重构（无行为变化）

重构有个特殊之处：外部可见行为完全不变，规格层面就**没有任何可写的东西**——行为契约没变，变的只是实现。这类工作落在 design 和 tasks 里，spec delta 为空或不存在。

问题在于 OpenSpec 的校验默认要求变更必须有 delta（防止忘记写规格），所以纯重构需要显式声明"跳过 specs"。在变更的 `.openspec.yaml` 中标记：

```yaml
schema: spec-driven
skip_specs: true
```

之后的行为：

```bash
# 校验通过：skip_specs 声明使零 delta 合法化
openspec validate refactor-payment-module

# 状态显示 specs 阶段被显式跳过而非挂起
openspec status --change refactor-payment-module

# 归档无需额外参数（没有 delta 可合并）
openspec archive refactor-payment-module
```

终端命令也有对应的单次跳过开关 `--skip-specs`，适合 CI、工具链调用或纯文档类变更：

```bash
$ openspec archive refactor-payment-module --skip-specs
```

两条路径的分工值得记住：

- **`.openspec.yaml` 里的 `skip_specs: true`** —— 这个变更从头到尾都没有规格差异（永久性声明）
- **archive 命令的 `--skip-specs` 标志** —— 仅这一次归档跳过规格步骤（一次性）

如果重构过程中发现行为其实变了，把 `skip_specs` 从 `.openspec.yaml` 删掉并补写 delta 即可；校验会把"声明了 skip 却存在 spec 文件"视为冲突，过期的标记不会悄悄滞留。

原则一句话：specs 描述行为，行为没变，spec 就不该变。

## 9. 实践六：Expanded 模式逐步控制

`/opsx:propose` 一步成型很高效，但复杂或高风险的变更你可能想逐件审查产物再放行。这正是 expanded 命令集的用武之地。先开启它：

```bash
$ openspec config profile      # 选择 expanded workflows
$ openspec update              # 应用到本项目
```

以"给登录加两步验证"为例，分步走：

```text
You: /opsx:new add-2fa

AI:  Created openspec/changes/add-2fa/. Ready to create: proposal.

You: /opsx:continue

AI:  Created proposal.md. Now available: specs, design.

You: /opsx:continue

AI:  Created specs/auth/spec.md. Now available: design.
```

每一步只产出一个产物，产出后立即审查、随意编辑，满意了再继续。想清楚全部内容后也可以用 `/opsx:ff add-2fa` 一次生成剩余规划产物。

**new + continue 与 new + ff 的选择：**

| 情况 | 用 |
|------|-----|
| 需求清晰，准备开工 | `ff` |
| 边做边探索，想逐步审 | `continue` |
| 想先迭代 proposal 再定 specs | `continue` |
| 时间紧，要快 | `ff` |
| 复杂变更，要控制感 | `continue` |

**归档前校验：verify 三维度。** expanded 的 `/opsx:verify` 从完整性、正确性、一致性三个维度检查实现是否符合产物，输出按 CRITICAL/WARNING/SUGGESTION 分级，不会阻塞归档：

```text
You: /opsx:verify

AI:  Verifying add-auth...

     COMPLETENESS
     ✓ All 12 tasks in tasks.md are checked
     ✓ All requirements in specs have corresponding code
     ⚠ Scenario "Session timeout after inactivity" not tested

     CORRECTNESS
     ✓ Implementation matches spec intent
     ✓ Edge cases from scenarios are handled
     ✓ Error states match spec definitions

     COHERENCE
     ✓ Design decisions reflected in code structure
     ✓ Naming conventions consistent with design.md
     ⚠ Design mentions "event-driven" but implementation uses polling

     SUMMARY
     ─────────────────────────────
     Critical issues: 0
     Warnings: 2
     Ready to archive: Yes (with warnings)

     Recommendations:
     1. Add test for session timeout scenario
     2. Consider refactoring to event-driven as designed, or update design.md
```

读法：WARNING 不是拦路虎，而是"归档前你可以选择修掉、或更新产物使其诚实"的提示清单。

**新手教程：onboard。** 刚装好 OpenSpec 想在自己项目上感受完整闭环？expanded 的 `/opsx:onboard` 扫描你的代码库找一个小的安全改进，然后带着解说走完 propose → apply → archive 全程，约 15-30 分钟，留下一个可保留也可丢弃的真实变更。这是最温和的上手方式。

core 用户没有 verify 时也有替代：自己重读产物和 diff，效果等价，只是少了结构化输出。

## 10. 写好 Spec 与审查 Change

六大实践都依赖同一个前提：AI 起草的产物是可信的。这一章讲让产物可信的两个关键动作——把需求写对、在动代码前拦住错误方向。

### 10.1 写好需求与场景

spec 是行为契约，不是实现计划。队列、类库、表结构这些"怎么做"属于 design.md；需求只说系统**做什么**。

**一条好需求的特征：**

- **一个陈述一个 SHALL/MUST。** 带三个"并且"的需求其实是三个需求，拆开。
- **可观察。** 代码之外的人能判断它是否成立。"上传超过 10 MB 时显示错误横幅"可观察；"优雅地处理大文件上传"不可观察。
- **强度用对关键词。** OpenSpec 采用 RFC 2119 关键词：

| 关键词 | 含义 |
|--------|------|
| `MUST` / `SHALL` | 硬性要求，无例外 |
| `SHOULD` | 强烈建议，允许有理由的例外 |
| `MAY` | 真正可选 |

默认用 MUST/SHALL，只有确实想表达"除非有充分理由"时才用 SHOULD。

检验标准一句话：**一个从没看过代码的测试人员能否判断这条需求是否通过？** 不能就继续磨。

**一条好场景的特征：**

- 真正检验其所在的需求——换个说法复述需求原文的场景什么也没测
- 覆盖要紧的分支而不只是快乐路径：空输入、过期 token、二次点击、出错的地方才是 bug 老巢
- 标题点明覆盖的情形："Scenario: Rejects an expired token"一眼可知测什么；"Scenario: Test 2"什么都看不出

批准前自问：*哪个场景被破坏会让我最恼火？*——确保有一个场景点名了它。

**delta 类型选对**：新行为用 ADDED；改既有行为用 MODIFIED（附完整新版与改动说明）；废弃行为用 REMOVED（附原因）。拿不准时打开当前主规格看看那条需求是否已存在。

**引导 AI 出好草稿。** propose 的产出质量取决于你给的输入：

- 说清意图和边界："加深色模式切换，首次加载跟随系统设置——不要动现有主题 API"。范围外的那半句和范围内同样重要。
- 点名你在意的情形："确保有'用户已手动选过主题'的场景"。
- 然后亲自编辑：收紧模糊的 SHALL、删掉没测东西的场景、补上漏掉的情形。

**变更规模控制。** 最常见的写作错误不是需求写得差，而是一个变更想干三件事的信号：scope 读起来像无关功能清单、审查要一下午没人会看、两个人没法同时干活。好的变更一句话说得清意图；反过来一行错别字也不需要三条需求和设计文档。

### 10.2 两分钟审查法

OpenSpec 的全部承诺建立在"你真的去读了 AI 起草的计划"上。两次审查时机：

```text
/opsx:propose ──► 审查计划 ──► /opsx:apply ──► /opsx:verify ──► /opsx:archive
                  （写码之前）                  （写码之后）
```

第一次审查省得最多、也最常被跳过。按"最早能退出的顺序"读三个文件：

1. **proposal.md —— 这是对的问题吗？** 意图是否与你要求的一致；范围有没有悄悄变大（要个主题切换结果捎带动了 auth）；是否空泛到无法执行。发现不对就地停下修 proposal。
2. **specs/ 的 delta —— "完成"定义对了吗？** 这是审查核心。红旗：模糊到无法构建或测试的需求；没有场景的需求；场景不检验其需求；最值钱的发现是**缺失**——AI 忠实写下你说了的，你要看出自己忘了说的。
3. **tasks.md —— 工作计划合理吗？** 有任务找不到对应的需求吗？有没有藏着真实决策的"实现该功能"巨无霸任务？有没有碰你刚批准的范围之外的东西？

七项两分钟清单：

- [ ] proposal 意图与我的要求一致
- [ ] 范围没有夹带私货
- [ ] 每条需求具体到可以测试
- [ ] 每条需求有真正检验它的场景
- [ ] 我最在意的情形被覆盖了
- [ ] 任务都能对应到需求，没有来路不明或越界的
- [ ] AI 就建这些、且只建这些，我能接受

七项全过就可以放心 `/opsx:apply`；有任何不过都不是挫折——这正是那两分钟在干活。

**反对意见要趁便宜提。** 两种修正方式：直接编辑文件（纯 Markdown），或告诉 AI 哪里不对让它改（"砍掉 auth 相关改动——超出范围"、"给已手动选主题的用户加个场景"）。改完重读改动的部分，循环到达成你能签字的计划为止。

审查也讲成本匹配：单文件错别字修复二十秒扫一眼即可，动 auth/支付/不可恢复数据的变更值得走完每个问题。

### 10.3 编辑迭代与 Update vs Start Fresh

**任何产物任何时候都可以编辑。** 没有"规划阶段锁定"，没有特殊编辑模式。两种方式：

1. **直接改文件。** `openspec/changes/<name>/` 下都是纯 Markdown。
2. **让 AI 改。** 在聊天里说"更新 proposal：去掉缓存方案，加一节限流"，AI 会带着整个变更的上下文替你修改。

心智模型：产物是活计划而非签了字的合同，AI 始终按文件的当前内容工作，所以编辑文件就是转向。

手工改了代码之后怎么办？归档前把两边重新对齐即可：代码是对的 → 更新 delta 描述实际交付的行为；规格是对的 → 继续写码直到一致。expanded 用户跑 `/opsx:verify` 能快速暴露分歧点。原则：归档那一刻 specs 成为记录真相的文件，归档前让它诚实。

tasks.md 同样是活清单：实施中发现的新任务可以加、做了才发现多余的可以删、顺序可以调，AI 从第一个未勾选项恢复。

**什么时候 update、什么时候另起炉灶？**

更新现有变更的情况：

- 同一意图，优化执行（发现没考虑的边缘情况；方案微调但目标不变）
- 范围收窄（先发 MVP，剩下的以后做）
- 基于实现发现的学习型修正（"用 CSS 变量"改成"用 Tailwind 的 dark: 前缀"）

另开新变更的情况：

- 意图根本变了（问题本身不一样了）
- 范围爆炸成另一件事（"修登录 bug"变成"重写认证系统"）
- 原变更是可独立完成的（先完成先归档，新工作自立门户）

启发式三问：

| 测试 | Update | New change |
|------|--------|-----------|
| 身份 | 同一件事的精化 | 不同的工作 |
| 范围重叠 | >50% 重叠 | <50% 重叠 |
| 完成度 | 不改完就没法算完成 | 原变更可以先"完成"，新工作独立成立 |
| 叙事 | 更新链讲出连贯故事 | 补丁比重写更让人困惑 |

例："加深色模式"之后想"支持自定义主题"→ 新变更（范围爆炸）；"系统偏好检测比预想的难" → 更新（同一意图）；"先发切换按钮，偏好设置下一期" → 先更新归档，再开新变更。

原则：**update 保留上下文，new change 换来清晰。** 思考历史有价值时选择更新；推倒重来比打补丁更清楚时选择新建。类似 git 分支：同一功能持续 commit；真正的新工作才开新分支；有时合并半成品功能再为第二期另起。

## 11. 进阶配置与团队协作

### 11.1 config.yaml 项目定制

`openspec/config.yaml` 让每个产物的生成请求自动带上你的项目背景，是提升产物质量最立竿见影的一招：

```yaml
# openspec/config.yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js, PostgreSQL
  API style: RESTful, documented in docs/api.md
  Testing: Jest + React Testing Library
  We value backwards compatibility for all public APIs

rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
  specs:
    - Use Given/When/Then format
    - Reference existing patterns before inventing new ones

operations:
  apply:
    guidance:
      - Run focused tests before the full suite
  archive:
    guidance:
      - Keep the completion summary concise
```

三个注入机制的分工：

| 字段 | 注入范围 | 说明 |
|------|---------|------|
| `context` | 所有产物 | 项目背景包在 `<context>` 标签里前置注入；上限 50KB，写摘要别贴长文 |
| `rules` | 匹配的单个产物 | 按 artifact ID 键控（spec-driven 合法值为 proposal/specs/design/tasks） |
| `operations.*.guidance` | apply/archive 操作 | 建议性指引，约束操作方式而非产物内容 |

配置改动即时生效，无需重启。注意文件名必须是 `config.yaml` 不是 `.yml`。

**中文等多语言输出**：在 context 中加语言指令即可让所有产物以中文生成：

```yaml
context: |
  Language: Chinese (Simplified)
  All artifacts must be written in Simplified Chinese.
  Keep OpenSpec structural headings and SHALL/MUST keywords in English.

  Tech stack: Java 17, Spring Boot, MyBatis Plus
```

结构性标题和 SHALL/MUST 规范词保持英文是因为校验逻辑依赖它们；需求与场景的正文描述可以用中文。

### 11.2 存量项目渐进采纳

OpenSpec 是 brownfield-first 设计的，采纳策略一句话：**不要为存量代码补写规格，只为即将改动的部分写 delta。**

担心"八万行老代码要不要先全部规格化"？不需要。specs 目录从近乎空白开始自然生长——第一个变更记录它触碰的部分，第二个变更记录它的部分，数月后 specs 恰好在你们真正动过的区域丰满起来。这正是想要的状态。

存量项目的第一步：

```bash
$ cd your-existing-project
$ openspec init
```

然后挑一件本周本来就要做的小事（不是玩具、不是重写）作为第一个 change，走 explore → propose → apply → archive 全程。前几个变更的意义一半在交付、一半在学习节奏，小步走让教训便宜。

已有的 PRD/SRS 等需求文档不必整体导入也不必丢弃——当作探索素材使用：开始变更时把相关章节贴给或指给 AI，让它从中塑造聚焦的 OpenSpec delta。40 页 PRD 是另一种工件，硬转换往往产出一份巨大而无人信任的过期规格。

其他要点：

- **克制回填冲动。** 给不打算改的代码写规格感觉高产，通常不是——没有机制迫使那些规格追踪现实。
- **把 openspec/ 提交进 git。** specs 与 archive 是项目历史的一部分，与它们描述的代码同库版本化。

### 11.3 团队协作要点

团队使用只需知道一条铁律：**OpenSpec 不碰 git。** 它只在 `openspec/` 下读写 Markdown，从不 commit、branch、push、pull，所以能嵌进现有协作流程而不是替代它。

日常循环把 change 映射到分支：

```text
git switch -c add-dark-mode        开分支，照常
   │
/opsx:propose add-dark-mode        起草计划（proposal + specs + tasks）
   │
REVIEW THE PLAN                    写码前人读一遍
   │
/opsx:apply                        实现；产物与代码一起变化
   │
git commit && open a PR            PR 同时包含 spec delta 和代码
   │
队友审查、合并
   │
/opsx:archive                      delta 并入 specs/，变更移入 archive/
```

PR 审查的推荐顺序：先读 proposal（问题和范围对不对）→ 再读 delta（完成的定义对不对）→ 最后才读代码 diff（是否恰好实现了这些需求）。对方案有异议可以在 proposal 层面廉价提出，不必在 300 行代码里反复拉锯。

归档时机有两种可行约定：

- **PR 合并后归档（推荐）。** 分支携带活跃变更，合并后在主分支归档。共享的 specs/ 只随真正上线的工作前进。
- **PR 内归档。** 小团队更简单：同一个 PR 既落代码又同步归档。代价是 specs diff 和代码 diff 混在一起，PR 较嘈杂。

选定一种保持一致即可。并行冲突规则见第 7 章：不同变更文件夹互不干扰，唯一冲突点是两个变更 MODIFIED 同一条需求，届时按普通 git 冲突处理。

### 11.4 自定义 Schema 简介

默认 schema `spec-driven` 定义了 proposal → specs → design → tasks 四件套及其依赖。团队流程特殊时可以 fork 一份改造，模板和指令都是外部 YAML + Markdown，改完立即生效无需重新编译：

```bash
# fork 默认 schema 为起点
openspec schema fork spec-driven my-workflow

# 或从零交互式创建
openspec schema init research-first

# 校验结构与模板引用、检查循环依赖
openspec schema validate my-workflow

# 查看 schema 从哪里解析（调试优先级用）
openspec schema which my-workflow
```

fork 得到的 `openspec/schemas/my-workflow/schema.yaml` 中，artifacts 列表决定一切——增删 artifact、改 requires 依赖、编辑 templates/ 下的提示模板。例如插入 review 环节并让 tasks 依赖它：

```yaml
artifacts:
  - id: review
    generates: review.md
    description: Pre-implementation review checklist
    template: review.md
    instruction: |
      Create a review checklist based on the design.
      Include security, performance, and testing considerations.
    requires:
      - design

  - id: tasks
    generates: tasks.md
    requires:
      - specs
      - design
      - review
```

schema 存放在项目内随代码版本化（也可放用户级目录跨项目共享，但不推荐）。官方还维护着一份社区 schema 目录，如 intent-driven（含 ADR 管理）、anvil（TDD 纪律 + 对抗式评审）、superpowers-bridge 等，复制对应仓库的 bundle 到 `openspec/schemas/` 即可使用。

## 12. CLI 常用命令速查与排障

### 12.1 终端命令速查表

日常高频命令一览（均在终端执行）：

| 命令 | 用途 | 常用选项 |
|------|------|---------|
| `openspec init [path]` | 初始化项目 | `--tools <list>` 非交互指定工具；`--force` 清理旧文件 |
| `openspec update [path]` | 升级后刷新生成的 skills/commands | `--force` 强制重写 |
| `openspec list` | 列出活跃变更 | `--specs` 列规格；`--json` 结构化输出 |
| `openspec show <item>` | 查看变更或规格详情 | `--type spec/change`；`--json` |
| `openspec view` | 交互式仪表盘浏览 | 无参数交互界面 |
| `openspec status --change <n>` | 查看产物完成进度 | `--json` 供 agent 使用 |
| `openspec instructions <artifact> --change <n>` | 获取某产物的富上下文生成指令 | `apply`/`archive` 特殊输入面；`--json` |
| `openspec validate [item]` | 校验变更与规格的结构问题 | `--all --strict` CI 用严格模式；`--archived` 检查归档变更任务全勾选；`--json` |
| `openspec archive <change>` | 归档变更并合并 delta | `-y/--yes` 跳过确认（CI/agent 必加）；`--skip-specs` 单次跳过规格合并 |

校验命令值得多说一句：`validate --archived` 用于 pre-commit hook 场景，检查归档区的每个变更 tasks.md 是否全部勾选，防止带着未完成工作归档；零 delta 的变更若未声明 `skip_specs: true` 会被拒绝，这是防呆设计。

### 12.2 升级与遥测

升级分两步——先升全局包，再逐项目刷新生成文件：

```bash
npm install -g @fission-ai/openspec@latest
cd your-project && openspec update
```

`openspec update` 还会主动查询 npm registry 是否有更新版本并提议代为升级；生成的 skill 文件带版本戳，手改过的文件除非版本不符或加了 `--force` 不会被覆盖。

遥测说明：OpenSpec 收集匿名统计，内容仅限命令名和版本号，不含参数、路径、内容或个人信息，CI 环境自动关闭。退出方式任选其一：

```bash
openspec config set telemetry.enabled false
```

```bash
export OPENSPEC_TELEMETRY=0
```

### 12.3 常见问题排查

**`openspec: command not found`**
CLI 未装或 PATH 未包含全局 bin 目录。运行 `npm prefix -g` 定位安装位置（macOS/Linux 二进制在其 `bin/` 下），确认该路径在 PATH 里。

**报错 Requires Node.js 20.19.0 or higher**
运行时版本过低。注意用 bun 安装的也要保证 PATH 上有 Node.js 20.19+，OpenSpec 运行在 Node 上。

**斜杠命令敲了没反应**
按命中率排查：

1. 敲错位置——`/opsx:*` 属于 AI 助手聊天框，终端里无效
2. 拼写形式与工具不匹配——Cursor 用 `/opsx-propose`，Codex 用 `$openspec-propose`
3. 文件未生成——运行 `openspec init`（update 只刷新已有文件）
4. 工具未重启——多数工具启动时扫描 skills/commands
5. 换了项目目录——skills 按项目写入，clone 新仓库要在其中重新 init/update
6. 工具本身不支持命令文件（Codex/Kimi Code/Zed 等 skills-only 工具 `/opsx` 永远不会自动补全）——改用技能名调用

**MODIFIED 需求报"omits scenario(s) the current spec still has"**
MODIFIED 替换的是整条需求块，必须携带变更后幸存的**全部**场景而不只是你编辑的部分。从 `openspec/specs/<capability>/spec.md` 把点名要求的场景拷回 delta 即可。

**archive 卡在确认或报"User force closed the prompt with 0 null"**
CI、agent 或 stdin 关闭的环境无法回答交互确认。带上名字和 `--yes` 一步到位：`openspec archive <change-name> --yes`；原本要传的其他标志（如 `--skip-specs`）保留不动。

**config.yaml 没生效**
三个常见原因：文件名必须是 `config.yaml`（`.yml` 无效）；YAML 语法错误（CLI 会带行号报告）；误以为需要重启（不需要，即时生效）。

**"Context too large"**
context 字段上限 50KB。精简摘要，长文档改为放链接。精炼的 context 同时能换来更快更好的生成效果。

## 13. 参考资源

官方资源地图（均为 GitHub Fission-AI/OpenSpec 仓库内路径）：

| 文档 | 内容 |
|------|------|
| README | 快速开始与总览 |
| docs/getting-started.md | 第一个变更全程演示 |
| docs/explore.md | 探索模式专述 |
| docs/how-commands-work.md | 两半命令模型详解 |
| docs/workflows.md | 工作流模式合集 |
| docs/examples.md | 七个实践配方原文 |
| docs/writing-specs.md | Spec 写作规范 |
| docs/reviewing-changes.md | 审查方法 |
| docs/editing-changes.md | 编辑迭代细节 |
| docs/existing-projects.md | 存量项目采纳 |
| docs/team-workflow.md | 团队协作 |
| docs/customization.md | 配置与自定义 schema |
| docs/cli.md | CLI 完整参考 |
| docs/commands.md | 斜杠命令完整参考 |
| docs/troubleshooting.md | 故障排查全集 |
| docs/faq.md | 高频问答 |

社区与支持：

- Discord：discord.gg/YctCnvvshC（提问与反馈）
- GitHub Issues：github.com/Fission-AI/OpenSpec/issues
- 终端快捷反馈：`openspec feedback "<message>"` 直接开 issue（需本机 gh CLI 已登录）

进阶方向一句话索引：跨仓库/跨团队规划使用 beta 的 Stores 功能（独立规划仓库，`docs/stores-beta/user-guide.md`）；旧版 legacy 工作流（`/openspec:proposal` 三命令）仍可用但已被 OPSX 取代，存量项目迁移见 docs/migration-guide.md。
