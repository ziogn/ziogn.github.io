---
title: GSD-Core 配置文件完整解读
date: "2026-06-24 10:00"
updated: "2026-07-22 17:15"
tags: [gsd, gsd-core, config, reference, guide]
description: "GSD-Core .planning/config.json 的完整配置参考手册，覆盖全部配置字段的释义、默认值和使用场景"
version: 0.3.0
author: ziogn
aliases: [gsd-core config.json, GSD 配置参考]
source: "https://github.com/open-gsd/gsd-core"
---


# GSD-Core 配置文件完整解读

> 本文基于 open-gsd/gsd-core 仓库（npm 包 `@opengsd/gsd-core` v1.7.0-rc.6）撰写，定位为配置参考手册。与已有文档 [GSD-gsd-core 模型解析与 Agent 模型切换](/GSD-gsd-core%20%E6%A8%A1%E5%9E%8B%E8%A7%A3%E6%9E%90%E4%B8%8E%20Agent%20%E6%A8%A1%E5%9E%8B%E5%88%87%E6%8D%A2/) 互补——本文聚焦模型配置之外的所有配置域，模型相关字段仅列出名称和默认值，详细解读指向该文档。

---

## 1. 配置总览

### 1.1 目标读者

使用 GSD-Core 进行项目开发、需要自定义行为或排查配置问题的开发者。本文默认读者已了解 GSD 基本概念（plan、phase、workstream、agent）。

### 1.2 配置域全景图

`.planning/config.json` 的配置按用途分为 15+ 个域，加上模型配置域（本文仅做交叉引用），总计约 90+ 可配置字段。

| 配置域 | 字段数量 | 本文章节 | 说明 |
|--------|---------|---------|------|
| 项目基础 | 8 | 第 3 章 | 运行模式、粒度、项目标识、planning 子域 |
| 模型配置 | 15+ | 第 4 章（交叉引用） | profile、override、routing、policy 等 |
| 上下文与运行时 | 6 | 第 5 章 | prompt 注入、窗口大小、语言、CLAUDE.md 组装 |
| 搜索 API 集成 | 7 | 第 5 章 | 搜索引擎 API key 配置 |
| 工作流开关 | ~40 | 第 6 章 | 各阶段开关、自动推进、审查、守卫 |
| 并行化 | 6 | 第 7 章 | 多 agent 并行执行 |
| Git 集成 | 6 | 第 8 章 | 分支策略、标签、模板 |
| 确认门控 | 8 | 第 9 章 | 用户审批粒度 |
| 安全 | 3 | 第 10 章 | 破坏性操作、外部服务、注入防护 |
| Hook | 2 | 第 11 章 | 上下文警告、工作流守卫 |
| Agent 技能 | 动态 | 第 12 章 | 技能文件注入 + 安全配置 |
| Feature Flags | 2 | 第 13 章 | 实验性功能 |
| 代码质量与 Ship | 动态 | 第 14 章 | Fallow 分析、PR 模板 |
| 管理设置 | 6+ | 第 15 章 | 状态行、审查、intel、learnings、能力注册 |
| Worktree 设置 | 1 | 第 8 章附录 | settings.local.json 中的 worktree 配置 |

### 1.3 与模型配置教程的分工

[GSD-gsd-core 模型解析与 Agent 模型切换](/GSD-gsd-core%20%E6%A8%A1%E5%9E%8B%E8%A7%A3%E6%9E%90%E4%B8%8E%20Agent%20%E6%A8%A1%E5%9E%8B%E5%88%87%E6%8D%A2/) 已详细覆盖 `model_profile`、`model_overrides`、`models`、`dynamic_routing`、`model_policy`、`effort`、`fast_mode`、`runtime`、`resolve_model_ids`、`granularities` 等字段。本文第 4 章仅给出这些字段的名录、默认值和新增字段说明，不做深入展开。

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
gsd-tools query config-path
# 或旧版：
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
| CLI | `gsd-tools config-set <key> <value>`（v1.7+） | 脚本化、单值修改 |
| CLI | `gsd-tools query config-get <key>`（支持点号嵌套） | 读取某个配置项 |
| CLI | `node gsd-tools.cjs config-set/config-get`（旧版） | 旧版兼容 |
| 手动编辑 | 直接编辑 `.planning/config.json` | 复杂多字段修改 |
| 向导 | `/gsd:new-project` | 首次创建项目 |

**改完无需重启**：`loadConfig()` 每次调用都重新读文件，无内存缓存。

---

## 3. 项目基础设置

本章解读与项目身份、运行模式、planning 目录行为相关的基础字段。所有字段与模型配置教程**不重叠**。

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
| `phase_id_convention` | `enum` | `null` | phase ID 命名约定（`null` = 数字 ID；`"milestone-prefixed"` = 编码里程碑的唯一 ID） |

`project_code` 在多项目工作区中特别有用——每个项目的 phase 目录带有唯一前缀，避免混淆。例如设置 `"ABC"` 后，phase 目录名可能变为 `ABC-planning-001`。

`phase_id_convention` 在 v1.43+ 引入 `"milestone-prefixed"` 选项，使 phase ID 编码包含里程碑信息（如 `Phase 1-01`），适合多里程碑项目。迁移现有项目需运行 `gsd-tools roadmap upgrade --convention milestone-prefixed`。

**推荐：** 单项目保持 `null`；多项目工作区设 `project_code` 为项目缩写。`phase_id_convention` 仅在多里程碑复杂项目中使用。

### 3.4 输出路径与 CLAUDE.md：claude_md_path / claude_md_assembly

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `claude_md_path` | `string` | `"./.claude/CLAUDE.md"` | CLAUDE.md 的写入路径 |
| `claude_md_assembly.mode` | `enum` | `"embed"` | CLAUDE.md 组装模式：`"embed"`（内联内容）/ `"link"`（引用链接） |

`claude_md_path` 控制 GSD 生成的 CLAUDE.md 存放位置。如果项目中已有手动维护的 CLAUDE.md，可指定不同路径避免冲突。默认路径 `./.claude/CLAUDE.md` 是项目级记忆位置的合理选择，避免污染手工维护的仓库根 `CLAUDE.md`。

`claude_md_assembly.mode` 为 `"link"` 时，GSD 写入 `@.planning/<source-path>` 引用链接而非内联内容。详见第 5.5 节。

### 3.5 Planning 目录行为：planning.* 

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `planning.commit_docs` | `boolean` | `true` | `.planning/` 目录是否纳入 git 提交 |
| `planning.search_gitignored` | `boolean` | `false` | 全局搜索时是否包含 `.planning/` 目录 |
| `planning.sub_repos` | `string[]` | `[]` | 嵌套子仓库相对路径列表 |

`commit_docs` 设为 `false` 时，`.planning/` 目录不提交到 git。如果 `.planning/` 在 `.gitignore` 中，GSD 会自动将 `commit_docs` 视为 `false`。

`search_gitignored` 为 `true` 时，GSD 在代码搜索中增加 `--no-ignore` 标志以确保 `research` 等阶段能搜索到 `.planning/` 目录下的文件。在 `commit_docs: false` 且 `.planning/` 被 gitignore 的场景中特别有用。

`sub_repos` 用于多仓库工作区配置，列出项目根下嵌套的子仓库相对路径。设置后，GSD 按子仓库范围处理 phase 查找和提交操作。

**推荐：** 三个字段均保持默认值。`search_gitignored` 仅在需要搜索 `.planning/` 内部时启用。`sub_repos` 只在多仓库工作区中使用。

---

## 4. 模型配置字段一览（交叉引用）

本章仅列出模型配置相关的顶级字段名和默认值，详细解读请移步 [GSD-gsd-core 模型解析与 Agent 模型切换](/GSD-gsd-core%20%E6%A8%A1%E5%9E%8B%E8%A7%A3%E6%9E%90%E4%B8%8E%20Agent%20%E6%A8%A1%E5%9E%8B%E5%88%87%E6%8D%A2/)。

