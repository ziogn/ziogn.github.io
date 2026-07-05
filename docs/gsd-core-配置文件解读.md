---
title: GSD-Core 配置文件完整解读
created: 2026-06-24 10:00
updated: 2026-07-02 00:30
version: 0.1.0
author: ziogn
source: https://github.com/open-gsd/gsd-core
tags: [gsd, gsd-core, config, reference, guide]
aliases: [gsd-core config.json, GSD 配置参考]
description: GSD-Core .planning/config.json 的完整配置参考手册，覆盖全部配置字段的释义、默认值和使用场景
---

# GSD-Core 配置文件完整解读

> 本文基于 open-gsd/gsd-core 仓库（npm 包 `@opengsd/gsd-core`）撰写，定位为配置参考手册。与已有文档 [GSD-gsd-core 模型解析与 Agent 模型切换](GSD-gsd-core%20模型解析与%20Agent%20模型切换.md) 互补——本文聚焦模型配置之外的所有配置域，模型相关字段仅列出名称和默认值，详细解读指向该文档。

---

## 1. 配置总览

### 1.1 目标读者

使用 GSD-Core 进行项目开发、需要自定义行为或排查配置问题的开发者。本文默认读者已了解 GSD 基本概念（plan、phase、workstream、agent）。

### 1.2 配置域全景图

`.planning/config.json` 的配置按用途分为 12 个域，加上模型配置域（本文仅做交叉引用），总计约 60+ 可配置字段。

| 配置域 | 字段数量 | 本文章节 | 说明 |
|--------|---------|---------|------|
| 项目基础 | 6 | 第 3 章 | 运行模式、粒度、项目标识 |
| 模型配置 | 11 | 第 4 章（交叉引用） | profile、override、routing 等 |
| 上下文与运行时 | 4 | 第 5 章 | prompt 注入、窗口大小、语言 |
| 工作流开关 | ~30 | 第 6 章 | 各阶段开关、自动推进、审查 |
| 并行化 | 5 | 第 7 章 | 多 agent 并行执行 |
| Git 集成 | 4 | 第 8 章 | 分支策略、标签 |
| 确认门控 | ~8 | 第 9 章 | 用户审批粒度 |
| 安全 | 2 | 第 10 章 | 破坏性操作保护 |
| Hook | 2 | 第 11 章 | 上下文警告、工作流守卫 |
| Agent 技能 | 动态 | 第 12 章 | 技能文件注入 |
| Feature Flags | 2 | 第 13 章 | 实验性功能 |
| 代码质量与 Ship | 动态 | 第 14 章 | Fallow 分析、PR 模板 |
| 管理设置 | 5 | 第 15 章 | 状态行、审查、能力注册 |

### 1.3 与模型配置教程的分工

[GSD-gsd-core 模型解析与 Agent 模型切换](GSD-gsd-core%20模型解析与%20Agent%20模型切换.md) 已详细覆盖 `model_profile`、`model_overrides`、`models`、`dynamic_routing`、`model_policy`、`effort`、`fast_mode`、`runtime`、`resolve_model_ids`、`granularities` 等字段。本文第 4 章仅给出这些字段的名录和默认值，供读者快速索引，不做深入展开。

### 1.4 使用方式

- **首次阅读**：按顺序通读第 1-3 章和第 5-6 章，了解核心配置域
- **问题排查**：直接跳转到相关配置域章节
- **快速模板**：跳转到第 16 章，选择适合场景的完整 config.json 修改使用
- **字段速查**：使用附录 A 的配置域索引表

---

## 2. 配置文件位置与加载顺序

GSD 的配置有两层结构：项目级 `.planning/config.json`（运行时唯一真理源）和全局级 `~/.gsd/defaults.json`（仅作新项目模板）。理解这两层的区别是正确配置的前提。

### 2.1 项目级：.planning/config.json

**运行时唯一读取的配置源**。由 `/gsd:new-project` 命令创建，`/gsd:settings` 和 `/gsd:config` 命令编辑。加载函数 `loadConfig()` 读取路径为 `path.join(planningDir(cwd, options?.workstream), 'config.json')`。

| 属性 | 值 |
|------|-----|
| 路径 | `<项目根>/.planning/config.json` |
| 文件名 | 固定 `config.json` |
| 角色 | 运行时 GSD 唯一读取的配置文件 |
| 创建方式 | `/gsd:new-project` 自动创建 |

### 2.2 全局级：~/.gsd/defaults.json

**仅作新项目模板**，由 `buildNewProjectConfig()` 在 `/gsd:new-project` 时合并一次。运行时 **不读** 全局。

| 属性 | 值 |
|------|-----|
| 路径 | `~/.gsd/defaults.json` |
| 文件名 | 固定 `defaults.json`（注意不是 `config.json`） |
| 角色 | 仅作模板，创建新项目时合并一次 |
| 运行时读取 | **不读** |

**常见误解澄清**：修改 `~/.gsd/defaults.json` **不会影响已有项目**。已有项目的运行时 `loadConfig()` 只读项目级 `.planning/config.json`。修改 defaults 只会影响未来通过 `/gsd:new-project` 创建的新项目。

### 2.3 Workstream 配置变体

