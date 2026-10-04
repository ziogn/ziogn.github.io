---
title: java知识规划——ai开发
created: 2026-07-11 15:00
updated: 2026-07-23 11:50
version: 0.1.0
author: ziogn
tags: [java, langchain4j, ai, interview, guide, java面试, research]
aliases: [AI开发面试, LangChain4j面试, AI Java开发, RAG面试]
description: AI 开发（LangChain4j）面试知识规划，覆盖 AiServices 核心架构、模型集成与 Embedding、RAG 知识检索、Tool Calling、ChatMemory 会话记忆、流式响应六大模块，附与 Java 核心及 Spring 生态的知识关联。
---

# java知识规划——ai开发

> 本文档覆盖面试权重 10% 的 AI 开发知识，以 LangChain4j 框架为主线，从 AiServices 核心架构到模型集成、RAG、Tool Calling、会话记忆、流式响应逐层展开。每个知识点与 [Java 核心](java知识规划——核心.md) 及 [Spring 生态](java知识规划——spring.md) 的知识关联标注在末尾。

---

## 5.1 核心架构与 AiServices

涵盖 AiServices 动态代理原理、ChatLanguageModel 统一抽象、核心组件体系以及 LangChain4j 与 Spring AI 的选型对比。

---

#### AiServices 动态代理原理

AiServices 是 LangChain4j 的核心入口，底层基于 JDK 动态代理实现：

```java
// 定义 AI Service 接口
interface Assistant {
    String chat(String userMessage);
}

// AiServices.create() 创建代理实例
Assistant assistant = AiServices.create(Assistant.class, model);
String answer = assistant.chat("什么是虚拟线程？");
```

**代理生成流程**：

```text
用户定义接口 → AiServices.builder(接口.class) / AiServices.create()
  → JDK Proxy.newProxyInstance() 生成接口代理实例
  → 方法调用时，InvocationHandler.invoke() 拦截
  → 解析方法上的 @SystemMessage / @UserMessage 注解
  → 将方法名、参数组装为 ChatRequest（LLM 请求格式）
  → 通过 ChatModel.chat(ChatRequest) 发送给 LLM
  → LLM 返回 ChatResponse，框架反序列化为返回类型
```

**核心能力**（通过 builder 配置）：

| 能力 | 配置方法 | 说明 |
|------|---------|------|
| 聊天模型 | `.chatModel(model)` | 必需，所有对话的基础 |
| 会话记忆 | `.chatMemory(memory)` | 多轮对话上下文保持 |
| 工具调用 | `.tools(toolObject)` | LLM 调用 Java 方法 |
| RAG 检索 | `.contentRetriever(retriever)` 或 `.retrievalAugmentor(augmentor)` | 外部知识库接入 |

---

#### ChatLanguageModel 统一抽象

所有 LLM 提供者实现同一 `ChatModel` 接口：

```java
public interface ChatModel {
    ChatResponse chat(ChatRequest request);
}

// ChatModel 的实现类体系
// OpenAiChatModel        → OpenAI / Azure OpenAI
// OllamaChatModel        → 本地 Ollama 部署
// AnthropicChatModel     → Claude 系列模型
// GoogleAiGeminiChatModel → Gemini 系列
// QianfanChatModel       → 百度千帆
```