| 字段 | 类型 | 默认值 | 一句话说明 |
|------|------|--------|-----------|
| `model_profile` | `enum` | `"balanced"` | 全局模型策略，5 选 1（quality/balanced/budget/adaptive/inherit）。**v1.34 新增 `adaptive`** |
| `model_profile_overrides` | `object` | 无 | v1.39 新增，按 `(runtime, tier)` 覆盖运行时感知的模型映射 |
| `model_overrides` | `object` | `{}` | 单 agent 精确覆盖，优先级最高 |
| `models` | `object` | `{}` | 按 phase_type 设模型（planning/research/execution 等） |
| `dynamic_routing` | `object` | `null` | 动态路由 + 失败自动升级（默认关闭） |
| `model_policy` | `object` | 无 | v1.42 provider-neutral preset，含 `provider`（如 openai/anthropic）、`budget`（high/medium/low）、`high`/`medium`/`low`（自定义模型 ID）及 `runtime_tiers` 子字段 |
| `model_policy.runtime_tiers` | `object` | 无 | v1.42 新增，显式 per-runtime tier 模型映射 |
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

注入到每个 agent prompt 的统一上下文文本，适合放置项目专属公约、架构约定、编码规范等。内容会追加到每个 agent 的系统提示中。

**推荐：** 视项目需要填写。团队项目建议写入核心架构约定，让每个 agent 自动遵守。

### 5.2 上下文窗口：context_window

| 属性 | 值 |
|------|-----|
| 类型 | `number` |
| 默认值 | `200000` |

控制 GSD 为 agent 分配的上下文窗口 token 数。对于支持 1M 上下文的模型（如 Claude Sonnet 4），可设为 `1000000`。**注意**：值 >= 500000 时启用自适应上下文增强（对之前的 SUMMARY.md 做全文读取、更深的反模式分析）。

**推荐：** `200000`（默认值）。使用 1M 上下文模型时才考虑增大，但需注意 token 消耗翻倍。

### 5.3 上下文预设：context_profile

| 属性 | 值 |
|------|-----|
| 类型 | `string` |
| 默认值 | 无 |
| 可选值 | `dev` / `research` / `review` |

v1.34 引入的执行上下文预设，自动调整 prompt 风格适配不同任务。`dev` 偏执行导向，`research` 偏探索分析，`review` 偏审查改进。

**推荐：** 日常开发保持不设（使用默认 prompt 风格）。针对专项任务时临时使用即可。

### 5.4 响应语言：response_language

| 属性 | 值 |
|------|-----|
| 类型 | `string` |
| 默认值 | `null`（跟随会话语言） |

控制 GSD agent 回复的语言偏好，值为语言代码（如 `"zh"` 表示中文、`"ja"` 表示日语）。

**推荐：** `null`（不设，跟随会话语言）。只在多语言团队中需要统一 agent 输出语言时才设置。

### 5.5 CLAUDE.md 组装模式：claude_md_assembly

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `claude_md_assembly.mode` | `enum` | `"embed"` | 写入方式：`"embed"`（内联内容）/ `"link"`（引用链接，减少 CLAUDE.md 约 65% 体积） |
| `claude_md_assembly.blocks.<section>` | `enum` | 继承顶层 mode | 按 block 类型单独覆盖链接模式 |

**推荐：** `"embed"`（默认）。大型项目可改为 `"link"` 减少 CLAUDE.md 体积。

### 5.6 搜索 API 集成设置

GSD 支持多种搜索引擎和数据采集 API，可通过配置直接设置 API key 或覆盖自动检测。有两种配置方式：直接设 key（字符串）或手动开关（true/false/null）。值 `true` 表示强制启用（跳过环境变量检查），`false` 强制禁用，`null` 表示自动检测环境变量或 `~/.gsd/*_api_key` 文件。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `brave_search` | `string\|boolean\|null` | 自动检测 | Brave Search API key 或开关 |
| `firecrawl` | `string\|boolean\|null` | 自动检测 | Firecrawl 深度爬取 API |
| `exa_search` | `string\|boolean\|null` | 自动检测 | Exa Search 语义搜索 API |
| `tavily_search` | `string\|boolean\|null` | 自动检测 | Tavily Search API |
| `ref_search` | `string\|boolean\|null` | 自动检测 | 文档发现瀑布流中的 Ref 搜索 API |
| `perplexity` | `string\|boolean\|null` | 自动检测 | Perplexity API |
| `jina` | `string\|boolean\|null` | `true`（默认可用） | Jina API，文档瀑布流终端兜底项 |

**安全说明**：在 CLI 和日志输出中，API key 会被遮盖显示——长度 >= 8 的 key 显示为 `****<last-4>`，短 key 显示为 `****`。但 key 明文会写入 `.planning/config.json`，该文件本身就是安全边界。

**推荐：** 大多数场景保持 `null`（自动检测）。需要通过 `/gsd:config --integrations` 交互式配置。

---

## 6. 工作流开关

工作流域是 GSD `config.json` 中配置项最多的域（约 40 个子键），控制着 GSD 开发流程的各个执行阶段和行为。**核心约定**：当键在 config.json 中完全缺失时，GSD 按 **absent = enabled** 模式将所有 workflow 开关视为 `true`。各字段在 schema 中定义的显式默认值不同，请逐字段确认。

### 6.1 阶段开关

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `workflow.research` | `boolean` | `true` | 是否在规划前执行研究阶段 |
| `workflow.plan_check` | `boolean` | `true` | 计划检查开关（最多 3 次迭代）|
| `workflow.verifier` | `boolean` | `true` | 执行后验证阶段开关 |
| `workflow.ai_integration_phase` | `boolean` | `true` | AI 集成阶段向导开关 |
| `workflow.api_coverage_gate` | `boolean` | `true` | API 覆盖门控：集成外部 API 的 phase 在验证前需完成覆盖矩阵 |

关闭研究阶段（research）可加快迭代速度，但会失去外部资料搜索能力。关闭验证阶段（verifier）适用于原型开发，生产项目建议保持开启。

**推荐：** 日常开发全部保持 `true`。原型开发可关掉 `research` 和 `verifier`。

### 6.2 自动推进与自动化：auto_advance / discuss_mode / skip_discuss / text_mode

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `workflow.auto_advance` | `boolean` | `false` | 阶段完成后自动推进，无需用户确认 |
| `workflow.discuss_mode` | `string` | `"discuss"` | 讨论阶段模式：`"discuss"`（逐问题提问）/ `"assumptions"`（先读代码生成假设，用户只需纠正） |
| `workflow.skip_discuss` | `boolean` | `false` | 跳过讨论阶段，`/gsd:autonomous` 时直接写 CONTEXT.md |
| `workflow.text_mode` | `boolean` | `false` | 用纯文本编号列表替代 AskUserQuestion TUI 菜单。在 Claude Code 远程会话（`/rc` 模式）中必须开启 |

**推荐：** `auto_advance: false`（保持阶段确认）。`discuss_mode: "discuss"`。`skip_discuss: false`。`text_mode: false`。

### 6.3 代码审查：code_review / code_review_depth

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `workflow.code_review` | `boolean` | `true` | 是否执行代码审查 |
| `workflow.code_review_depth` | `string` | `"standard"` | 审查深度：`"quick"`（仅模式匹配）/ `"standard"`（逐文件分析）/ `"deep"`（跨文件 + 导入图） |

`code_review` 控制 `/gsd:code-review` 和 `/gsd:code-review --fix` 命令是否可用。设为 `false` 时命令退出并提示已禁用。`code_review_depth` 新增 `"quick"` 级（v1.34），适合大规模变更时的快速预检。

**推荐：** `code_review: true`（开启审查），`code_review_depth: "standard"`。生产项目可提升为 `"deep"`。