当 `.planning/active-workstream` 文件存在时（即处于 workstream 并行开发场景），实际生效的配置路径变为：

```
<项目根>/.planning/workstreams/<workstream>/config.json
```

这是「改了顶层配置不生效」最常见的原因。使用以下命令确认当前生效路径：

```bash
node gsd-tools.cjs config-path
# 示例输出（非 workstream 场景）：
# /Users/you/myproject/.planning/config.json
# 示例输出（workstream 场景）：
# /Users/you/myproject/.planning/workstreams/feature-x/config.json
```

### 2.4 配置修改方式速览

| 方式 | 命令/操作 | 适用场景 |
|------|----------|---------|
| 斜杠命令 | `/gsd:settings`（基础配置向导） | 新手、交互式改常用项 |
| 斜杠命令 | `/gsd:config --profile <p>` | 一步切换 model profile |
| 斜杠命令 | `/gsd:config --advanced` | 高级调优（model_policy 等） |
| CLI | `gsd-tools.cjs config-set <key> <value>` | 脚本化、单值修改 |
| CLI | `gsd-tools.cjs config-get <key>`（支持点号嵌套） | 读取某个配置项 |
| 手动编辑 | 直接编辑 `.planning/config.json` | 复杂多字段修改 |
| 向导 | `/gsd:new-project` | 首次创建项目 |

**改完无需重启**：`loadConfig()` 每次调用都重新读文件，无内存缓存。

---

## 3. 项目基础设置

本章解读与项目身份、运行模式相关的基础字段。所有字段与模型配置教程**不重叠**。

### 3.1 运行模式：mode

| 属性 | 值 |
|------|-----|
| 类型 | `enum` |
| 默认值 | `"interactive"` |
| 可选值 | `interactive` / `yolo` |

`interactive` 模式下，每一步关键操作都需要用户确认，适合需要精细控制的生产项目。`yolo` 模式自动批准所有操作，适合快速原型开发和有资深开发者监控的场景。

**推荐：** `"interactive"`。常规开发保持交互模式；只有个人快速原型才用 `yolo`。

### 3.2 阶段粒度：granularity

| 属性 | 值 |
|------|-----|
| 类型 | `enum` |
| 默认值 | `"standard"` |
| 可选值 | `coarse`（2-4 个 phase）/ `standard`（4-6）/ `fine`（6-10）|

控制 GSD 将一个 plan 拆分成多少个 phase。粗粒度适合小型功能开发，细粒度适合大型重构或复杂功能。

**推荐：** `"standard"`。大多数项目的合理默认值。`coarse` 适合小型功能，`fine` 适合复杂重构。

### 3.3 项目标识：project_code / phase_naming / phase_id_convention

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `project_code` | `string` | `null` | phase 目录名前缀，如 `"ABC"` |
| `phase_naming` | `string` | `null` | phase 命名前缀，覆盖默认命名规则 |
| `phase_id_convention` | `string` | `null` | phase ID 命名约定 |

`project_code` 在多项目工作区中特别有用——每个项目的 phase 目录带有唯一前缀，避免混淆。例如设置 `"ABC"` 后，phase 目录名可能变为 `ABC-planning-001`。

**推荐：** 单项目保持 `null`（不设）；多项目工作区设 `project_code` 为项目缩写即可。`phase_naming` 和 `phase_id_convention` 保持默认。

### 3.4 输出路径与提交：claude_md_path / planning.commit_docs

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `claude_md_path` | `string` | `"./.claude/CLAUDE.md"` | CLAUDE.md 的写入路径 |
| `planning.commit_docs` | `boolean` | `true` | `.planning/` 目录是否纳入 git 提交 |

`claude_md_path` 控制 GSD 生成的 CLAUDE.md 存放位置。如果项目中已有手动维护的 CLAUDE.md，可指定不同路径避免冲突。`planning.commit_docs` 设为 `false` 时，`.planning/` 目录不提交到 git，常用于临时实验性项目。

**推荐：** 两者均保持默认值——`"./.claude/CLAUDE.md"` 和 `true`。只有当 `.planning/` 含敏感信息或纯本地实验时才将 `commit_docs` 设为 `false`。

---

## 4. 模型配置字段一览（交叉引用）

本章仅列出模型配置相关的顶级字段名和默认值，详细解读请移步 [GSD-gsd-core 模型解析与 Agent 模型切换](GSD-gsd-core%20模型解析与%20Agent%20模型切换.md)。

| 字段 | 类型 | 默认值 | 一句话说明 |
|------|------|--------|-----------|
| `model_profile` | `enum` | `"balanced"` | 全局模型策略，5 选 1（quality/balanced/budget/adaptive/inherit） |
| `model_overrides` | `object` | `{}` | 单 agent 精确覆盖，优先级最高 |
| `models` | `object` | `{}` | 按 phase_type 设模型（planning/research/execution 等） |
| `dynamic_routing` | `object` | `null` | 动态路由 + 失败自动升级（默认关闭） |
| `model_policy` | `object` | 无 | v1.42 provider-neutral preset |
| `effort` | `object` | `{"default":"high"}` | v1.42 统一 effort 入口，6 档 |
| `fast_mode` | `object` | `{"enabled":false}` | v1.42 快速模式（仅 API runtime 支持） |
| `runtime` | `string` | 无 | 当前运行时（claude/codex/gemini/opencode 等） |
| `resolve_model_ids` | `boolean`或`string` | `false` | 输出形态：false（tier alias）/ true（完整 ID）/ "omit"（空串） |
| `granularities` | `object` | `{}` | v1.43 per-phase_type 粒度覆盖 |