> **关联知识点**：ChatModel 统一抽象 → [策略模式](java知识规划——核心.md#16-设计模式) / JDK Proxy → AiServices 动态代理（同源代理模式）

---

#### AiServices vs Spring AI

| 对比维度 | LangChain4j | Spring AI |
|---------|------------|-----------|
| 起源 | LangChain 的 Java 移植（社区驱动） | Spring 官方出品 |
| 设计理念 | 模块化、灵活、非侵入 | Spring 原生集成、开箱即用 |
| 核心机制 | AiServices（JDK 动态代理） | Spring AOP + @Bean 声明式 |
| 支持的 LLM | 15+（OpenAI/Ollama/Anthropic/Gemini 等） | 10+ |
| Function Calling | @Tool 注解 + ToolSpecification | @Tool 注解 |
| Spring 集成 | spring-boot-starter-langchain4j | 原生支持 |
| 适用场景 | 需要高度定制化的 AI 工作流 | Spring 项目快速集成 |

**Spring AI 代码级对比**：

Spring AI 的 ChatClient 使用 Fluent API 风格（类似 WebClient）：

```java
// Spring AI ChatClient
String answer = ChatClient.create(model)
    .prompt()
    .user("什么是虚拟线程？")
    .advisors(
        new MessageChatMemoryAdvisor(chatMemory)  // 会话记忆
    )
    .call()
    .content();
```

Spring AI 的 **Advisor 体系** 是 AOP 风格的切面编程，对比 LangChain4j 的 builder 配置：

| 功能 | LangChain4j | Spring AI Advisor |
|------|------------|-------------------|
| 会话记忆 | `AiServices.builder().chatMemory(memory)` | `MessageChatMemoryAdvisor` |
| RAG 检索 | `AiServices.builder().contentRetriever(retriever)` | `QuestionAnswerAdvisor` |
| 工具调用 | `AiServices.builder().tools(toolObject)` | `ToolCallAdvisor` |
| 日志记录 | 需自定义 | `SimpleLoggerAdvisor` |

Spring AI 内置 **7 种 Advisor**，通过 .advisors() 链式组合，实现类似 LangChain4j 的模块化能力。

**补充对比**：

| 维度 | LangChain4j | Spring AI |
|------|------------|-----------|
| JDK 版本 | 0.36+ JDK 17（早期支持 JDK 8）| 3.4.x+ JDK 17+ |
| Spring Boot 支持 | 独立框架 + starter | 原生集成，版本严格绑定 |
| 向量库集成 | 30+ | 15+ |
| 多模态（图像/音频） | 基础支持 | 5+ 模型支持 |
| 社区活跃度 | 更高（Star/RPW 均领先）| 增长中 |
| 使用限制 | 无 | Boot 版本必须 3.4+ |

**选择建议**：
- 项目已使用 Spring Boot 3.x → Spring AI 开箱即用
- 需要更丰富的向量库集成或灵活版本要求 → LangChain4j
- 需要定制化 AI 工作流（AiServices 动态代理）→ LangChain4j
- 快速原型验证 → 两者均可，Spring AI 配置更少

> **关联知识点**：ChatClient Fluent API → [策略模式](java知识规划——核心.md#16-设计模式) / Advisor AOP → [Spring AOP](java知识规划——spring.md#22-spring-aop)

---

**追问链**：`AiServices 动态代理原理 → JDK Proxy 创建代理实例 → 方法调用如何转为 LLM 请求 → ChatModel 统一抽象 → 策略模式体现 → 与 JDK Proxy 的同源关系`

---

## 5.2 模型集成与 Embedding

涵盖 LangChain4j 的多模型统一 API、多模型切换策略、模型参数配置及本地模型集成方案。

---

```java
// 云端模型：OpenAI GPT
ChatModel openaiModel = OpenAiChatModel.builder()
    .apiKey(System.getenv("OPENAI_API_KEY"))
    .modelName("gpt-4o-mini")
    .temperature(0.3)
    .build();

// 本地模型：Ollama
ChatModel ollamaModel = OllamaChatModel.builder()
    .baseUrl("http://localhost:11434")
    .modelName("qwen2.5")
    .build();

// 统一切换
Assistant assistant = AiServices.builder(Assistant.class)
    .chatModel(ollamaModel)
    .build();
```

**模型参数配置**：

| 参数 | 作用 | 调优建议 |
|------|------|---------|
| `temperature` (0-2) | 控制输出随机性 | 代码生成 0.2，创意写作 0.8 |
| `maxTokens` | 限制输出长度 | 长文本 2048+ |
| `topP` (0-1) | 核采样参数 | 与 temperature 二选一 |
| `timeout` | HTTP 超时 | 60s 通用 |

> **关联知识点**：多模型切换 → [策略模式](java知识规划——核心.md#16-设计模式) / Ollama 本地部署 → 数据隐私设计

---

**追问链**：`ChatModel 统一接口 → 多模型切换策略 → temperature 调参 → topP 与 temperature 关系 → 本地 Ollama vs 云端 API`

---

## 5.3 RAG 与知识检索

RAG（Retrieval-Augmented Generation）是解决 LLM 知识截止和幻觉问题的核心方案。

---

```text
文档处理阶段：Document Loader → Document Splitter → Embedding → Vector Store
检索生成阶段：用户提问 → Embedding Query → ContentRetriever(语义检索 Top-K) → LLM 生成回答
```

**LangChain4j RAG 实现**：

```java
// 1. 加载文档
List<Document> documents = FileSystemDocumentLoader.loadDocuments("/path/to/docs");

// 2. 分块
DocumentSplitter splitter = DocumentSplitters.recursive(1000, 200);

// 3. 向量化存储
EmbeddingStoreIngestor.ingest(documents, embeddingStore);

// 4. 构建 ContentRetriever
ContentRetriever retriever = EmbeddingStoreContentRetriever.builder()
    .embeddingStore(embeddingStore)
    .embeddingModel(embeddingModel)
    .maxResults(5)
    .minScore(0.75)
    .build();

// 5. AI Service + RAG
Assistant assistant = AiServices.builder(Assistant.class)
    .chatModel(model)
    .contentRetriever(retriever)
    .build();
```

**Document Splitting 策略**：

| Splitter | 分块依据 | 适用场景 |
|---------|---------|---------|
| `recursive(size, overlap)` | 递归分隔符 | 通用，推荐 |
| `byParagraph` | 段落 | 结构清晰的文档 |
| `bySentence` | 句子 | 自然语言文本 |

> **常见陷阱**：chunk size 过小语义不完整、过大精确匹配下降；Embedding Model 向量维度必须与 Vector Store 一致。

---

**追问链**：`RAG 完整流程 → 文档加载/分块/向量化 → ContentRetriever 配置 → Vector Store 选型 → Hybrid 混合检索`

---

## 5.4 Tool / Function Calling

Tool Calling 是 LLM 与外部系统交互的核心机制。

---

**执行过程**：

```text
① LLM 分析请求 → 决定调用工具
② LLM 返回 ToolExecutionRequest（工具名 + 参数 JSON）
③ 框架解析 → 调用对应的 Java 方法
④ 方法执行结果返回给 LLM
⑤ LLM 基于工具结果生成最终回答
```

**高阶 API（@Tool 注解）**：

```java
public class WeatherTools {
    @Tool("根据城市名获取当前天气")
    String getWeather(@P("城市名") String city) {
        return switch (city) {
            case "北京" -> "晴天，25°C";
            case "上海" -> "多云，28°C";
            default -> "未知城市";
        };
    }
}

Assistant assistant = AiServices.builder(Assistant.class)
    .chatModel(model)
    .tools(new WeatherTools())
    .build();
```

> **常见陷阱**：@Tool 的 name 和 description 要足够详细；工具方法应当幂等；工具执行时间不应过长。

> **关联知识点**：@Tool → [JDK 动态代理](java知识规划——核心.md#16-设计模式) / ToolSpecification → [AOP 参数解析](java知识规划——spring.md#22-spring-aop)

---

**追问链**：`Tool Calling 执行过程 → 高阶 @Tool 注解 → 低阶 ToolSpecification → 与 JDK Proxy 同源代理模式`

---

## 5.5 ChatMemory 与提示模板

涵盖 @SystemMessage / @UserMessage / @V 注解、ChatMemory 三种实现及 @MemoryId 会话隔离。

---

```java
@SystemMessage("你是一位资深的 Java 技术专家")
@UserMessage("请解释：{{question}}")
String ask(@V("question") String question);
```

**ChatMemory 三种类型**：

| 类型 | 实现 | 适用场景 |
|------|------|---------|
| 滑动窗口 | `MessageWindowChatMemory` | 简单多轮对话，推荐默认 |
| Token 窗口 | `TokenWindowChatMemory` | 控制上下文长度 |
| 持久化 | `MessageWindowChatMemory` + `ChatMemoryStore` | 跨会话长期记忆（数据库/Redis） |

**@MemoryId 会话隔离**：

```java
interface CustomerService {
    String chat(@MemoryId Long userId, @UserMessage String message);
}

// 不同 userId 使用独立的 ChatMemory
String answer1 = service.chat(1L, "你好");      // userId=1
String answer2 = service.chat(2L, "你好");      // userId=2，独立会话
```

**@MemoryId 内部原理**：`ChatMemoryProvider` 内部维护 `Map<Object, ChatMemory>`，key 为 @MemoryId 参数值。

> **关联知识点**：@MemoryId → [ThreadLocal 线程隔离](java知识规划——核心.md#13-并发编程) 隔离思想同源 / ChatMemory → AiServices 集成方式

---

**追问链**：`@SystemMessage/@UserMessage 注解 → 模板占位符 → ChatMemory 三种类型对比 → @MemoryId 多会话隔离 → 与 ThreadLocal 隔离思想对比`

---

## 5.6 Streaming 流式响应

涵盖 TokenStream 回调机制和流式与阻塞对比。

---

```java
interface StreamingAssistant {
    TokenStream chat(String message);
}

tokenStream
    .onPartialResponse(partial -> System.out.print(partial))
    .onRetrieved(contents -> System.out.println("检索到: " + contents))
    .onToolExecuted(execution -> System.out.println("工具执行"))
    .onCompleteResponse(response -> futureResponse.complete(response))
    .onError(error -> futureResponse.completeExceptionally(error))
    .start();  // 必须调用
```

**流式 vs 阻塞**：

| 对比维度 | 阻塞调用 | 流式调用 |
|---------|---------|---------|
| 接口 | `ChatModel.chat()` | `StreamingChatModel.chat()` |
| 返回方式 | 一次性返回完整结果 | 逐 Token 推送 |
| 首字节延迟 | 高 | 低 |
| 用户体验 | 需等待 | 打字机效果 |

> **常见陷阱**：TokenStream 必须调用 `.start()` 才开始；流式 + 工具调用场景 `onToolExecuted` 和 `onPartialResponse` 交错触发；ChatMemory 应在 `onComplete` 时写入。

> **关联知识点**：TokenStream 回调 → [观察者模式](java知识规划——核心.md#16-设计模式) / CompletableFuture 处理 → [异步编排](java知识规划——核心.md#13-并发编程)

---

**追问链**：`TokenStream 回调方法 → 流式 vs 阻塞区别 → SSE 底层传输 → onComplete 写入 ChatMemory → 与观察者模式对应`

---

## 5.7 MCP 协议与 LangChain4j 集成

**一句话原理**：MCP（Model Context Protocol）是 Anthropic 推出的开放标准协议，用于 AI 应用与外部系统通信。类比 USB-C 口——提供标准化的连接方式，使 LLM 能够统一访问外部数据源和工具。

---

#### 三层架构

```text
Host（AI 应用层）
  └─ Claude Code / ChatGPT / 自定义 AI 应用
     └─ Client（协议交互层，建立与 Server 的连接）
        └─ Server（能力提供层——工具/数据/提示模板）
```

| 角色 | 职责 | 示例 |
|------|------|------|
| Host | 发起连接的应用层 | Claude Code、LangChain4j 应用 |
| Client | 与 Server 建立一对一连接 | McpClient 实例 |
| Server | 暴露 Resources / Tools / Prompts | 文件系统 Server、数据库 Server |

**三大核心能力**：

| 能力 | 类比 HTTP | 说明 |
|------|-----------|------|
| Resources | GET 请求（读取数据）| 暴露外部数据源（文件、数据库记录）|
| Tools | POST 请求（执行操作）| 暴露可执行的工具函数（类似 Function Calling）|
| Prompts | 模板引擎 | 暴露可复用的提示模板（工作流片段）|

---

#### MCP vs Function Calling 对比

| 维度 | Function Calling | MCP |
|------|-----------------|-----|
| 通信模式 | 请求-响应（单向） | 双向实时（可订阅更新）|
| 平台绑定 | 绑定单个模型 | 跨平台通用协议 |
| 工具定义 | 静态，嵌入在 System Prompt 中 | 动态协商，运行时发现 |
| 作用域 | 单次推理调用 | 持久会话管理 |
| 安全性 | 由框架层保证 | JWT + 角色权限 + 审计日志 |
| 关系 | 模型原生能力 | 系统集成规范 |

**实质关系**：MCP **不是替代** Function Calling，而是解决 FC 无法覆盖的"系统集成"问题。FC 仍是 LLM 调用函数的原生机制，MCP 是让多种工具/数据源以统一方式接入的协议标准。

---

#### LangChain4j MCP 集成

```java
// 1. 创建 MCP Transport（传输层）
McpTransport transport = new StdioMcpTransport(
    McpTransport.builder()
        .command(List.of("npx", "-y", "@modelcontextprotocol/server-filesystem", "/tmp"))
        .build()
);

// 2. 创建 MCP Client
McpClient mcpClient = McpClient.using(transport)
    .clientInfo(new Implementation("my-client", "1.0.0"))
    .build();

// 3. 创建 ToolProvider（将 MCP 工具封装为 LangChain4j 工具）
ToolProvider toolProvider = McpToolProvider.builder()
    .mcpClients(List.of(mcpClient))
    .build();

// 4. 注入 AiServices
Assistant assistant = AiServices.builder(Assistant.class)
    .chatModel(model)
    .toolProvider(toolProvider)  // ← MCP 工具
    .build();
```

**架构示意**：

```text
AiServices
  → ToolProvider.provideTools()          [遍历所有 McpClient]
    → McpClient.listTools()              [获取 Server 暴露的工具列表]
    → 注册为 ToolSpecification
  → LLM 返回 ToolExecutionRequest
    → McpClient.executeTool(name, args)  [转发给 MCP Server 执行]
```

> **常见陷阱**：
> - MCP Server 需要在运行期可达（stdio 模式需进程可执行，SSE 模式需网络可达）
> - 多个 MCP Client 的 tool name 必须唯一，重复时按先后顺序覆盖
> - MCP 工具的 timeout 配置需根据工具执行时间合理设置

> **关联知识点**：MCP ToolProvider → 5.4 Tool Calling（MCP 是 FC 的"系统级"扩展）/ MCP vs FC → 函数调用本质一致

---

**追问链**：`MCP 定义(USB-C 口比喻) → 三层架构 Host/Client/Server → Resources/Tools/Prompts 三大能力 → MCP vs Function Calling 对比(协议标准 vs 原生能力) → 双向实时通信 vs 请求-响应 → LangChain4j 集成(Transport→McpClient→ToolProvider→AiServices) → stdio vs HTTP SSE 传输 → 典型场景(文件系统/GitHub/数据库)`

---

## 5.8 Vector Database 选型与 RAG 评估优化

**一句话原理**：向量数据库是 RAG 的检索层核心。选型需权衡部署方式、性能、运维成本。RAG 评估通过检索指标（Precision/MRR）和生成指标（Faithfulness）衡量系统质量。

---

#### Vector Database 选型对比

LangChain4j 支持 30+ Embedded Store 集成：

| 数据库 | 部署方式 | 性能特征 | 适用场景 | Maven 坐标 |
|--------|---------|---------|---------|-----------|
| **Pgvector** | PostgreSQL 插件（嵌入式）| 中等，完美适配已有 PG | 已有 PostgreSQL 的中小项目 | `langchain4j-pgvector` |
| **Chroma** | 嵌入式 | 轻量快速 | 本地开发、快速原型 | `langchain4j-chroma` |
| **Milvus** | 服务端 | 高吞吐、GPU 加速 | 大规模生产环境 | `langchain4j-milvus` |
| **Qdrant** | 服务端 | Rust 编写、高性能 | 高并发生产场景 | `langchain4j-qdrant` |
| **Elasticsearch** | 服务端 | 向量+全文混合搜索 | 已有 ES 基础设施 | `langchain4j-elasticsearch` |
| **Weaviate** | 服务端 | 内置语义搜索、GraphQL | 云原生、多租户 | `langchain4j-weaviate` |

**选型决策树**：

```text
是否已有基础设施？
  ├─ 已有 PostgreSQL → Pgvector（零额外运维）
  ├─ 已有 Elasticsearch → ES（向量+全文混合搜索）
  └─ 无 → 下一步
      ├─ 本地开发/原型 → Chroma（零配置嵌入式）
      └─ 生产环境 → 下一步
          ├─ 规模百万级 → Qdrant（Rust 高性能）
          └─ 规模十亿级 → Milvus（分布式+GPU）
```

---

#### RAG 评估指标体系

**检索质量评估**（衡量检索层效果）：

| 指标 | 全称 | 衡量内容 | 说明 |
|------|------|---------|------|
| Precision | 查准率 | 检索结果中相关文档的比例 | 返回了太多无关文档 |
| Recall | 查全率 | 相关文档被检索到的比例 | 遗漏了关键文档 |
| MRR | Mean Reciprocal Rank | 第一个相关结果的位置 | 是否首位即命中 |
| NDCG | 归一化折损累计增益 | 排序质量（位置权重） | 越相关越靠前 |

**生成质量评估**（衡量 LLM 回答质量）：

| 指标 | 衡量内容 | 计算方式 |
|------|---------|---------|
| Faithfulness（忠实度）| 答案是否严格源于检索上下文 | 逐句判断答案中的陈述能否从上下文中推断 |
| Answer Relevancy | 答案是否回答了问题 | 反向生成问题，与原问题计算语义相似度 |
| Context Precision | 检索文档中真正相关的比例 | 文档级别相关性判断 |

**RAGAS 框架**：使用 LLM-as-Judge 模式，通过高性能模型（如 GPT-4o）自动评分。

---

#### RAG 优化策略

| 策略 | 原理 | 适用场景 |
|------|------|---------|
| **Hybrid Search** | 向量语义 + 关键词 BM25 融合（RRF 倒排名融合）| 语义漂移严重、专有名词查询 |
| **Query Rewriting** | 将原问题重写/扩写为多个查询变体 | 用户表述模糊 |
| **HyDE** | 先生成假设文档再向量化检索 | 查询-文档语义 gap 大 |
| **ReRank** | Bi-Encoder 初筛 → Cross-Encoder 精排 | 检索结果过多需要二次精排 |
| **Multi-hop RAG** | 复杂问题分解为子问题逐步检索 | 多步骤推理（类似思维链）|

> **关联知识点**：Vector DB → 5.3 RAG 知识检索（数据流：Embedding→存储→检索）/ RAG 评估 → 5.6 Streaming 流式响应（onRetrieved 回调检验检索质量）

---

**追问链**：`Vector DB 选型(查固库→ES→Chroma/生产→Qdrant→Milvus) → Pgvector 零运维 → Chroma 原型开发 → Qdrant Rust 高性能 → Milvus 分布式 → ES 混合搜索 → RAG 检索指标(Precision/Recall/MRR/NDCG) → 生成指标(Faithfulness/Relevancy) → RAGAS LLM-as-Judge → 优化策略 Hybrid Search(向量+BM25) → Query Rewriting → HyDE → ReRank(Bi→Cross) → Multi-hop RAG → 与 5.3 的关联`

---

## 5.9 AI Gateway 与 API 管理

**一句话原理**：AI Gateway 作为 LLM 调用的统一入口，提供多模型路由、限流熔断、成本控制、可观测性等企业级治理能力。

---

#### 核心能力

| 能力 | 说明 | 作用 |
|------|------|------|
| 统一入口 | 多模型（OpenAI/Claude/Gemini/Qwen）一个 API | 降低集成复杂度 |
| 限流熔断 | 按模型/用户/API Key 限流 | 防止单个模型过载 |
| 成本控制 | 用量监控、预算告警、模型分级 | 避免预算超支 |
| 模型路由 | 按策略（成本/延迟/模型能力）选择模型 | 灵活切换 |
| 故障转移 | 模型不可用时自动切换备选 | 高可用保障 |
| 语义缓存 | 相似问题直接返回结果 | 降低成本、降低延迟 |

---

#### 主流方案对比

| 方案 | 定位 | 开源 | 特点 |
|------|------|:----:|------|
| **OpenRouter** | LLM MarketPlace | 否 | 聚合 250+ 模型，按量付费，天然路由策略 |
| **Portkey** | 开源 AI Gateway | 是 | 45kB 轻量，200+ 模型，故障转移+语义缓存 |
| **Higress** | 云原生网关 | 是 | 基于 Envoy 的 AI 流量治理，企业级 |

**AI Gateway vs SDK 模式**：

```text
SDK 模式（直接调用）：
  应用 → OpenAI SDK → OpenAI API
  应用 → Claude SDK → Claude API
  → 每个模型独立配置，限流/鉴权重复实现

Gateway 模式：
  应用 → Gateway 统一 API → OpenAI / Claude / Gemini ...
  → 统一配置、集中管控、语言无关
```

> **常见陷阱**：AI Gateway 并非替代 LLM SDK，而是 SDK 的上层治理层。生产环境建议 Gateway + SDK 共同使用，Gateway 负责流量治理，SDK 负责功能集成。

> **关联知识点**：模型路由 → 5.2 多模型切换（策略模式实现）/ 限流熔断 → [Spring Cloud Sentinel](java知识规划——springCloud微服务.md#33-sentinel-限流与熔断) / 语义缓存 → [MySQL Buffer Pool](java知识规划——mysql.md#410-innodb-内存结构buffer-pool--redo-log--undo-log--binlog) LRU 缓存淘汰思路相通

---

**追问链**：`AI Gateway 核心能力(统一入口/限流/成本/路由/容错/缓存) → OpenRouter 聚合 250+ 模型 → Portkey 开源 45kB → Higress Envoy 架构 → Gateway vs SDK(集中管控 vs 语言绑定) → LangChain4j 模型路由(策略模式切换 ChatModel) → Spring AI fallback(RetryTemplate) → 与 5.2 多模型切换关联`

---

**整体追问链（方向五 更新）**：`AiServices 动态代理 → ChatModel 统一抽象 → 多模型切换 → RAG 完整链路 → Tool Calling 执行过程 → @Tool 注解 → ChatMemory 三种类型 → @MemoryId 会话隔离 → TokenStream 回调 → 流式 vs 阻塞 → MCP 三层架构(Host/Client/Server) → MCP vs FC 对比(协议 vs 原生能力) → LangChain4j MCP 集成(McpTransport→McpClient→ToolProvider) → Vector DB 选型(Pgvector/Chroma/Milvus/Qdrant/ES/Weaviate) → RAG 评估(Precision/MRR/Faithfulness/Relevancy) → RAGAS LLM-as-Judge → RAG 优化(Hybrid Search/ReRank/Multi-hop) → AI Gateway(统一入口/限流/路由/故障转移) → Spring AI ChatClient Fluent API → Advisor 体系(7 种内置) → 与 JDK Proxy 代理链关联`
