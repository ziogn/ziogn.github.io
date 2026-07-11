---
title: java知识规划——ai开发
created: 2026-07-11 15:00
updated: 2026-07-11 15:00
version: 0.0.1
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

**整体追问链（方向五）**：`AiServices 动态代理 → ChatModel 统一抽象 → 多模型切换 → RAG 完整链路 → Tool Calling 执行过程 → @Tool 注解 → ChatMemory 三种类型 → @MemoryId 会话隔离 → TokenStream 回调 → 流式 vs 阻塞 → 与 JDK Proxy 代理链关联`