---

## 5. 上下文与运行时设置

控制 agent 执行环境的字段，不直接影响模型选择，属于执行环境调优范畴。

### 5.1 自定义上下文：context

| 属性 | 值 |
|------|-----|
| 类型 | `string` |
| 默认值 | `null` |

注入到每个 agent prompt 的统一上下文文本，适合放置项目专属公约、架构约定、编码规范等。内容会追加到每个 agent 的系统提示中。例如可以写「本项目使用 MVVM 架构，ViewModel 命名以 `ViewModel` 结尾」等团队约定。

**推荐：** 视项目需要填写。团队项目建议写入核心架构约定（如语言风格、命名规范、设计模式偏好），让每个 agent 自动遵守。

### 5.2 上下文窗口：context_window

| 属性 | 值 |
|------|-----|
| 类型 | `number` |
| 默认值 | `200000` |

控制 GSD 为 agent 分配的上下文窗口 token 数。对于支持 1M 上下文的模型（如 Claude Sonnet 4），可设为 `1000000`。调大窗口会消耗更多 token，但能减少因上下文截断导致的信息丢失。

**推荐：** `200000`（默认值）。使用 1M 上下文模型时才考虑增大，但需注意 token 消耗翻倍。

### 5.3 上下文预设：context_profile

| 属性 | 值 |
|------|-----|
| 类型 | `string` |
| 默认值 | 无 |
| 可选值 | `dev` / `research` / `review` |

v1.34 引入的执行上下文预设，自动调整 prompt 风格适配不同任务。`dev` 偏执行导向，`research` 偏探索分析，`review` 偏审查改进。

**推荐：** 日常开发保持不设（使用默认 prompt 风格）。针对专项任务（如纯调研或纯审查）时临时使用即可。

### 5.4 响应语言：response_language

| 属性 | 值 |
|------|-----|
| 类型 | `string` |
| 默认值 | `null` |

控制 GSD agent 回复的语言偏好，值为语言代码（如 `"zh"` 表示中文、`"ja"` 表示日语）。设为零值 `null` 时跟随会话语言。团队成员使用不同语言时可通过此字段统一 agent 输出语言。

**推荐：** `null`（不设，跟随会话语言）。只在多语言团队中需要统一 agent 输出语言时才设置。

---

## 6. 工作流开关

工作流域是 GSD `config.json` 中配置项最多的域（约 30 个子键），控制着 GSD 开发流程的各个执行阶段和行为。**核心约定**：工作流开关各字段默认值不同，请逐字段确认，官方文档标注缺失键默认 true 仅适用于大多数布尔型开关。

### 6.1 阶段开关

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `workflow.research` | `boolean` | `true` | 是否执行研究阶段 |
| `workflow.plan_check` | `boolean` | `true` | 计划检查开关 |
| `workflow.verifier` | `boolean` | `true` | 验证阶段开关 |

关闭研究阶段（research）可加快迭代速度，但会失去外部资料搜索能力。关闭验证阶段（verifier）适用于原型开发，生产项目建议保持开启。

**推荐：** 日常开发 `research: true`、`plan_check: true`、`verifier: true`，三开保证质量。原型开发可关掉 `research` 和 `verifier`。

### 6.2 自动推进：auto_advance

| 属性 | 值 |
|------|-----|
| 字段 | `workflow.auto_advance` |
| 类型 | `boolean` |
| 默认值 | `false` |

是否在阶段完成后自动推进到下一阶段。开启后无需用户逐阶段确认，适合自动化程度较高的场景。默认为 false 以确保每个阶段完成时用户有机会介入。

**推荐：** `false`。除非你确信自己在做什么，否则保持关闭，让每个阶段完成时都有机会检查和干预。

### 6.3 代码审查：code_review / code_review_depth

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `workflow.code_review` | `boolean` | `true` | 是否执行代码审查 |
| `workflow.code_review_depth` | `string` | `"standard"` | 审查深度 |

`code_review_depth` 可选值包括 `standard`（标准审查）等。深度越深审查越全面，但消耗更多 token 和时间。

**推荐：** `code_review: true`（开启审查），`code_review_depth: "standard"`。生产项目可提升为 `"deep"`。

### 6.4 工作树：use_worktrees

| 属性 | 值 |
|------|-----|
| 字段 | `workflow.use_worktrees` |
| 类型 | `boolean` |
| 默认值 | `true` |

是否使用 git worktree 隔离并行分支。开启后每个并行 plan 在独立的 worktree 中执行，避免文件冲突。关闭时所有操作在主工作区进行。

**推荐：** `true`。worktree 隔离能防止并行执行时文件冲突，强烈推荐保持开启。

> **注意：** 非 Claude 运行时（Codex、Gemini 等）不支持 worktree，安装时会自动设为 `false`，不要强制开启。

