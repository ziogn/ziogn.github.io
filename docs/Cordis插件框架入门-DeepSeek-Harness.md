---
title: Cordis 插件框架入门（DeepSeek Harness）
created: 2026-09-03 07:42
updated: 2026-09-03 08:22
version: 0.0.1
author: ziogn
source: https://deepseek-harness.github.io/deepseek-harness/reference/cordis-primer
tags: [DeepSeek-Harness, Cordis, 插件框架, research]
aliases: [Cordis 入门, Cordis Primer, dsh 插件框架]
description: DeepSeek Harness 底层插件框架 Cordis 的概念入门：五个核心概念、事件分发模式、Waterfall 语义、Loader 配置与实践规则
---

# Cordis 插件框架入门（DeepSeek Harness）

> 本文面向 DeepSeek Harness（dsh）插件作者与使用者，讲解底层插件框架 Cordis 的核心概念。阅读顺序：先读 §1 定论 → §3 五个核心概念建立心智模型 → §4/§5 理解事件分发 → §6/§7 落实践 → §8/§9 看 API 与后续路径。API 级细节以官方页面为准。
>
> 主要参考：[Cordis Primer（官方）](https://deepseek-harness.github.io/deepseek-harness/reference/cordis-primer)、[Cordis 教程](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/)、[vendor/README.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/vendor/README.md)、[子系统核心参考](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/core)、[Cordis API](https://deepseek-harness.github.io/deepseek-harness/reference/cordis-api/context)。

---

## 1. 一句话定论

先给你 5 句话的结论，剩下的章节都是在论证它。

| 你的疑问 | 一句话结论 |
|---------|-----------|
| **Cordis 是什么？** | 一个以 vendor 方式引入 dsh、被重命名到 `@deepseek-ai` 域的小型插件框架（cordis 4.0.0-rc.7），dsh 的每项能力——工具、LLM 适配器、文件访问、甚至 agent loop——都是挂载到共享上下文中的插件（"Everything is a plugin"）。 |
| **插件是什么？** | 实现 Service 的对象：一个带 `inject`/`apply(ctx)` 字段的函数，或一个 `Service` 子类；由 Cordis 挂载到当前上下文，生命周期由框架管理。 |
| **上下文（ctx）是什么？** | 服务的容器。每个服务占据稳定的 `ctx.<key>`（如 `ctx.tools`、`ctx.llm`、`ctx.sessions`）；插件通过 key 查找服务，**而不是导入具体实现**。 |
| **插件之间怎么通信？** | 类型化事件：服务通过 TypeScript 声明合并注册事件名，然后以 `emit`（观察）、`waterfall`（包装）、`parallel`（并行扇出）、`serial`（按序）、`bail`（短路）五种方式分发。 |
| **为什么"一切皆可逆"？** | 提示词片段、工具 schema、适配器、提供方、监听器都通过 `ctx.effect()`/`ctx.on()` 安装，reload 和 teardown 时按预期撤销——每个注册都有对应的 disposer，这就是 Cordis 论文所说的"时间可组合性"。 |

一句话总纲：**Cordis 把"能力"抽象成挂到 ctx 上的可逆副作用，把"协作"抽象成类型化事件的五种分发模式——理解这两点，harness 的整个插件生态就通了。**

---

## 2. Cordis 在 DeepSeek Harness 中的定位

### 2.1 "一切皆插件"的骨架

DeepSeek Harness（dsh）官方 slogan 是 **"Everything is a plugin. Every run is traceable."**（一切皆插件，每次运行都可追溯）。这意味着 harness 不是把能力硬编码进内核，而是通过 Cordis 插件树组装：

- 模型流式输出 → `ctx.llm` 服务
- 工具注册与执行流水线 → `ctx.tools` 服务
- 会话日志 → `ctx.sessions` 服务
- 实时 agent 协调 → `ctx.agents` 服务

阅读 [子系统核心参考](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/core) 前，需要先理解 Cordis 本身——这就是本文的定位。

### 2.2 vendor 机制：harness 完全拥有框架层

Cordis 及其基础库**不是**通过 npm 依赖引入，而是以**源码 vendor**（vendored）方式复制进 dsh 仓库，这样 harness 完全拥有其框架层（可审计、可打补丁、可钉版本）。所有 vendor 包被重命名为 `@deepseek-ai` 域：

| vendor 目录 | npm 名 | 上游名 | 版本 |
|------------|--------|--------|------|
| `cordis/` | `@deepseek-ai/cordis` | `cordis` | 4.0.0-rc.7 |
| `loader/` | `@deepseek-ai/cordis-plugin-loader` | `@cordisjs/plugin-loader` | 1.0.0-rc.5 |
| `include/` | `@deepseek-ai/cordis-plugin-include` | `@cordisjs/plugin-include` | 1.0.4 |
| `group/` | `@deepseek-ai/cordis-plugin-group` | `@cordisjs/plugin-group` | 1.0.0 |
| `timer/` | `@deepseek-ai/cordis-plugin-timer` | `@cordisjs/plugin-timer` | 1.1.2 |
| `hmr/` | `@deepseek-ai/cordis-plugin-hmr` | `@cordisjs/plugin-hmr` | 1.0.15 |
| `logger-console/` | `@deepseek-ai/cordis-plugin-logger-console` | `@cordisjs/plugin-logger-console` | 1.0.0 |
| `schemastery/` | `@deepseek-ai/schemastery` | `schemastery` | 3.18.0 |
| `cosmokit/` | `@deepseek-ai/cosmokit` | `cosmokit` | 1.8.1 |

> 版本快照来自 [vendor/README.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/vendor/README.md) 清单（2026-09 抓取）。目录名与上游版本号刻意保持不变，使清单仍可读作上游快照；harness 包统一把 `cordis` 声明为 peer dependency，发布 harness 即发布这层框架。

### 2.3 理论背景（一句话）

Cordis 的设计由 [《A Programming Paradigm for Spatiotemporal Composability》](https://arxiv.org/abs/2608.25512)（北大 + DeepSeek-AI）形式化：**可逆副作用 = 时间可组合性**（挂载/卸载可以可靠回滚），**响应式共效应 = 空间可组合性**（服务在上下文中按需解析）。上游 [cordiverse/cordis](https://github.com/cordiverse/cordis) 已由 Koishi 聊天机器人框架生产验证 4 年、4000+ 插件。

---

## 3. 五个核心概念

### 3.1 插件（Plugin）——实现 Service 的对象

插件是"实现一项服务"的对象，有两种形态：

1. **函数插件**：一个带可选 `inject`（声明依赖）和 `apply(ctx)`（挂载逻辑）字段的函数
2. **Service 子类**：继承 `Service` 的类，其生命周期由 Cordis 挂载到当前上下文

```ts
// 函数插件骨架（`@deepseek-ai/cordis`，cordis 4.0.0-rc.7 起）
import type { Context } from '@deepseek-ai/cordis'

export const name = 'greeter'              // 服务名：注册到 ctx.greeter
export const inject = ['logger']           // 声明依赖（见 3.3）

export function apply(ctx: Context) {
  ctx.logger('greeter').info('greeter plugin mounted')
  // 在此挂载服务/事件/副作用（见 3.5）
}
```

要点：**插件不是被"调用"的，而是被"挂载"的**——`apply(ctx)` 执行时即挂载完成，插件内部产生的副作用会在卸载时被撤销。

### 3.2 上下文（Context，ctx）——服务的容器

上下文是 Cordis 的核心对象：所有服务、事件和生命周期 API 都通过 `ctx` 访问。一个服务占据稳定的 `ctx.<key>` 槽位：

```ts
// 通过 ctx.<key> 查找服务，而不是 import 具体实现
const tools = ctx.tools      // 工具注册表
const llm = ctx.llm          // LLM 适配器
const sessions = ctx.sessions // 会话日志
```

上下文是一个**代理**（proxy）：普通属性读取通过服务解析器进行；`ctx.extend()`、`ctx.isolate()`、`ctx.intercept()` 会创建有作用域的子上下文，且**不修改父上下文**（详见 §8）。

### 3.3 inject——声明服务依赖

插件用 `inject` 数组声明它需要哪些服务。声明后插件会**等待这些服务就绪才启动**；加载顺序由服务依赖表达，而非手动编排启动序列：

```ts
export const inject = ['tools']

export function apply(ctx: Context) {
  // 此时 ctx.tools 一定可用
  const tools = ctx.tools
}
```

如果声明的服务从未出现，插件保持 pending（挂起）状态；服务提供的 fiber 激活后，依赖方被唤醒。**这是 Cordis 解耦加载顺序的机制：谁依赖谁，代码里说清楚，框架负责排序。**

### 3.4 类型化事件——插件间通信

服务通过 **TypeScript 声明合并**（`declare module`）注册事件名，让事件名带上类型：

```ts
// 声明合并：为 Cordis 已声明的接口添加你自己的事件条目
declare module '@deepseek-ai/cordis' {
  interface Events {
    'greeter/said'(text: string): void
  }
}

export function apply(ctx: Context) {
  // 注册监听器
  ctx.on('greeter/said', (text) => {
    ctx.logger('greeter').info(`someone said: ${text}`)
  })
  // 分发事件
  ctx.emit('greeter/said', 'hello world')
}
```

分发方式有五种（见 §4）。注意：声明合并**只提供类型**，不生成任何运行时接线——插件必须另行提供服务或发出事件。

### 3.5 可逆副作用——每个注册都有 disposer

提示词片段、工具 schema、适配器、提供方、监听器都通过 `ctx.effect()` 或 `ctx.on()` 安装，并且 **reload 和 teardown 时会按预期撤销**：

```ts
export function apply(ctx: Context) {
  // 方式一：ctx.on() 自动管理 —— 插件卸载时监听器自动取消
  ctx.on('foo', handler)

  // 方式二：ctx.effect() 返回 disposer —— 显式资源释放
  const dispose = ctx.effect(() => {
    // 做一些注册工作（如启动轮询、连接资源）
    return () => {
      // 清理工作：卸载时执行
    }
  })
}
```

**实践纪律**：每个注册都应有一个对应的 disposer——要么从 `ctx.effect()` 返回一个，要么使用 Cordis 提供的辅助方法自动处理。如果 teardown 顺序有要求（如先释放 A 再释放 B），把相关工作放在**同一个 effect** 中，确保资源按预期顺序释放。

---

## 4. 事件分发模式

每个事件具有以下五种分发模式之一，且只能通过对应方法分发。模式是事件公开约定的一部分；新的 harness 事件通过 `@mode` 标签记录模式，生成的目录会据此把声明与分发调用点做交叉校验。

| 模式 | 是否 await？ | 分发顺序 | 是否有返回值？ | 典型用途 |
|------|-------------|---------|---------------|---------|
| `emit` | 否 | 监听器按注册顺序观察 | 否 | 广播通知（如日志、UI 刷新） |
| `waterfall` | 否 | 监听器按注册顺序观察 | 是 | 环绕中间件、逐层包装（如请求处理管线） |
| `parallel` | 是 | 所有监听器并行观察事件 | 否 | 可并行的副作用（如多路写入） |
| `serial` | 是 | 监听器按注册顺序观察 | 是 | 需要按序且汇聚结果（异步链） |
| `bail` | 否 | 监听器按注册顺序观察，直到某个监听器返回 bail 值 | 是 | 短路：首值即止（如权限检查、缓存命中） |

用法示例：

```ts
// emit：观察式广播
ctx.emit('greeter/said', 'hi')

// waterfall：逐层包装，返回值向后传递
ctx.waterfall('pipeline/request', { url })

// parallel：并行扇出
await ctx.parallel('cache/flush', 'all')

// serial：按序汇聚
await ctx.serial('backup/run', phase)

// bail：停在首个 bail 值
const result = ctx.bail('cache/lookup', key)
```

> 表内行为与 primer 一致；`parallel`/`serial` 需要 await，`emit`/`waterfall`/`bail` 不需要。

---

## 5. Waterfall：环绕中间件语义

`ctx.waterfall` 是**环绕中间件**：监听器接收 `(...args, next)`，调用 `next()` 执行下游监听器，下游的返回值通过 `next()` 返回当前包装层，可由该层包装后继续向外返回；**不调用 `next()` 直接返回则短路**。

```ts
// 协作式监听器：修改共享对象后委托给下游
ctx.on('pipeline/request', (payload, next) => {
  payload.trace ??= []
  payload.trace.push('layer-a')
  return next(payload)      // 委托：下游继续处理
})

// 决策式监听器：拥有决策权，短路不再委托
ctx.on('pipeline/request', (payload, next) => {
  if (payload.cacheHit) {
    return payload.cached    // 不调 next()：下游看不到这次命中
  }
  return next(payload)
})
```

语义要点：

- **协作式监听器**通常修改一个共享的请求/决策对象，然后委托（调 `next()`）；也可以选择完全替换结果，下游只看到替换后的结果。
- **决策式监听器**为"单决策事件"而设，**短路是设计意图**：策略监听器在拥有决策权时可以不调 `next()` 直接返回；仅做标注或观察的监听器则**必须委托**。
- **`prepend: true`**：仅当监听器必须在普通注册之前运行时才使用（如全局兜底逻辑）。

```ts
// 必须最先执行的监听器
ctx.on('pipeline/request', earlyHandler, { prepend: true })
```

---

## 6. Loader 配置模型

harness 的插件树由配置文件驱动（如 `cordis.yml`），由 Loader 插件管理。核心机制：

- **`@deepseek-ai/cordis-plugin-include`** 将 `!!js` 解析为**表达式节点**
- Loader 在声明的注入激活后，基于**该插件上下文**（`ctx.serviceName`）插值条目的 `config`
- 在**每次挂载决策**时，基于 loader 上下文插值其 `disabled` 字段
- Include 会保留嵌套行表达式，直到目标行激活
- 其余条目元数据保持字面值
- 由环境选择插件时，使用 **overlay**

```yaml
# cordis.yml（示意）
plugins:
  greeter:
    config:
      prefix: "!!js ctx.serviceName"   # 表达式：基于插件上下文插值
  feature-a:
    disabled: "!!js !ctx.platform.web" # 表达式：基于 loader 上下文插值
```

实践建议：把"每个插件跑在哪、何时启用"这类决策放进配置表达式，而不是散落在代码里；环境差异用 overlay 叠加，避免改配置树本体（详见官方教程 [05-config](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/05-config)）。

---

## 7. 实践规则

### 7.1 行为归置：事件 vs 服务方法

| 场景 | 归属 | 说明 |
|------|------|------|
| 工具流水线事件 | `ctx.tools` | 工具注册、执行流水线 |
| 模型流式输出 | `ctx.llm` | LLM 适配器、流式响应 |
| 实时 agent 协调 | `ctx.agents` | agent 注册、生命周期事件 |

两条总纲：

1. **拦截和策略优先使用事件**——用 `ctx.on()`/`ctx.waterfall()` 监听既有事件做拦截、包装、决策
2. **直接能力调用优先使用服务方法**——插件公开的能力（如"执行一个工具"）作为服务方法暴露，供其他插件注入后直接调用

### 7.2 Disposer 纪律（呼应 §3.5）

- 每个注册都有对应的 disposer：从 `ctx.effect()` 返回，或交给 Cordis 辅助方法自动处理
- teardown 顺序有要求时，把相关工作放在同一个 effect 中
- 这样 reload（热重载）与 unload（卸载）才能干净回滚——这正是"一切皆可逆"的工程保证

---

## 8. 上下文 API 速览与 harness 类型模式

### 8.1 作用域 API

| API | 作用 |
|-----|------|
| `ctx.extend(meta?)` | 创建子上下文（原型继承父属性，meta 遮蔽）；父不被修改 |
| `ctx.isolate(name, label?)` | 为 `name` 服务创建独立作用域；同 label 可并入同一作用域 |
| `ctx.intercept(name, config)` | 为下方启动的插件注入服务的拦截配置（祖先条目在前） |

### 8.2 服务存储与混入

| API | 作用 |
|-----|------|
| `ctx.provide(name, value)` | 注册归当前 fiber 所有的服务实现，返回 disposer |
| `ctx.get(name, strict?)` | 读取服务（无需 inject 要求） |
| `ctx.set(name, value)` | 仅提供该服务的 fiber 可覆盖值 |
| `ctx.mixin(name, mixins)` | 把服务成员直接暴露到 `ctx` 上（如 `ctx.on` 转发到 `ctx.events.on`） |
| `ctx.accessor(name, options)` | 定义计算型上下文属性（get/set 钩子） |

> 完整签名见 [Cordis API — Context](https://deepseek-harness.github.io/deepseek-harness/reference/cordis-api/context)。

### 8.3 harness 全仓两个类型模式

几乎所有可扩展类型都遵循同一模式（见 [subsystems/core](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/core)）：

**模式一：`…Map → derived-union`**——以判别标签为键的接口（`…Map`），联合类型由 `keyof` 派生；插件通过声明合并添加变体：

```ts
// 模式示意
interface ThingMap {
  'a': { kind: 'a' }
  'b': { kind: 'b' }
}
type ThingKind = keyof ThingMap              // 'a' | 'b'
type Thing = ThingMap[keyof ThingMap]        // 判别联合

// 插件扩展，无需改源包
declare module '@deepseek-ai/dsh-llm' {
  interface ThingMap {
    'c': { kind: 'c' }
  }
}
```

五个规范 map：`ContentBlockMap` / `MessageSourceMap` / `FinishReasonMap`（dsh-llm）、`TurnEndReasonMap` / `SessionEventMap`（dsh-session）。消费方对标签做 `switch`（不要链式 `if`），拼错标签会在编译期失败。

**模式二：品牌化 ID**——跨包传递的 ID 结构上仍是字符串，但类型层面不可互换（`SessionId` 不能传给需要 `ToolCallId` 的位置）：

```ts
type Branded<B extends string> = string & { readonly [BRAND]: B }
```

两个核心 ID：`ToolCallId`（工具调用与其结果关联；dsh-llm）、`SessionId`（活跃 agent 与持久会话共享；dsh-session）。

---

## 9. 学习路径与参考

### 9.1 三条路径

| 路径 | 入口 | 适合 |
|------|------|------|
| 动手实践 | [Cordis 教程（7 章）](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/) | 想边写边学的 agent 开发者 |
| 概念精读 | 本文 | 先建立心智模型再动手 |
| API 参考 | [子系统核心](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/core) 的 `cordis-surface` 区块 + [Cordis API 系列](https://deepseek-harness.github.io/deepseek-harness/reference/cordis-api/context) | 写插件时需要精确签名 |

要写**真正的 harness 插件**（由 `cordis.yml` 加载、Web UI 驱动），请从官方 [第一个 Harness 插件](https://deepseek-harness.github.io/deepseek-harness/develop/basic/) 开始。

### 9.2 教程章节清单（cordis-tutorial）

| 章 | 主题 | 你将理解 |
|----|------|---------|
| 01 | [第一个插件](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/01-first-plugin) | 插件是函数，由 loader 挂载 |
| 02 | [生命周期与 effect](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/02-lifecycle-and-effects) | 注册在插件卸载时撤销 |
| 03 | [服务](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/03-services) | 在 ctx 上公开能力，用 inject 依赖 |
| 04 | [事件](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/04-events) | 类型化事件、广播与 waterfall 短路 |
| 05 | [配置](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/05-config) | cordis.yml 校验与错误提示 |
| 06 | [组合与 HMR](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/06-composition-and-hmr) | 配置即插件树、热重载、诊断 |
| 07 | [进入 harness](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/07-into-the-harness) | 注册一个模型可调用的真实工具 |

教程启动命令（克隆 dsh 仓库并安装依赖后，在 `tmp/cordis-tutorial` 下）：

```sh
# Node 直接运行 TypeScript 配置所指的文件，无需构建步骤
node --import tsx ../../vendor/cordis/bin.js
```

### 9.3 相关官方页面

- 概念：&lt;https://deepseek-harness.github.io/deepseek-harness/reference/cordis-primer>
- 教程：&lt;https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/>
- 子系统和 cordis-surface 目录：&lt;https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/core>
- vendor 说明：&lt;https://github.com/deepseek-ai/deepseek-harness/blob/master/vendor/README.md>
- 上游：&lt;https://github.com/cordiverse/cordis>