### 6.4 工作树：use_worktrees / worktree_skip_hooks

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `workflow.use_worktrees` | `boolean` | `true` | 是否使用 git worktree 隔离并行分支 |
| `workflow.worktree_skip_hooks` | `boolean` | `false` | worktree 中的执行 agent 是否跳过 git hooks |

`use_worktrees` 默认 `true`，但有两个重要例外：
- **分支偏离**：当当前分支偏离 `origin/HEAD` 时，GSD 自动降级为串行执行并打印警告。可通过设置 `worktree.baseRef: "head"`（在 `.claude/settings.local.json` 中）恢复并行。
- **非 Claude 运行时**：Codex、Gemini、Cursor 等运行时**不支持** worktree，安装时自动设为 `false`，不要强制开启。

`worktree_skip_hooks: true` 时，worktree 中的执行 agent 使用 `--no-verify` 跳过 pre-commit hooks，钩子验证在合并后统一运行。适合 hooks 无法在 worktree 中正常执行的项目。

**推荐：** `use_worktrees: true`（Claude 运行时）。`worktree_skip_hooks: false`（保持 hooks 验证）。

### 6.5 计划与迭代：plan_bounce / plan_chunked / plan_review_convergence / inline_plan_threshold

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `workflow.plan_bounce` | `boolean` | `false` | 启用外部计划验证脚本 |
| `workflow.plan_bounce_script` | `string` | `null` | plan_bounce 调用的验证脚本路径 |
| `workflow.plan_bounce_passes` | `number` | `2` | 顺序反弹次数，每轮上次输出回送给验证器 |
| `workflow.plan_chunked` | `boolean` | `false` | 启用分块规划：将长 planner 任务分解为短 outline + 多个短 plan 任务 |
| `workflow.plan_review_convergence` | `boolean` | `false` | 启用 `/gsd:plan-review-convergence` 命令，自动执行 计划→审查→重规划 循环 |
| `workflow.inline_plan_threshold` | `number` | `3` | phase 任务数超过此值时生成独立 PLAN.md 而非内联任务 |

`plan_chunked` 在 Windows 上特别有用——长 planner 任务可能因 stdio 挂起，分块后每个 plan 单独提交。`plan_review_convergence` 自动跨 AI 审查计划并迭代优化。

**推荐：** 全部保持默认。`plan_bounce`、`plan_chunked`、`plan_review_convergence` 默认 `false` 即可。

### 6.6 时间控制：subagent_timeout / test_gate_timeout / cross_ai_timeout

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `workflow.subagent_timeout` | `number`（毫秒）| `300000`（5 分钟）| 并行子 agent 超时 |
| `workflow.test_gate_timeout` | `number`（秒）| `600`（10 分钟）| 测试门控超时，防止 vitest/jest watch 模式挂起 |
| `workflow.cross_ai_timeout` | `number`（秒）| `300`（5 分钟）| 跨 AI 执行命令超时 |

**推荐：** `subagent_timeout: 300000`（5 分钟）。代码库极大时可增大到 `600000`。`test_gate_timeout: 600`、`cross_ai_timeout: 300` 保持默认。

### 6.7 安全与验证：security_enforcement / security_asvs_level / security_block_on / nyquist_validation / assumption_delta

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `workflow.security_enforcement` | `boolean` | `true` | 安全策略强制执行 |
| `workflow.nyquist_validation` | `boolean` | `true` | 奈奎斯特验证（计划阶段测试覆盖映射）|
| `workflow.security_asvs_level` | `number` | `1` | OWASP ASVS 验证等级 |
| `workflow.security_block_on` | `string` | `"high"` | 阻断 phase 推进的最低威胁等级 |
| `workflow.assumption_delta` | `boolean` | `true` | 规划时发现假设变更（单数→复数/必选→可选）时发出架构检查点 |

**推荐：** 所有安全开关保持 `true`。生产项目务必保持开启；原型开发可关掉 `nyquist_validation` 以加速。

### 6.8 其他开关速览

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `workflow.node_repair` | `true` | 验证失败时自动修复任务 |
| `workflow.node_repair_budget` | `2` | 每个失败任务的最大修复尝试次数 |
| `workflow.human_verify_mode` | `"end-of-phase"` | 人工验证模式：`"end-of-phase"`（阶段末检查）/ `"mid-flight"`（嵌入阻塞检查点）|
| `workflow.post_planning_gaps` | `true` | 规划后生成需求覆盖率差距报告 |
| `workflow.build_command` | `null` | 自定义构建命令，未设时自动检测 |
| `workflow.test_command` | `null` | 自定义测试命令，未设时自动检测 |
| `workflow.cross_ai_execution` | `false` | 启用跨 AI 执行 |
| `workflow.cross_ai_command` | `null` | 跨 AI 执行命令模板 |
| `workflow.code_review_command` | `null` | 外部代码审查集成命令 |
| `workflow.context_guard_mode` | `"warn"` | 上下文耗尽守卫：`"warn"`（警告）/ `"auto"`（自动暂停）/ `"off"`（关闭）|
| `workflow.auto_prune_state` | `false` | 自动清理 STATE.md 过期条目 |
| `workflow.pattern_mapper` | `true` | 在新文件与已有代码库之间运行模式映射 |
| `workflow.research_before_questions` | `false` | 讨论阶段先研究再提问 |
| `workflow.max_discuss_passes` | `3` | 讨论阶段最大轮次数 |
| `workflow.tdd_mode` | `false` | TDD 模式：执行时强制执行 RED/GREEN/REFACTOR 门控 |
| `workflow.mvp_mode` | `false` | MVP 模式：每个 phase 以垂直切片方式交付单一可见功能 |
| `workflow.ui_phase` | `true` | UI 设计契约生成开关 |
| `workflow.ui_safety_gate` | `true` | UI phase 前提示运行 `/gsd:ui-phase` 的安全门控 |
| `workflow.ui_review` | `true` | 自主模式下的 UI 视觉质量审查 |
| `workflow.drift_threshold` | `3` | 触发代码库漂移检测的最小新增结构元素数 |
| `workflow.drift_action` | `"warn"` | 漂移超阈值时行为：`"warn"`（建议重新映射）/ `"auto-remap"`（自动触发）|
| `workflow.plan_drift_precheck` | `true` | 规划前的非阻塞代码库漂移预检查 |

---

## 7. 并行化设置

控制 GSD 如何并行执行多个 plan，是提升开发效率的关键配置域。

> `parallelization` 顶层字段也可作为布尔简写使用：`"parallelization": false` 等价于 `"parallelization": {"enabled": false}`，用于快速禁用所有并行执行。

### 7.1 主开关与维度

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `parallelization.enabled` | `boolean` | `true` | 并行主开关 |
| `parallelization.plan_level` | `boolean` | `true` | 计划级并行 |
| `parallelization.task_level` | `boolean` | `false` | 任务级并行 |
| `parallelization.skip_checkpoints` | `boolean` | `true` | 并行时跳过非关键检查点 |

`plan_level` 控制多个 plan 是否可同时执行。`task_level` 更为精细，控制单个 plan 内的任务级并行，默认关闭。`skip_checkpoints` 在并行执行时跳过非关键检查点以加速，默认已启用。

**推荐：** `enabled: true`、`plan_level: true`、`task_level: false`、`skip_checkpoints: true`。

### 7.2 并行度控制

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `parallelization.max_concurrent_agents` | `number` | `3` | 最大并发 agent 数 |
| `parallelization.min_plans_for_parallel` | `number` | `2` | 启动并行所需的最小 plan 数 |

**推荐：** `max_concurrent_agents: 3`（默认）。普通项目 3-5 即可；API 限流严重的项目降到 2。`min_plans_for_parallel: 2` 保持默认。

### 7.3 并行化完整配置示例