### 6.5 计划与迭代：plan_bounce / tdd_mode / mvp_mode

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `workflow.plan_bounce` | `boolean` | `false` | 是否启用外部计划验证脚本 |
| `workflow.tdd_mode` | `boolean` | `false` | TDD 测试驱动开发模式 |
| `workflow.mvp_mode` | `boolean` | `false` | MVP 最小可用模式 |

`tdd_mode` 开启后，GSD 默认先生成测试再编写实现代码。`mvp_mode` 开启后跳过非核心功能，只交付最小可用版本。

**推荐：** 三者均保持 `false`（默认）。有 TDD 实践经验的团队再启用 `tdd_mode`；时间紧迫的 MVP 场景再用 `mvp_mode`。`plan_bounce` 默认 `false` 即可。

### 6.6 时间控制：subagent_timeout

| 属性 | 值 |
|------|-----|
| 字段 | `workflow.subagent_timeout` |
| 类型 | `number`（毫秒） |
| 默认值 | `300000`（5 分钟） |

子 agent 的超时控制，防止某个 agent 无限阻塞。超时后 GSD 会判定该 agent 失败并走降级逻辑。大型项目可能需要增加此值。

**推荐：** `300000`（5 分钟）。代码库极大或模型较慢时可增大到 `600000`（10 分钟），但不要低于 `120000`（2 分钟）。

### 6.7 安全与合规：security_enforcement / nyquist_validation

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `workflow.security_enforcement` | `boolean` | `true` | 安全策略强制执行 |
| `workflow.nyquist_validation` | `boolean` | `true` | 奈奎斯特验证开关 |

奈奎斯特验证（Nyquist Validation）是 GSD 的一种质量保障机制，通过多次交叉验证来发现规划中的盲区。生产项目建议保持开启。

**推荐：** 两者均保持 `true`。生产项目务必开启；原型开发可关掉 `nyquist_validation` 以加速。

### 6.8 其他开关速览

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `workflow.node_repair` | `true` | 自动修复失败的 node 操作 |
| `workflow.cross_ai_execution` | `false` | 跨 AI 执行开关 |
| `workflow.ui_phase` | `true` | UI 生成阶段开关 |
| `workflow.node_repair` | `true` | 自动修复失败的 node 操作 |
| `workflow.cross_ai_execution` | `false` | 跨 AI 执行开关 |
| `workflow.ui_phase` | `true` | UI 生成阶段开关 |

大多数工作流开关的 key 如果缺失则视为启用（默认 true）。建议显式配置需要的开关而非依赖默认行为。

**推荐：** 上述三个字段按默认值即可。`node_repair` 和 `ui_phase` 保持 `true`；`cross_ai_execution` 保持 `false`（除非确有跨 AI 需求）。

---

## 7. 并行化设置

控制 GSD 如何并行执行多个 plan，是提升开发效率的关键配置域。

### 7.1 主开关与维度

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `parallelization.enabled` | `boolean` | `true` | 并行主开关 |
| `parallelization.plan_level` | `boolean` | `true` | 计划级并行 |
| `parallelization.task_level` | `boolean` | `false` | 任务级并行 |

`plan_level` 控制多个 plan 是否可同时执行。`task_level` 更为精细，控制单个 plan 内的任务级并行，默认关闭。

**推荐：** `enabled: true`、`plan_level: true`、`task_level: false`。计划级并行收益大开销小，任务级并行容易冲突且收益不明显，建议默认关闭。

### 7.2 并行度控制

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `parallelization.max_concurrent_agents` | `number` | `3` | 最大并发 agent 数 |
| `parallelization.min_plans_for_parallel` | `number` | `2` | 启动并行所需的最小 plan 数 |

`max_concurrent_agents` 控制同时运行的最大 agent 数量。API 调用的并发限制、本地计算资源都会影响此值的合理范围。`min_plans_for_parallel` 确保只有 plan 数量达到阈值才启用并行，避免在小规模任务上徒增复杂度。

**推荐：** `max_concurrent_agents: 3`（默认）。普通项目 3-5 即可；API 限流严重的项目降到 2。`min_plans_for_parallel: 2` 保持默认。

### 7.3 并行化完整配置示例

```json
{
  "parallelization": {
    "enabled": true,
    "plan_level": true,
    "task_level": false,
    "max_concurrent_agents": 3,
    "min_plans_for_parallel": 2
  }
}
```

---

## 8. Git 集成

控制 GSD 如何在开发过程中管理分支、标签和提交。

### 8.1 分支策略：branching_strategy

| 属性 | 值 |
|------|-----|
| 字段 | `git.branching_strategy` |
| 类型 | `enum` |
| 默认值 | `"none"` |
| 可选值 | `none` / `phase` / `milestone` |

`none` 不自动创建分支，所有修改在主分支进行。`phase` 按每个 phase 创建独立分支，适合细粒度并行开发。`milestone` 按里程碑创建分支，适合长周期项目。

**推荐：** 单人项目或原型用 `"none"`；团队协作建议用 `"phase"` 获得分支隔离；大型项目用 `"milestone"`。

### 8.2 分支模板

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `git.phase_branch_template` | `string` | `"gsd/phase-{phase}-{slug}"` | phase 分支命名模板 |
| `git.milestone_branch_template` | `string` | `"gsd/{milestone}-{slug}"` | milestone 分支命名模板 |

模板支持 `{phase}`、`{slug}`、`{milestone}` 等占位符，GSD 在创建分支时自动替换为实际值。

**推荐：** 保持默认模板即可。如有组织命名规范可自定义前缀，如 `"feature/{phase}-{slug}"`。

### 8.3 标签设置：create_tag

| 属性 | 值 |
|------|-----|
| 字段 | `git.create_tag` |
| 类型 | `boolean` |
| 默认值 | `true` |

milestone 完成时是否自动创建 git tag。关闭可减少标签数量，但会丢失 milestone 的快速回溯点。

**推荐：** `true`。保留 milestone 标签便于回溯，标签本身不占存储。

### 8.4 Git 集成完整配置示例

```json
{
  "git": {
    "branching_strategy": "phase",
    "create_tag": true,
    "phase_branch_template": "gsd/phase-{phase}-{slug}",
    "milestone_branch_template": "gsd/{milestone}-{slug}"
  }
}
```

---

## 9. 确认门控

`gates.*` 域控制每一步是否需要用户确认，用于在安全和效率之间调整「审批粒度」。

### 9.1 门控字段一览

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `gates.confirm_project` | `boolean` | `true` | 项目初始化时确认 |
| `gates.confirm_phases` | `boolean` | `true` | 进入每个 phase 前确认 |
| `gates.confirm_roadmap` | `boolean` | `true` | 制定 roadmap 时确认 |
| `gates.confirm_breakdown` | `boolean` | `true` | breakdown 分解时确认 |
| `gates.confirm_plan` | `boolean` | `true` | 执行每个计划前确认 |
| `gates.execute_next_plan` | `boolean` | `true` | 执行下一个 plan 前确认 |
| `gates.issues_review` | `boolean` | `true` | issue 评审时确认 |
| `gates.confirm_transition` | `boolean` | `true` | 阶段切换时确认 |

所有门控默认 `true`，即每一步都需要用户确认。设定为 `false` 后对应步骤自动进行。在快速原型场景（配合 `mode: "yolo"`）可关闭大部分门控；生产发布场景建议全部保持开启。

**推荐：** 日常开发保持全部 `true`。原型开发（配合 `mode: "yolo"`）可关闭 `confirm_phases` 和 `confirm_plan` 提速。生产项目全部开启。

### 9.2 门控配置示例

```json
{
  "gates": {
    "confirm_project": true,
    "confirm_phases": true,
    "confirm_roadmap": true,
    "confirm_breakdown": true,
    "confirm_plan": true,
    "execute_next_plan": true,
    "issues_review": true,
    "confirm_transition": true
  }
}
```

---

## 10. 安全设置

`safety.*` 域的安全相关配置，控制 GSD 在敏感操作时的行为。

### 10.1 破坏性操作确认：always_confirm_destructive

| 属性 | 值 |
|------|-----|
| 字段 | `safety.always_confirm_destructive` |
| 类型 | `boolean` |
| 默认值 | `true` |

删除文件、回退提交等破坏性操作是否必须用户确认。修改文件数据但不触发破坏性操作不会受此限制。生产项目建议保持 `true`。

**推荐：** `true`。除非你清楚自己在做什么，不要关闭，误删文件不可逆。

### 10.2 外部服务确认：always_confirm_external_services

| 属性 | 值 |
|------|-----|
| 字段 | `safety.always_confirm_external_services` |
| 类型 | `boolean` |
| 默认值 | `true` |

调用外部 API 或服务前是否必须用户确认。关闭后 GSD 可自动调用已配置的第三方服务（如 Brave Search、Firecrawl 等），适合已授权的自动化场景。

**推荐：** `true`。只有当你信任当前环境中的所有第三方服务、且希望减少确认步骤时，才设为 `false`。

### 10.3 安全设置配置示例

```json
{
  "safety": {
    "always_confirm_destructive": true,
    "always_confirm_external_services": true
  }
}
```

---

## 11. Hook 设置

GSD 内置的钩子系统，在特定事件时触发警告或行为变更。

### 11.1 上下文警告：hooks.context_warnings

| 属性 | 值 |
|------|-----|
| 字段 | `hooks.context_warnings` |
| 类型 | `boolean` |
| 默认值 | `true` |

当 agent 上下文接近窗口上限时发出警告。开启后 GSD 会在上下文即将耗尽时通知用户，提醒分支或启动新的 phase。关闭警告不会阻止上下文耗尽，只是不通知。

**推荐：** `true`。保持开启，上下文耗尽通知能帮你及时分支，避免工作丢失。

### 11.2 工作流守卫：hooks.workflow_guard

| 属性 | 值 |
|------|-----|
| 字段 | `hooks.workflow_guard` |
| 类型 | `boolean` |
| 默认值 | `false` |

检测到用户在 GSD 控制的流程之外直接编辑文件时的警告行为。帮助维护工作流状态的一致性，避免手动修改导致 GSD 状态追踪出错。

**推荐：** `false`（默认）。日常开发保持关闭；如果你常被手动编辑导致状态不一致困扰，可改为 `true`。

### 11.3 Hook 配置示例