```json
{
  "parallelization": {
    "enabled": true,
    "plan_level": true,
    "task_level": false,
    "skip_checkpoints": true,
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
| `git.quick_branch_template` | `string` | `null` | quick 模式分支命名模板 |

模板支持 `{phase}`、`{slug}`、`{milestone}` 等占位符，GSD 在创建分支时自动替换为实际值。`quick_branch_template` 用于快速模式。

### 8.3 额外设置：base_branch / create_tag

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `git.base_branch` | `string` | `"main"` | 基础分支名 |
| `git.create_tag` | `boolean` | `true` | milestone 完成时是否自动创建 git tag |

**推荐：** `base_branch: "main"`（如使用 `master` 则改为 `"master"`）。`create_tag: true` 保留 milestone 标签便于回溯。

### 8.4 Worktree 分支基线（settings.local.json）

> **位置**：`.claude/settings.local.json`，**不是** `.planning/config.json`。这是本文唯一一个不在 config.json 中的设置项。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `worktree.baseRef` | `string` | 无 | worktree 基线分支。未设时使用 `origin/HEAD`；分支偏离时设 `"head"` 使用本地 HEAD 恢复并行执行 |

可通过 `gsd-tools worktree set-baseref` 命令设置。此设置与 `git.branching_strategy` 配合使用——分支策略决定何时创建新分支，baseRef 决定新 worktree 从哪个基线派生。

### 8.5 Git 集成完整配置示例

```json
{
  "git": {
    "branching_strategy": "phase",
    "base_branch": "main",
    "create_tag": true,
    "phase_branch_template": "gsd/phase-{phase}-{slug}",
    "milestone_branch_template": "gsd/{milestone}-{slug}",
    "quick_branch_template": null
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

所有门控默认 `true`，即每一步都需要用户确认。

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

`safety.*` 和 `security.*` 域的安全相关配置，控制 GSD 在敏感操作时的行为。

### 10.1 破坏性操作确认：always_confirm_destructive

| 属性 | 值 |
|------|-----|
| 字段 | `safety.always_confirm_destructive` |
| 类型 | `boolean` |
| 默认值 | `true` |

删除文件、回退提交等破坏性操作是否必须用户确认。

**推荐：** `true`。不要关闭，误删文件不可逆。

### 10.2 外部服务确认：always_confirm_external_services

| 属性 | 值 |
|------|-----|
| 字段 | `safety.always_confirm_external_services` |
| 类型 | `boolean` |
| 默认值 | `true` |

调用外部 API 或服务前是否必须用户确认。

**推荐：** `true`。只有当你信任当前环境中的所有第三方服务时才设为 `false`。

### 10.3 Prompt 注入防护：security.injection_blocking

| 属性 | 值 |
|------|-----|
| 字段 | `security.injection_blocking` |
| 类型 | `boolean` |
| 默认值 | `false` |

启用 prompt 注入阻塞防护。开启后 GSD 更严格地检测和阻止 prompt 注入攻击。默认关闭以保持兼容性。

**推荐：** `false`（默认）。如果项目常与不可信内容交互（如用户提交的代码审查），可设为 `true`。

### 10.4 安全设置配置示例

```json
{
  "safety": {
    "always_confirm_destructive": true,
    "always_confirm_external_services": true
  },
  "security": {
    "injection_blocking": false
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

当 agent 上下文接近窗口上限时发出警告。

**推荐：** `true`。保持开启。

### 11.2 工作流守卫：hooks.workflow_guard

| 属性 | 值 |
|------|-----|
| 字段 | `hooks.workflow_guard` |
| 类型 | `boolean` |
| 默认值 | `false` |

检测到用户在 GSD 控制的流程之外直接编辑文件时的警告行为。帮助维护工作流状态一致性。

**推荐：** `false`（默认）。如果你常被手动编辑导致状态不一致困扰，可改为 `true`。

### 11.3 Hook 配置示例

```json
{
  "hooks": {
    "context_warnings": true,
    "workflow_guard": false
  }
}
```

---

## 12. Agent 技能注入

`agent_skills` 配置如何为特定 agent 注入外部技能文件，扩展 agent 能力。GSD 采用**双向注入**机制：编排器和 agent 自身各自独立加载技能。

### 12.1 技能配置

```json
{
  "agent_skills": {
    "gsd-executor": [
      "skills/testing-standards",
      "global:shared-conventions",
      "global:coderabbit:code-review"
    ],
    "gsd-planner": ["skills/architecture-rules"],
    "gsd-verifier": ["skills/acceptance-criteria"]
  }
}
```

每个值现在为**数组**形式（v1.7+），可配置多个技能条目。

### 12.2 技能条目格式

| 格式 | 示例 | 说明 |
|------|------|------|
| 项目相对路径 | `"skills/my-skill"` | 解析为 `<项目>/skills/my-skill/SKILL.md` |
| 全局个人技能 | `"global:<name>"` | 解析为 `~/.claude/skills/<name>/SKILL.md` |
| 插件技能（Claude only） | `"global:<plugin>:<skill>"` | 通过 Skill 工具按名称加载，**仅 Claude Code 支持** |

### 12.3 技能安全配置：agent_skills_security

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `agent_skills_security.trusted_global_roots` | `string[]` | `[]` | 额外信任的全局技能根目录白名单 |

默认情况下，`global:<name>` 技能如果其解析后的真实路径（解析符号链接后）逃逸了运行时的全局技能目录，会被拒绝加载。通过此字段可声明额外的信任根目录，适合将团队技能仓库通过符号链接共享的场景。

```json
{
  "agent_skills_security": {
    "trusted_global_roots": [
      "~/shared/skills",
      "/opt/shared-skills"
    ]
  }
}
```

**安全限制**：文件系统根 `/`、家目录本身不允许设置为信任根。每个条目必须是绝对路径或以 `~/` 开头的路径。

**推荐：** `trusted_global_roots: []`（默认）。仅在需要符号链接共享技能时配置。

---

## 13. Feature Flags

`features.*` 域下的实验性功能开关。

### 13.1 思维伙伴：features.thinking_partner

| 属性 | 值 |
|------|-----|
| 类型 | `boolean` |
| 默认值 | `false` |

启用后 GSD 在规划阶段提供类似「思维伙伴」的辅助会话能力，帮助用户通过对话深化问题理解。

### 13.2 跨项目学习：features.global_learnings

| 属性 | 值 |
|------|-----|
| 类型 | `boolean` |
| 默认值 | `false` |

启用后 GSD 可以跨项目共享和积累经验知识。

**推荐：** 两者均保持 `false`。实验性功能，了解后再开启。

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

合并两个相关配置域——代码质量分析和发布流程控制。前者用于开发阶段的质量把关，后者用于发布阶段的 PR 自动生成，分别覆盖从开发到交付的关键环节。

### 14.1 代码质量：code_quality.fallow

Fallow 是 GSD 内置的结构性分析工具，用于检测代码中的异常模式、设计缺陷和潜在问题。

```json
{
  "code_quality": {
    "fallow": {
      "enabled": false,
      "scope": "phase",
      "profile": "standard",
      "mcp": false
    }
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `code_quality.fallow.enabled` | `boolean` | `false` | Fallow 分析主开关 |
| `code_quality.fallow.scope` | `string` | `"phase"` | 分析范围：`"phase"`（当前审查文件）/ `"repo"`（整个仓库） |
| `code_quality.fallow.profile` | `string` | `"standard"` | 严格度：`minimal`（阈值 50）/ `standard`（30）/ `strict`（15，越低越严格）|
| `code_quality.fallow.mcp` | `boolean` | `false` | **预留字段，尚未实现**，设为 `true` 仅发出运行时警告 |

**推荐：** `enabled: false`（默认）。有结构性分析需求时再开启。`scope: "phase"`、`profile: "standard"` 已足够。

### 14.2 Ship 设置：ship.pr_body_sections

自定义 PR body 的章节模板，控制自动生成 PR 描述的内容结构。v1.7+ 支持结构化对象条目，每项单独控制标题、是否启用、来源、模板和回退文本。

| 属性 | 值 |
|------|-----|
| 字段 | `ship.pr_body_sections` |
| 类型 | `array`（字符串或对象） |
| 默认值 | `[]` |

对象格式的每个条目支持：

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `heading` | `string` | 是 | Markdown 章节标题，渲染为 `## {heading}` |
| `enabled` | `boolean` | 否（默认 `true`）| 控制是否在 PR body 中渲染 |
| `source` | `string` | 否 | 从规划制品引用的章节标题链 |
| `template` | `string` | 否 | 带闭包令牌的字面 Markdown |
| `fallback` | `string` | 否 | source 和 template 都无内容时使用的回退文本 |

简洁格式仍可使用字符串数组：

```json
{
  "ship": {
    "pr_body_sections": ["summary", "changes", "testing", "notes"]
  }
}
```

结构化对象格式（v1.7+）：

```json
{
  "ship": {
    "pr_body_sections": [
      {
        "heading": "User Stories & Acceptance Criteria",
        "enabled": true,
        "source": "REQUIREMENTS.md ## User Stories || REQUIREMENTS.md ## Acceptance Criteria",
        "fallback": "- Acceptance criteria are covered by the linked requirements."
      },
      {
        "heading": "Risks & Rollback",
        "enabled": true,
        "template": "- Rollback: revert this PR."
      }
    ]
  }
}
```

**要点**：自定义章节为**追加**方式，核心章节（Summary、Changes、Requirements Addressed、Verification、Key Decisions）始终在最前且无法移除。

**推荐：** `[]`（默认），大多数场景默认 PR body 已满足需求。

---

## 15. 管理与其他设置

本章涵盖 statusline、review、intel、learnings、capabilities 等管理类配置。

### 15.1 状态行：statusline

控制 GSD 在 terminal 中状态行的显示内容。v1.7+ 新增多项可配置选项（`show_context_tokens`、`state_format`、`show_git` 三个字段见于 whats-new-1.7.0.md，CONFIGURATION.md 尚未收录）。

```json
{
  "statusline": {
    "context_position": "end",
    "show_last_command": false,
    "show_context_tokens": false,
    "state_format": "full",
    "show_git": false
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `statusline.context_position` | `string` | `"end"` | 上下文窗口计量器位置：`"end"`（行尾）/ `"front"`（模型名后） |
| `statusline.show_last_command` | `boolean` | `false` | 状态行末尾显示最近调用的斜杠命令 |
| `statusline.show_context_tokens` | `boolean` | `false` | 上下文计量百分比后追加绝对 token 数（如 `(156k)`）|
| `statusline.state_format` | `string` | `"full"` | GSD 状态段格式：`"full"`（里程碑名 + 进度条）/ `"compact"`（`v1.12 · P7/12 · executing`）|
| `statusline.show_git` | `boolean` | `false` | 目录后追加 git 段（分支 + 工作状态标记） |

**推荐：** 日常保持默认。`show_last_command` 在排查问题时很有用。`show_git` 适合需要频繁切换分支的项目。

### 15.2 审查设置：review

#### review.default_reviewers

| 属性 | 值 |
|------|-----|
| 字段 | `review.default_reviewers` |
| 类型 | `string[]` 或 `null` |
| 默认值 | `null`（全部检测到的 reviewer 均参与） |

控制在无参数运行 `/gsd-review` 时，默认使用哪些 reviewer。

```json
{
  "review": {
    "default_reviewers": ["gemini", "codex"]
  }
}
```

#### review.models.&lt;cli>

为每个 reviewer CLI 指定使用的模型 ID。支持的 CLI 包括 `claude`、`codex`、`gemini`、`opencode`、`qwen`、`cursor`、`ollama`、`lm_studio`、`llama_cpp`。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `review.models.claude` | `string` | 会话模型 | Claude 审查的模型 ID |
| `review.models.codex` | `string` | `null` | Codex 审查的模型 ID |
| `review.models.gemini` | `string` | `null` | Gemini 审查的模型 ID |
| `review.models.opencode` | `string` | `null` | OpenCode 审查的模型 ID |
| `review.models.qwen` | `string` | `null` | Qwen 审查的模型 ID |
| `review.models.cursor` | `string` | `null` | Cursor 审查的模型 ID |
| `review.models.ollama` | `string` | `null` | Ollama 本地模型审查的模型 ID |
| `review.models.lm_studio` | `string` | `null` | LM Studio 本地模型审查的模型 ID |
| `review.models.llama_cpp` | `string` | `null` | llama.cpp 本地模型审查的模型 ID |

#### review.reviewer_instances（v1.7+ 新增）

将一个模型适配器作为多个独立的审查者身份运行。例如：同一个 OpenCode 适配器以两个不同模型运行。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `review.reviewer_instances.<name>.cli` | `string` | 必填 | 重用的内置审查适配器名（如 `opencode`） |
| `review.reviewer_instances.<name>.model` | `string` | 适配器默认 | 透传给适配器 `--model` 的模型 ID |
| `review.reviewer_instances.<name>.agent` | `string` | 无 | agent 名（仅支持 `--agent` 的适配器） |

```json
{
  "review": {
    "reviewer_instances": {
      "opencode-deepseek": { "cli": "opencode", "model": "deepseek/deepseek-v4-pro", "agent": "review" },
      "opencode-mimo": { "cli": "opencode", "model": "xiaomi/mimo-v2.5-pro" }
    },
    "default_reviewers": ["opencode-deepseek", "opencode-mimo", "codex"]
  }
}
```

### 15.3 智能与学习：intel / learnings

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `intel.enabled` | `boolean` | `false` | 领域智能功能配置 |
| `learnings.max_inject` | `number` | `10` | 跨会话学习注入的最大条目数 |

`intel` 控制 GSD 在特定领域的智能分析能力。`learnings` 控制 GSD 记住和复用经验的行为，`max_inject` 限制每次注入的经验上限。

**推荐：** `intel.enabled: false`（默认）。`learnings.max_inject: 10` 保持默认。

### 15.4 能力注册：capabilities

注册和限制 GSD 可用的能力列表。通过显式列出允许的能力项来限制 GSD 的行为范围，属于高级安全控制。

| 属性 | 值 |
|------|-----|
| 类型 | `object` |
| 默认值 | `{}` |

**推荐：** `{}`（不设额外限制）。仅当需要管控第三方能力安装来源时才配置。

---

## 16. 典型配置组合场景

给出三种典型场景的完整 config.json 模板。可直接复制修改使用。

### 16.1 场景 A：原型开发

**特征**：快速迭代、自动推进、关闭冗余阶段。yolo 模式 + coarse 粒度 + 关闭研究/验证。

```json
{
  "mode": "yolo",
  "granularity": "coarse",
  "model_profile": "budget",

  "planning": {
    "commit_docs": false,
    "search_gitignored": true
  },

  "workflow": {
    "research": false,
    "verifier": false,
    "plan_check": false,
    "auto_advance": true,
    "code_review": false,
    "ui_phase": false,
    "mvp_mode": true
  },

  "parallelization": {
    "enabled": true,
    "plan_level": true,
    "task_level": true,
    "skip_checkpoints": true,
    "max_concurrent_agents": 5
  },

  "gates": {
    "confirm_phases": false,
    "confirm_plan": false,
    "confirm_transition": false
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

  "planning": {
    "commit_docs": true,
    "search_gitignored": false
  },

  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true,
    "code_review": true,
    "code_review_depth": "standard",
    "auto_advance": false,
    "use_worktrees": true,
    "nyquist_validation": true,
    "security_enforcement": true,
    "post_planning_gaps": true,
    "mvp_mode": false
  },

  "git": {
    "branching_strategy": "phase",
    "base_branch": "main",
    "create_tag": true
  },

  "parallelization": {
    "enabled": true,
    "plan_level": true,
    "task_level": false,
    "skip_checkpoints": true,
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
    "workflow_guard": false
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

  "planning": {
    "commit_docs": true,
    "search_gitignored": false
  },

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
    "security_asvs_level": 2,
    "security_block_on": "high",
    "node_repair": true,
    "node_repair_budget": 3,
    "human_verify_mode": "end-of-phase",
    "post_planning_gaps": true,
    "assumption_delta": true,
    "api_coverage_gate": true
  },

  "git": {
    "branching_strategy": "milestone",
    "base_branch": "main",
    "create_tag": true,
    "phase_branch_template": "feature/{phase}-{slug}",
    "milestone_branch_template": "release/{milestone}-{slug}"
  },

  "parallelization": {
    "enabled": true,
    "plan_level": true,
    "task_level": false,
    "skip_checkpoints": true,
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

  "security": {
    "injection_blocking": true
  },

  "hooks": {
    "context_warnings": true,
    "workflow_guard": true
  },

  "code_quality": {
    "fallow": {
      "enabled": true,
      "scope": "repo",
      "profile": "strict",
      "mcp": false
    }
  },

  "ship": {
    "pr_body_sections": [
      {
        "heading": "User Stories & Acceptance Criteria",
        "enabled": true,
        "source": "REQUIREMENTS.md ## User Stories || REQUIREMENTS.md ## Acceptance Criteria",
        "fallback": "- Covered by linked requirements."
      },
      {
        "heading": "Risks & Rollback",
        "enabled": true,
        "template": "- Rollback: revert this PR."
      }
    ]
  },

  "features": {
    "thinking_partner": true,
    "global_learnings": false
  }
}
```

**适用场景**：面向客户的生产服务、金融/合规敏感项目、多人团队的大型项目。

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

## 17. 完整配置实例（含注释）

> 以下是一个完整的 `.planning/config.json`，涵盖本文讨论的所有配置域，每个字段附带注释说明用途与默认值。JSON 标准不支持 `//` 注释——此处为演示用途。复制到实际配置时请删除注释行。

```jsonc
{
  // ========================================================================
  // 项目基础设置（详见第 3 章）
  // ========================================================================
  "mode": "interactive",              // 运行模式: interactive / yolo
  "granularity": "standard",          // 阶段粒度: coarse / standard / fine
  "project_code": null,               // phase 目录名前缀（多项目工作区用）
  "phase_naming": null,               // phase 命名前缀覆盖
  "phase_id_convention": null,        // null=数字ID | milestone-prefixed（带里程碑编码）

  // ========================================================================
  // 模型配置（详见第 4 章，详细解读在《模型解析与 Agent 模型切换》）
  // ========================================================================
  "model_profile": "balanced",        // quality / balanced / budget / adaptive / inherit
  "model_overrides": {},              // per-agent 精确覆盖, 如 {"gsd-planner":"opus"}
  "models": {},                       // per-phase_type: planning / discuss / research / execution / verification / completion
  "model_profile_overrides": {},      // per-(runtime, tier) 覆盖
  "dynamic_routing": null,            // 动态路由+故障升级（默认关闭）
  "model_policy": {},                 // provider-neutral preset（含 provider / budget / runtime_tiers）
  "effort": { "default": "high" },    // 统一推理 effort: minimal / low / medium / high / xhigh / max
  "fast_mode": { "enabled": false },  // 快速模式（仅 API runtime 支持）
  "runtime": "",                      // 当前运行时标识: claude / codex / gemini / opencode 等
  "resolve_model_ids": false,         // 输出形态: false(tier别名) / true(完整ID) / "omit"(空串)
  "granularities": {},                // per-phase_type 粒度覆盖（v1.43+）

  // ========================================================================
  // Planning 目录行为（详见 3.5 节）
  // ========================================================================
  "planning": {
    "commit_docs": true,              // .planning/ 目录是否纳入 git 提交
    "search_gitignored": false,       // 全局搜索是否包含 .planning/ 目录
    "sub_repos": []                   // 嵌套子仓库相对路径列表
  },

  // ========================================================================
  // CLAUDE.md 路径与组装（详见 3.4 节和 5.5 节）
  // ========================================================================
  "claude_md_path": "./.claude/CLAUDE.md",  // CLAUDE.md 写入路径
  "claude_md_assembly": {
    "mode": "embed",                  // embed(内联) / link(引用,减65%体积)
    "blocks": {}                      // per-section 覆盖, 如 {"architecture":"link"}
  },

  // ========================================================================
  // 上下文与运行时（详见第 5 章）
  // ========================================================================
  "context": null,                    // 注入每个 agent 的统一上下文文本（项目公约）
  "context_window": 200000,           // 上下文窗口 token 数（1M 模型可设为 1000000）
  "context_profile": "",              // 执行上下文预设: dev / research / review
  "response_language": null,          // agent 回复语言代码（如 "zh"）

  // ========================================================================
  // 搜索 API 集成（详见 5.6 节）
  // 值类型: string(key) / true(强制启用) / false(禁用) / null(自动检测)
  // ========================================================================
  "brave_search": null,               // Brave Search API
  "firecrawl": null,                  // Firecrawl 深度爬取
  "exa_search": null,                 // Exa Search 语义搜索
  "tavily_search": null,              // Tavily Search API
  "ref_search": null,                 // Ref 搜索 API（文档瀑布流）
  "perplexity": null,                 // Perplexity API
  "jina": true,                       // Jina API（终端兜底，默认可用）

  // ========================================================================
  // 工作流开关（约 50 个子键，详见第 6 章）
  // 核心约定：缺失键视为 true（absent = enabled）
  // ========================================================================
  "workflow": {
    // --- 阶段开关 ---
    "research": true,                 // 规划前执行研究阶段
    "plan_check": true,               // 计划检查（最多 3 次迭代）
    "verifier": true,                 // 执行后验证阶段
    "ai_integration_phase": true,     // AI 集成阶段向导
    "api_coverage_gate": true,        // API 覆盖门控：需完成 COVERAGE.md

    // --- 自动推进与自动化 ---
    "auto_advance": false,            // 阶段完成后自动推进
    "discuss_mode": "discuss",        // discuss(逐问) / assumptions(生成假设)
    "skip_discuss": false,            // 跳过讨论阶段
    "text_mode": false,               // 文本菜单替代 TUI（/rc 模式必须开启）
    "research_before_questions": false, // 讨论阶段先研究再提问
    "max_discuss_passes": 3,          // 讨论阶段最大轮次

    // --- 代码审查 ---
    "code_review": true,              // 代码审查开关
    "code_review_depth": "standard",  // quick(模式匹配) / standard(逐文件) / deep(跨文件+图)

    // --- 工作树 ---
    "use_worktrees": true,            // git worktree 隔离（非Claude自动false）
    "worktree_skip_hooks": false,     // worktree 跳过 git hooks

    // --- 计划与迭代 ---
    "plan_bounce": false,             // 启用外部计划验证脚本
    "plan_bounce_script": null,       // 验证脚本路径
    "plan_bounce_passes": 2,          // 顺序反弹次数
    "plan_chunked": false,            // 分块规划（Windows 推荐启用）
    "plan_review_convergence": false, // 自动计划→审查→重规划循环
    "inline_plan_threshold": 3,       // 超过此任务数生成独立 PLAN.md

    // --- 时间控制 ---
    "subagent_timeout": 300000,       // 子 agent 超时（毫秒，默认 5 分钟）
    "test_gate_timeout": 600,         // 测试门控超时（秒，默认 10 分钟）
    "cross_ai_timeout": 300,          // 跨 AI 执行超时（秒，默认 5 分钟）

    // --- 安全与验证 ---
    "security_enforcement": true,     // 安全策略强制执行
    "nyquist_validation": true,       // 奈奎斯特验证（计划阶段测试覆盖映射）
    "security_asvs_level": 1,        // OWASP ASVS 验证等级（1~3）
    "security_block_on": "high",      // 阻断 phase 的最低威胁等级
    "assumption_delta": true,         // 假设变更时发出架构检查点

    // --- 其他开关 ---
    "node_repair": true,              // 验证失败时自动修复任务
    "node_repair_budget": 2,          // 每个任务最大修复尝试次数
    "human_verify_mode": "end-of-phase", // end-of-phase(阶段末) / mid-flight(嵌入检查点)
    "post_planning_gaps": true,       // 规划后生成需求覆盖率差距报告
    "build_command": null,            // 自定义构建命令（未设时自动检测）
    "test_command": null,             // 自定义测试命令（未设时自动检测）
    "cross_ai_execution": false,      // 跨 AI 执行
    "cross_ai_command": null,         // 跨 AI 执行命令模板
    "code_review_command": null,      // 外部代码审查集成命令
    "context_guard_mode": "warn",     // warn(警告) / auto(自动暂停) / off(关闭)
    "auto_prune_state": false,        // 自动清理 STATE.md 过期条目
    "pattern_mapper": true,           // 新文件与已有代码间运行模式映射
    "tdd_mode": false,                // TDD 模式：RED/GREEN/REFACTOR 门控
    "mvp_mode": false,                // MVP 模式：垂直切片交付单一功能
    "ui_phase": true,                 // UI 设计契约生成开关
    "ui_safety_gate": true,           // UI phase 前安全门控
    "ui_review": true,                // 自主模式下 UI 视觉质量审查
    "drift_threshold": 3,             // 触发代码漂移检测的最小新增结构元素数
    "drift_action": "warn",           // warn(建议) / auto-remap(自动触发)
    "plan_drift_precheck": true       // 规划前非阻塞代码漂移预检
  },

  // ========================================================================
  // 并行化设置（详见第 7 章）
  // 顶层字段也可简写: "parallelization": false 等价于 { "enabled": false }
  // ========================================================================
  "parallelization": {
    "enabled": true,                  // 并行主开关
    "plan_level": true,               // 计划级并行
    "task_level": false,              // 任务级并行（默认关闭）
    "skip_checkpoints": true,         // 并行时跳过非关键检查点
    "max_concurrent_agents": 3,       // 最大并发 agent 数
    "min_plans_for_parallel": 2       // 启动并行所需最小 plan 数
  },

  // ========================================================================
  // Git 集成（详见第 8 章）
  // ========================================================================
  "git": {
    "branching_strategy": "none",     // none / phase / milestone
    "base_branch": "main",            // 基础分支名
    "create_tag": true,               // milestone 完成时自动创建 git tag
    "phase_branch_template": "gsd/phase-{phase}-{slug}",   // phase 分支命名模板
    "milestone_branch_template": "gsd/{milestone}-{slug}", // milestone 分支命名模板
    "quick_branch_template": null     // quick 模式分支命名模板
  },

  // ========================================================================
  // 确认门控（详见第 9 章）
  // 全 true = 每一步都需要用户确认
  // ========================================================================
  "gates": {
    "confirm_project": true,          // 项目初始化时确认
    "confirm_phases": true,           // 进入每个 phase 前确认
    "confirm_roadmap": true,          // 制定 roadmap 时确认
    "confirm_breakdown": true,        // breakdown 分解时确认
    "confirm_plan": true,             // 执行每个计划前确认
    "execute_next_plan": true,        // 执行下一个 plan 前确认
    "issues_review": true,            // issue 评审时确认
    "confirm_transition": true        // 阶段切换时确认
  },

  // ========================================================================
  // 安全设置（详见第 10 章）
  // ========================================================================
  "safety": {
    "always_confirm_destructive": true,      // 破坏性操作（删除/回退）必须确认
    "always_confirm_external_services": true  // 外部 API 调用前必须确认
  },
  "security": {
    "injection_blocking": false       // Prompt 注入防护（默认关闭）
  },

  // ========================================================================
  // Hook 设置（详见第 11 章）
  // ========================================================================
  "hooks": {
    "context_warnings": true,         // 上下文接近窗口上限时发出警告
    "workflow_guard": false           // 流程外编辑文件时警告
  },

  // ========================================================================
  // 状态行设置（详见 15.1 节）
  // ========================================================================
  "statusline": {
    "context_position": "end",        // end(行尾) / front(模型名后)
    "show_last_command": false,       // 显示最近调用的斜杠命令
    "show_context_tokens": false,     // 追加绝对 token 数（如 (156k)）
    "state_format": "full",           // full(里程碑名+进度条) / compact(缩写)
    "show_git": false                 // 显示 git 分支和工作状态
  },

  // ========================================================================
  // 审查设置（详见 15.2 节）
  // ========================================================================
  "review": {
    "default_reviewers": null,        // null=全部参与 / 数组限定子集
    "models": {
      "claude": "",                   // Claude 审查模型（空=会话模型）
      "codex": "",                    // Codex 审查模型 ID
      "gemini": "",                   // Gemini 审查模型 ID
      "opencode": "",                 // OpenCode 审查模型 ID
      "qwen": "",                     // Qwen 审查模型 ID
      "cursor": "",                   // Cursor 审查模型 ID
      "ollama": "",                   // Ollama 本地模型 ID
      "lm_studio": "",                // LM Studio 本地模型 ID
      "llama_cpp": ""                 // llama.cpp 本地模型 ID
    },
    "reviewer_instances": {}          // 同一适配器多身份审查（v1.7+）
  },

  // ========================================================================
  // 代码质量（详见 14.1 节）
  // ========================================================================
  "code_quality": {
    "fallow": {
      "enabled": false,               // Fallow 结构性分析开关
      "scope": "phase",               // phase(当前文件) / repo(整个仓库)
      "profile": "standard",          // minimal(阈值50) / standard(30) / strict(15)
      "mcp": false                    // 预留字段，尚未实现
    }
  },

  // ========================================================================
  // Ship 设置（详见 14.2 节）
  // ========================================================================
  "ship": {
    "pr_body_sections": []            // 自定义 PR body 追加章节
  },

  // ========================================================================
  // Agent 技能注入（详见第 12 章）
  // ========================================================================
  "agent_skills": {},                 // per-agent 技能数组，如 {"gsd-executor":["skills/my-skill"]}
  "agent_skills_security": {
    "trusted_global_roots": []        // 额外信任的全局技能根目录白名单
  },

  // ========================================================================
  // Feature Flags（详见第 13 章）
  // ========================================================================
  "features": {
    "thinking_partner": false,        // 思维伙伴（实验性，默认关闭）
    "global_learnings": false         // 跨项目学习（实验性，默认关闭）
  },

  // ========================================================================
  // 学习与智能（详见 15.3 节）
  // ========================================================================
  "learnings": {
    "max_inject": 10                  // 跨会话学习注入的最大条目数
  },
  "intel": {
    "enabled": false                  // 领域智能分析功能
  },

  // ========================================================================
  // 能力注册（详见 15.4 节，高级安全控制）
  // ========================================================================
  "capabilities": {}                  // 限制 GSD 可用能力（默认不限制）
}
```

将此实例与 [第 4 章模型配置交叉引用](#4-模型配置字段一览交叉引用) 配合使用可覆盖 **全部 90+ 配置字段**。各字段的默认值行为请参考对应章节的详细解读。

---

## 附录 A：配置域索引表

按字母序列出所有配置顶级字段，标注所属域、本文章节号、默认值，作为快速查找索引。

| 字段 | 类型 | 默认值 | 所属域 | 章节 |
|------|------|--------|--------|------|
| `agent_skills` | `object` | `{}` | Agent 技能 | 12 |
| `agent_skills_security` | `object` | `{"trusted_global_roots":[]}` | Agent 技能安全 | 12 |
| `brave_search` | `string\|boolean\|null` | 自动检测 | 搜索 API | 5 |
| `capabilities` | `object` | `{}` | 管理 | 15 |
| `claude_md_path` | `string` | `"./.claude/CLAUDE.md"` | 项目基础 | 3 |
| `claude_md_assembly` | `object` | `{"mode":"embed"}` | 上下文 | 5 |
| `code_quality` | `object` | 见 14.1 节 | 代码质量 | 14 |
| `context` | `string` | `null` | 上下文 | 5 |
| `context_profile` | `string` | 无 | 上下文 | 5 |
| `context_window` | `number` | `200000` | 上下文 | 5 |
| `dynamic_routing` | `object` | `null` | 模型（交叉引用） | 4 |
| `effort` | `object` | `{"default":"high"}` | 模型（交叉引用） | 4 |
| `exa_search` | `string\|boolean\|null` | 自动检测 | 搜索 API | 5 |
| `fast_mode` | `object` | `{"enabled":false}` | 模型（交叉引用） | 4 |
| `features` | `object` | `{}` | Feature Flags | 13 |
| `firecrawl` | `string\|boolean\|null` | 自动检测 | 搜索 API | 5 |
| `gates` | `object` | 全 true | 确认门控 | 9 |
| `git` | `object` | 见第 8 章 | Git | 8 |
| `granularities` | `object` | `{}` | 模型（交叉引用） | 4 |
| `granularity` | `enum` | `"standard"` | 项目基础 | 3 |
| `hooks` | `object` | 见第 11 章 | Hook | 11 |
| `intel` | `object` | `{"enabled":false}` | 管理 | 15 |
| `jina` | `string\|boolean\|null` | `true` | 搜索 API | 5 |
| `learnings` | `object` | `{"max_inject":10}` | 管理 | 15 |
| `mode` | `enum` | `"interactive"` | 项目基础 | 3 |
| `model_overrides` | `object` | `{}` | 模型（交叉引用） | 4 |
| `model_policy` | `object` | 无 | 模型（交叉引用） | 4 |
| `model_profile` | `enum` | `"balanced"` | 模型（交叉引用） | 4 |
| `model_profile_overrides` | `object` | 无 | 模型（交叉引用） | 4 |
| `models` | `object` | `{}` | 模型（交叉引用） | 4 |
| `parallelization` | `object` | 见第 7 章 | 并行化 | 7 |
| `perplexity` | `string\|boolean\|null` | 自动检测 | 搜索 API | 5 |
| `phase_id_convention` | `string` | `null` | 项目基础 | 3 |
| `phase_naming` | `string` | `null` | 项目基础 | 3 |
| `planning` | `object` | 见第 3 章 | 项目基础 | 3 |
| `project_code` | `string` | `null` | 项目基础 | 3 |
| `ref_search` | `string\|boolean\|null` | 自动检测 | 搜索 API | 5 |
| `resolve_model_ids` | `boolean`/`string` | `false` | 模型（交叉引用） | 4 |
| `response_language` | `string` | `null` | 上下文 | 5 |
| `review` | `object` | 见 15.2 节 | 管理 | 15 |
| `runtime` | `string` | 无 | 模型（交叉引用） | 4 |
| `safety` | `object` | 见第 10 章 | 安全 | 10 |
| `security` | `object` | `{"injection_blocking":false}` | 安全 | 10 |
| `ship` | `object` | 见 14.2 节 | Ship 设置 | 14 |
| `statusline` | `object` | 见 15.1 节 | 管理 | 15 |
| `tavily_search` | `string\|boolean\|null` | 自动检测 | 搜索 API | 5 |
| `workflow` | `object` | 见第 6 章 | 工作流 | 6 |

---

## 附录 B：兼容性与版本说明

### B.1 本文基准版本

本文基于 npm 包 `@opengsd/gsd-core` v1.7.0-rc.6 编写。配置字段在不同版本中的引入和变更情况如下表。

### B.2 字段版本记录

| 字段 | 引入版本 | 变更说明 |
|------|---------|---------|
| 大部分基础字段 | v1.0 | 首发 |
| `depth` → `granularity` | v1.22.3 | 字段重命名，旧配置自动迁移 |
| `discuss_mode` / `skip_discuss` / `text_mode` | v1.28 | 讨论阶段控制 |
| `project_code` / `use_worktrees` | v1.31 | 项目标识 & worktree 开关 |
| `response_language` | v1.32 | 响应语言配置 |
| `context_profile` / `code_review` / `code_review_depth` | v1.34 | 执行上下文预设 & 审查深度 |
| `plan_bounce` / `plan_bounce_script` / `plan_bounce_passes` | v1.36 | Plan 验证反弹机制 |
| `code_review_command` / `cross_ai_execution` / `cross_ai_command` / `cross_ai_timeout` | v1.36 | 外部审查 & 跨 AI 执行 |
| `tdd_mode` / `mvp_mode` | v1.36 | TDD 和 MVP 模式 |
| `claude_md_path` | v1.36 | 可配置 CLAUDE.md 路径 |
| `plan_chunked` | v1.38 | 分块规划 |
| `claude_md_assembly` | v1.38 | CLAUDE.md 组装模式 |
| `runtime` / `model_profile_overrides` | v1.39 | 运行时感知的 profile 覆盖 |
| `plan_review_convergence` / `drift_threshold` / `drift_action` | v1.39 | 审查收敛 & 漂移检测 |
| `build_command` / `test_command` | v1.39 | 构建 & 测试命令 |
| `models.<phase_type>` | v1.40 | 按 phase 类型的模型选择 |
| `dynamic_routing` | v1.40 | 动态路由 + 故障升级 |
| `effort` / `fast_mode` / `model_policy` | v1.42 | 统一 effort & provider-neutral preset |
| `model_policy.runtime_tiers` | v1.42 | 按运行时 tier 映射 |
| `granularities` | v1.43 | per-phase_type 粒度覆盖 |
| `dynamic_routing.provider_escalation` | v1.43 | 提供商故障升级 |
| `phase_id_convention` | v1.43 | 带里程碑前缀的 phase ID |
| `features.global_learnings` | v1.40+ | 跨项目学习 |
| `features.thinking_partner` | v1.40+ | 思维伙伴 |
| 搜索 API key 字段 | v1.7.0 | 统一 API key 配置接口 |
| `agent_skills` 数组化 | v1.7.0 | 从单值改为数组 |
| `agent_skills_security` | v1.7.0 | 技能安全配置 |
| `security.injection_blocking` | v1.7.0 | Prompt 注入防护 |
| `statusline.*` 扩展（show_last_command / show_context_tokens / show_git / state_format） | v1.7.0 | 状态行扩展 |
| `review.reviewer_instances` | v1.7.0 | 自定义审查实例 |
| `ship.pr_body_sections` 结构化 | v1.7.0 | 章节支持结构化对象 |
| `assumption_delta` | #1561 | 假设变更检查点 |
| `api_coverage_gate` | #1562 | API 覆盖门控 |
| `context_guard_mode` | #1452 | 上下文耗尽守卫 |
| `human_verify_mode` | #3309 | 人工验证模式 |
| `inline_plan_threshold` | — | 内联规划阈值 |
| `auto_prune_state` | — | 自动清理 STATE.md |
| `worktree.baseRef` | settings.local.json | worktree 基线引用 |

### B.3 升级注意事项

- **v1.42 新增的 `effort` 字段**不破坏旧配置，旧版 `reasoning_effort` 在 provider preset 中仍然有效但降级为 runtime-specific 原始字段
- **全量 workflow 开关**：如果从旧版本升级且 config.json 中缺少某个 workflow 开关，GSD 将所有布尔开关的缺失键视为 `true`（启用，absent = enabled 模式）
- **v1.7.0 结构性变更**：`agent_skills` 配置从单值（字符串）改为数组形式，升级时需注意修改技能配置
- **`use_worktrees` 行为变化**：v1.7+ 对分支偏离和非 Claude 运行时做了兜底降级，旧配置中强制开启 worktree 可能导致执行失败
- 建议每次 GSD 主版本升级后运行 `gsd-tools query config-get model_profile` 验证配置可正常解析