```json
{
  "hooks": {
    "context_warnings": true,
    "workflow_guard": true
  }
}
```

---

## 12. Agent 技能注入

`agent_skills` 配置如何为特定 agent 注入外部技能文件，扩展 agent 能力。

### 12.1 映射规则

`agent_skills` 是一个 key-value 结构，key 为 agent 类型名，value 为技能文件路径。

```json
{
  "agent_skills": {
    "gsd-debugger": "./skills/debug-assistant.md",
    "gsd-researcher": "./skills/custom-search-workflow.md",
    "gsd-planner": "global:project-planning"
  }
}
```

### 12.2 路径解析

支持三种路径格式：

| 格式 | 示例 | 说明 |
|------|------|------|
| 项目相对路径 | `"./skills/assistant.md"` | 相对于项目根目录解析 |
| 全局技能 | `"global:name"` | 从 GSD 全局技能库加载 |
| 插件技能 | `"global:plugin:skill"` | 从 GSD 插件系统的技能目录加载 |

Agent 技能注入是扩展 GSD 能力的强大机制，可用于添加自定义工具、领域知识或专属工作流。技能文件使用 Markdown 编写，遵循 GSD 技能格式规范。

---

## 13. Feature Flags

`features.*` 域下的实验性功能开关。

### 13.1 思维伙伴：features.thinking_partner

| 属性 | 值 |
|------|-----|
| 类型 | `boolean` |
| 默认值 | `false` |

启用后 GSD 在规划阶段提供类似「思维伙伴」的辅助会话能力，帮助用户通过对话深化问题理解。属于实验性功能，默认关闭。

**推荐：** `false`。实验性功能，了解后再开启。

### 13.2 跨项目学习：features.global_learnings

| 属性 | 值 |
|------|-----|
| 类型 | `boolean` |
| 默认值 | `false` |

启用后 GSD 可以跨项目共享和积累经验知识。开启后，一个项目的经验教训可在其他项目中复用。属于实验性功能，使用前需确认个人或团队对跨项目数据共享的合规要求。

**推荐：** `false`。实验性功能，有跨项目经验复用需求时再开启。

### 13.3 Feature Flags 配置示例

```json
{
  "features": {
    "thinking_partner": false,
    "global_learnings": false
  }
}
```

---

## 14. 代码质量与 Ship 设置

合并两个较小但相关的配置域——代码质量分析和发布流程控制。

### 14.1 代码质量：code_quality.fallow

Fallow 是 GSD 内置的结构性分析工具，用于检测代码中的异常模式、设计缺陷和潜在问题。

```json
{
  "code_quality": {
    "fallow": {
      "enabled": false,
      "profile": "standard"
    }
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `code_quality.fallow.enabled` | `boolean` | `false` | Fallow 分析主开关 |
| `code_quality.fallow.profile` | `string` | `"standard"` | 分析深度，可选 minimal/standard/strict（对应复杂度阈值 50/30/15） |

**推荐：** `enabled: false`（默认）。Fallow 是额外分析工具，非 GSD 核心功能，有结构性分析需求时再开启。`profile: "standard"` 已足够。

### 14.2 Ship 设置：ship.pr_body_sections

自定义 PR body 的章节模板，控制自动生成 PR 描述的内容结构。

```json
{
  "ship": {
    "pr_body_sections": ["summary", "changes", "testing", "notes"]
  }
}
```

| 属性 | 值 |
|------|-----|
| 字段 | `ship.pr_body_sections` |
| 类型 | `array` |
| 默认值 | `[]` |

每个章节对应 PR body 的一个 markdown 段落，GSD 在创建 PR 时自动填充。可自定义章节名和顺序。

**推荐：** `[]`（默认）。大多数场景下默认的 PR body 已满足需求，不需要额外章节。有团队规范需要附加内容时，参考官方文档配置自定义章节。

---

## 15. 管理与其他设置

本章涵盖 statusline、review、intel、learnings、capabilities 等管理类配置的速查。

### 15.1 状态行：statusline

控制 GSD 在 terminal 中状态行的显示内容。

```json
{
  "statusline": {
    "context_position": "end",
    "show_last_command": false
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `statusline.context_position` | `string` | `"end"` | 上下文窗口计量器位置：`"end"`（行尾）/ `"front"`（模型名后） |
| `statusline.show_last_command` | `boolean` | `false` | 是否在状态行末尾显示最近调用的斜杠命令 |

### 15.2 审查设置：review

代码审查流程的配置项，控制审查时的行为参数。主要涉及 `/gsd-review` 命令的默认行为和 reviewer 模型选择。

#### review.default_reviewers

| 属性 | 值 |
|------|-----|
| 字段 | `review.default_reviewers` |
| 类型 | `string[]` 或 `null` |
| 默认值 | `null`（全部检测到的 reviewer 均参与） |

控制在无参数运行 `/gsd-review` 时，默认使用哪些 reviewer。设为 `null` 时自动包含所有检测到的 reviewer；设为数组则限定为指定集合。

```json
{
  "review": {
    "default_reviewers": ["gemini", "codex"]
  }
}
```

**推荐配置**：
- **单 AI 环境**（默认只有 Claude）：保持 `null`，无需配置
- **多 AI 交叉审查**：通过 `/gsd:integrations` 配置多个 runtime 后，设置 `["gemini", "codex"]` 让每次审查自动获得多角度反馈
- **本地模型审查**：配合 Ollama/LM Studio 使用，设置 `["ollama"]`

#### review.models.&lt;cli>

| 属性 | 值 |
|------|-----|
| 字段 | `review.models.<cli>` |
| 类型 | `string` |
| 默认值 | `null`（使用会话模型） |

为每个 reviewer CLI 指定使用的模型 ID。支持的 CLI 包括 `claude`、`codex`、`gemini`、`opencode`。

```json
{
  "review": {
    "models": {
      "codex": "gpt-5",
      "gemini": "gemini-2.5-pro"
    }
  }
}
```

**推荐配置**：
- Claude：不设置则使用当前会话模型，建议保持默认
- Codex：使用 `gpt-5` 或当前最新稳定版本
- Gemini：使用 `gemini-2.5-pro` 获得最佳审查效果
- OpenCode：与 Claude 对齐时可设为 `claude-sonnet-4`

### 15.3 智能与学习：intel / learnings

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `intel` | `object` | `null` | 领域智能功能配置 |
| `learnings` | `object` | `null` | 跨会话学习行为配置 |

`intel` 控制 GSD 在特定领域的智能分析能力。`learnings` 控制 GSD 记住和复用经验的行为。

**推荐：** 两者均保持默认（`null`）。有跨会话学习需求时再配置 `learnings`。

### 15.4 能力注册：capabilities

注册和限制 GSD 可用的能力列表。通过显式列出允许的能力项来限制 GSD 的行为范围，属于高级安全控制。

| 属性 | 值 |
|------|-----|
| 类型 | `object` |
| 默认值 | `{}` |

**推荐：** `{}`（不设额外限制）。仅当需要管控第三方能力安装来源时才配置 `strict_known_registries`。

---

## 16. 典型配置组合场景

给出三种典型场景的完整 config.json 模板。可直接复制修改使用。

### 16.1 场景 A：原型开发

**特征**：快速迭代、自动推进、关闭冗余阶段。yolo 模式 + coarse 粒度 + 关闭研究/验证。

```json
{
  "mode": "yolo",
  "granularity": "coarse",
  "model_profile": "balanced",

  "workflow": {
    "research": false,
    "verifier": false,
    "plan_check": false,
    "auto_advance": true,
    "code_review": false
  },

  "parallelization": {
    "enabled": true,
    "plan_level": true,
    "task_level": true,
    "max_concurrent_agents": 5
  },

  "gates": {
    "confirm_phases": false,
    "confirm_plan": false,
    "confirm_transition": false
  },

  "planning": {
    "commit_docs": false
  }
}
```

**适用场景**：个人项目、功能验证、hackathon。牺牲流程严谨性换取速度。

### 16.2 场景 B：日常正常开发

**特征**：默认 balanced 配置 + 适量门控 + 开启研究/验证。推荐给大多数项目使用。

```json
{
  "mode": "interactive",
  "granularity": "standard",
  "model_profile": "balanced",

  "context": "本项目使用分层架构，遵循单一职责原则。",

  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true,
    "code_review": true,
    "code_review_depth": "standard",
    "auto_advance": false,
    "use_worktrees": true
  },

  "git": {
    "branching_strategy": "phase",
    "create_tag": true
  },

  "parallelization": {
    "enabled": true,
    "plan_level": true,
    "task_level": false,
    "max_concurrent_agents": 3
  },

  "gates": {
    "confirm_project": true,
    "confirm_phases": true,
    "confirm_plan": true,
    "confirm_transition": true
  },

  "hooks": {
    "context_warnings": true,
    "workflow_guard": true
  }
}
```

**适用场景**：团队协作项目、内部工具开发、需要适度流程保障但不苛求严格审批的场景。

### 16.3 场景 C：生产发布

**特征**：严格门控 + 全开验证 + 自动分支管理。最大安全保障。

```json
{
  "mode": "interactive",
  "granularity": "fine",
  "model_profile": "quality",

  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true,
    "code_review": true,
    "code_review_depth": "deep",
    "auto_advance": false,
    "use_worktrees": true,
    "tdd_mode": true,
    "nyquist_validation": true,
    "security_enforcement": true,
    "node_repair": true
  },

  "git": {
    "branching_strategy": "milestone",
    "create_tag": true,
    "phase_branch_template": "feature/{phase}-{slug}",
    "milestone_branch_template": "release/{milestone}-{slug}"
  },

  "parallelization": {
    "enabled": true,
    "plan_level": true,
    "task_level": false,
    "max_concurrent_agents": 2
  },

  "gates": {
    "confirm_project": true,
    "confirm_phases": true,
    "confirm_roadmap": true,
    "confirm_breakdown": true,
    "confirm_plan": true,
    "execute_next_plan": true,
    "issues_review": true,
    "confirm_transition": true
  },

  "safety": {
    "always_confirm_destructive": true,
    "always_confirm_external_services": true
  },

  "hooks": {
    "context_warnings": true,
    "workflow_guard": true
  },

  "code_quality": {
    "fallow": {
      "enabled": false,
      "profile": "strict"
    }
  },

  "ship": {
    "pr_body_sections": ["summary", "changes", "testing", "notes"]
  }
}
```

**适用场景**：面向客户的生产服务、金融/合规敏感项目、多人团队的大型项目。每个关键节点都有审批环节，最大程度保证代码质量和流程安全。

### 16.4 场景选择指南

| 维度 | 原型开发 | 日常开发 | 生产发布 |
|------|---------|---------|---------|
| 速度 | 最快 | 适中 | 最慢 |
| 安全性 | 最低 | 中等 | 最高 |
| 适用团队规模 | 单人 | 1-5 人 | 2+ 人 |
| 代码审查 | 跳过 | standard | deep |
| 分支管理 | 无 | phase | milestone |
| 门控密度 | 低 | 中 | 全开 |

---

## 附录 A：配置域索引表

按字母序列出所有配置顶级字段，标注所属域、本文章节号、默认值，作为快速查找索引。

| 字段 | 类型 | 默认值 | 所属域 | 章节 |
|------|------|--------|--------|------|
| `agent_skills` | `object` | `{}` | Agent 技能 | 12 |
| `claude_md_path` | `string` | `"./.claude/CLAUDE.md"` | 项目基础 | 3 |
| `code_quality` | `object` | 见 14.1 节 | 代码质量 | 14 |
| `planning.commit_docs` | `boolean` | `true` | 项目基础 | 3 |
| `context` | `string` | `null` | 上下文 | 5 |
| `context_profile` | `string` | 无 | 上下文 | 5 |
| `context_window` | `number` | `200000` | 上下文 | 5 |
| `dynamic_routing` | `object` | `null` | 模型（交叉引用） | 4 |
| `effort` | `object` | `{"default":"high"}` | 模型（交叉引用） | 4 |
| `fast_mode` | `object` | `{"enabled":false}` | 模型（交叉引用） | 4 |
| `features` | `object` | `{}` | Feature Flags | 13 |
| `gates` | `object` | 全 true | 确认门控 | 9 |
| `git` | `object` | 见第 8 章 | Git | 8 |
| `granularities` | `object` | `{}` | 模型（交叉引用） | 4 |
| `granularity` | `enum` | `"standard"` | 项目基础 | 3 |
| `hooks` | `object` | 见第 11 章 | Hook | 11 |
| `intel` | `object` | `null` | 管理 | 15 |
| `learnings` | `object` | `null` | 管理 | 15 |
| `mode` | `enum` | `"interactive"` | 项目基础 | 3 |
| `model_overrides` | `object` | `{}` | 模型（交叉引用） | 4 |
| `model_policy` | `object` | 无 | 模型（交叉引用） | 4 |
| `model_profile` | `enum` | `"balanced"` | 模型（交叉引用） | 4 |
| `models` | `object` | `{}` | 模型（交叉引用） | 4 |
| `parallelization` | `object` | 见第 7 章 | 并行化 | 7 |
| `phase_id_convention` | `string` | `null` | 项目基础 | 3 |
| `phase_naming` | `string` | `null` | 项目基础 | 3 |
| `project_code` | `string` | `null` | 项目基础 | 3 |
| `resolve_model_ids` | `boolean`/`string` | `false` | 模型（交叉引用） | 4 |
| `response_language` | `string` | `null` | 上下文 | 5 |
| `review` | `object` | 见 15.2 节 | 管理 | 15 |
| `runtime` | `string` | 无 | 模型（交叉引用） | 4 |
| `safety` | `object` | 见第 10 章 | 安全 | 10 |
| `ship` | `object` | 见 14.2 节 | Ship 设置 | 14 |
| `statusline` | `object` | 见 15.1 节 | 管理 | 15 |
| `workflow` | `object` | 见第 6 章 | 工作流 | 6 |
| `capabilities` | `object` | `{}` | 管理 | 15 |

---

## 附录 B：兼容性与版本说明

### B.1 本文基准版本

本文基于 npm 包 `@opengsd/gsd-core` 编写。配置字段在不同版本中的引入和变更情况如下表。

### B.2 字段版本记录

| 字段 | 引入版本 | 变更说明 |
|------|---------|---------|
| 大部分基础字段 | v1.0 | 首发 |
| `context_profile` | v1.34 | 执行上下文预设 |
| `effort` | v1.42 | 统一 effort 入口，取代 reasoning_effort |
| `fast_mode` | v1.42 | 快速模式 |
| `model_policy` | v1.42 | provider-neutral preset |
| `granularities` | v1.43 | per-phase_type 粒度覆盖 |
| `features.global_learnings` | v1.40+ | 跨项目学习 |
| `features.thinking_partner` | v1.40+ | 思维伙伴 |

### B.3 升级注意事项

- **v1.42 新增的 `effort` 字段**不破坏旧配置，旧版 `reasoning_effort` 在 provider preset 中仍然有效但降级为 runtime-specific 原始字段
- **全量 workflow 开关**：如果从旧版本升级且 config.json 中缺少某个 workflow 开关，GSD 会将缺失键视为 true（启用），无需手动补齐
- 建议每次 GSD 主版本升级后跑一次 `node gsd-tools.cjs config-get model_profile` 验证配置可正常解析
