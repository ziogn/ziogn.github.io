---
title: java知识规划——springCloud微服务
created: 2026-07-17 22:00
updated: 2026-07-17 22:00
version: 0.1.0
author: ziogn
tags: [java, spring, spring-cloud, microservices, interview, guide, research]
aliases: [Spring Cloud面试, 微服务面试, Spring Cloud Alibaba]
description: Spring Cloud 微服务面试知识规划，覆盖 Nacos 注册配置、Gateway 路由、Sentinel 限流熔断、Dubbo RPC、Seata 分布式事务、RocketMQ 消息、链路追踪、OpenFeign 九大组件，附知识点追问链与跨域知识关联。
---

# java知识规划——springCloud微服务

> 本文档覆盖 Spring Cloud 微服务知识体系，按"Nacos → Gateway → Sentinel → Dubbo → Seata → RocketMQ → 链路追踪 → OpenFeign → Bootstrap 上下文"层层递进。每节末尾标注与 [Spring](java知识规划——spring.md)、[Java 核心](java知识规划——核心.md) 及 [MySQL](java知识规划——mysql.md) 方向的知识关联。

---

## 3.1 Nacos：注册中心 + 配置中心

**注册中心原理**：

```text
服务启动 → 向 Nacos Server 注册
  → Nacos 维护服务注册表
  → 消费者从 Nacos 拉取服务列表（定时 10s 拉取 + UDP 长轮询推送变更）
  → 服务实例每 5s 发送心跳维持健康状态
  → Nacos 15s 未收到心跳标记为不健康，30s 彻底移除
```

**CAP 权衡**：

| 模式 | 一致性 | 可用性 | 使用场景 |
|------|--------|--------|---------|
| AP（默认） | 最终一致 | 优先 | 注册中心 |
| CP | 强一致 | 次优先 | 配置中心 |

**配置中心结构**：`Namespace（环境隔离）→ Group（逻辑分组）→ DataId（具体配置）`

**配置动态刷新**：

```java
// 方式一：@RefreshScope（Bean 重新初始化）
@RefreshScope
@ConfigurationProperties(prefix = "order")
public class OrderProperties {
    private Integer timeout;
    private Boolean retryEnabled;
}

```

**配置中心长轮询原理**：
客户端请求携带所有配置项 MD5 → 服务端逐批比对（每批 3000 个配置项），无变化则挂起请求 30s → 有变更立即返回变更 Key → 客户端再逐个拉取新值。对比纯 WebSocket 推送，长轮询在连接数管理上更轻量，Nacos 2.0 才引入 gRPC 双工通信改善实时性。

**灰度配置（Beta 发布）**：
在 Nacos 控制台对单个配置开启 Beta 发布，指定目标 IP 列表 → 灰度配置定向推送到指定客户端 → 验证通过后一键全量发布或停止 Beta。IP 粒度的定向推送，适合灰度验证场景。

**Nacos 2.0 gRPC 改进**：
2.0 引入 gRPC 长连接替代 1.x 的 HTTP 长轮询 + UDP 推送，实现服务端主动推送，配置变更实时性从秒级提升到毫秒级。

**临时实例 vs 持久化实例**：

| 类型 | 健康检查 | 心跳超时处理 |
|------|---------|-------------|
| 临时实例（默认） | 心跳上报 | 15s 不健康 → 30s 剔除 |
| 持久化实例 | 服务端主动探测 | 不会被自动剔除 |

**注册中心 CAP 对比**：

| 注册中心 | CAP 模型 | 一致性协议 |
|---------|---------|-----------|
| Nacos | AP（注册）/ CP（配置） | Distro / Raft |
| Eureka | AP（纯可用性优先） | 自保护模式 |
| Consul | CP | Raft |
| Zookeeper | CP | ZAB |

> **关联知识点**：长轮询挂起 → HTTP 连接池管理 / Nacos 2.0 gRPC → Netty 网络编程 / 注册中心 CAP → 分布式理论

**追问链**：`Nacos 注册中心原理 → 心跳机制 → CAP 权衡(AP/CP) → 配置中心长轮询原理(30s挂起+MD5分片) → 灰度配置Beta发布 → Nacos 2.0 gRPC改进 → 临时vs持久化实例 → 注册中心CAP对比(Nacos/Eureka/Consul/ZK)`

---

## 3.2 Gateway 路由网关

Spring Cloud Gateway 基于 Spring WebFlux（Reactor），核心三要素：

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/users/**
            - Method=GET,POST
          filters:
            - StripPrefix=1
            - AddRequestHeader=X-Request-Id, 123456
```

**执行流程**：`客户端请求 → 匹配 Route → 进入 Filter 链 → 转发到目标服务 → 返回响应`

**常用 Predicate 工厂**：Path、Method、Header、Query、Cookie、Before/After

> **常见陷阱**：Gateway 基于 WebFlux，Filter 中不能使用阻塞 API（如 JDBC、Thread.sleep）；全局 Filter 对所有 Route 生效。

**自定义 GatewayFilter 工厂**：

```java
// 继承 AbstractGatewayFilterFactory<Config>，yaml 中 name 为类名前缀
@Component
public class CheckAuthGatewayFilterFactory
    extends AbstractGatewayFilterFactory<CheckAuthGatewayFilterFactory.Config> {

    public CheckAuthGatewayFilterFactory() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            // 非阻塞验证，不能使用 JDBC/Thread.sleep
            String token = exchange.getRequest().getHeaders()
                .getFirst(config.getTokenHeader());
            if (token == null || !token.startsWith("Bearer ")) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }
            return chain.filter(exchange);
        };
    }

    @Data
    public static class Config {
        private String tokenHeader = "Authorization";
    }
}
```

**GlobalFilter**：实现 `GlobalFilter` + `Ordered` 接口，对所有路由生效，常用于鉴权、日志记录、TraceId 注入。

```java
@Component
@Order(-1)
public class AuthGlobalFilter implements GlobalFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest().mutate()
            .header("X-Trace-Id", UUID.randomUUID().toString())
            .build();
        return chain.filter(exchange.mutate().request(request).build());
    }
}
```

**CORS 配置**：Gateway 层通过 `GlobalCorsProperties` 配置，区别于 MVC 层的 `@CrossOrigin`。Gateway CORS 作用于网关入口层，MVC CORS 作用于具体服务。

```yaml
spring:
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins: "https://example.com"
            allowedMethods: "*"
```

**RequestRateLimiter 限流**：基于 Redis+Lua 令牌桶实现，由 `KeyResolver` 确定限流维度（IP/用户/URL）。

```java
@Bean
public KeyResolver userKeyResolver() {
    return exchange -> Mono.just(
        exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
    );
}
```

```yaml
filters:
  - name: RequestRateLimiter
    args:
      redis-rate-limiter.replenishRate: 10
      redis-rate-limiter.burstCapacity: 20
      key-resolver: "#{@userKeyResolver}"
```

**Gateway vs Zuul 1.x 对比**：

| 维度 | Gateway | Zuul 1.x |
|------|---------|----------|
| 底层 | WebFlux（Netty，非阻塞） | Servlet（Tomcat，阻塞 IO） |
| 性能 | 高（约 1.6x Zuul） | 中 |
| 长连接 | 原生支持 | 需额外配置 |
| 限流 | 内置 RequestRateLimiter | 需自行实现 |

**动态路由**：结合 Nacos 配置中心，通过 `RouteDefinitionLocator` + `ApplicationEventPublisher` 实现路由动态刷新，无需重启 Gateway。

> **常见陷阱补充**：RequestRateLimiter 依赖 Redis，Redis 不可用时所有请求默认被拒绝（需配置 fallback）；WebFlux 非阻塞模型禁止阻塞 API。

**追问链**：`Gateway 路由三要素 → Predicate 匹配 → Filter 链 → 自定义GatewayFilter工厂 → GlobalFilter鉴权日志 → RequestRateLimiter Redis+Lua → Gateway vs Zuul 1.x → 动态路由 → WebFlux非阻塞限制`

---

## 3.3 Sentinel 限流与熔断

Sentinel 以"资源"为粒度进行流量控制。

**流量控制规则**：

```java
FlowRule rule = new FlowRule();
rule.setResource("GET:/api/orders");
rule.setGrade(RuleConstant.FLOW_GRADE_QPS);
rule.setCount(100);
FlowRuleManager.loadRules(Collections.singletonList(rule));
```

**熔断状态机**：

```text
Closed（关闭，正常状态）
  → 异常比例/慢调用比例超过阈值 → Open（开启，直接拒绝请求）
  → 经过 timeWindow 时间后 → Half-Open（半开，放行少量试探请求）
  → 试探成功 → Closed
  → 试探失败 → Open（重新计时）
```

**限流算法对比**：

| 算法 | 特点 | Sentinel 使用 |
|------|------|--------------|
| 滑动窗口 | 将时间窗分为多个小格，逐格统计 | 默认 QPS 限流 |
| 令牌桶 | 固定速率放令牌，桶内积累令牌应对突发 | Warm Up 模式 |
| 漏桶 | 固定速率处理请求，超出丢弃 | 排队等待模式 |

**@SentinelResource 注解**：

| 属性 | 作用 | 区别 |
|------|------|------|
| value | 资源名称 | 唯一标识 |
| blockHandler | 限流/熔断降级处理方法 | 处理 FlowException/DegradeException |
| fallback | 业务异常兜底 | 处理业务异常（非限流异常） |
| blockHandlerClass | 统一处理类 | 静态方法在指定类中 |

```java
@SentinelResource(
    value = "createOrder",
    blockHandler = "createOrderBlockHandler",
    fallback = "createOrderFallback",
    blockHandlerClass = OrderBlockHandler.class
)
public Order createOrder(OrderCreateDTO dto) {
    // 业务逻辑
}
```

> blockHandler 处理限流异常，fallback 处理业务异常，两者可独立配置互不干扰。

**热点参数限流**：基于 LRU + 滑动窗口统计热点参数 QPS，支持参数例外项（特定参数值单独阈值），仅支持 QPS 模式。

```java
ParamFlowRule rule = new ParamFlowRule("createOrder")
    .setParamIdx(0)
    .setCount(100)
    .setParamFlowItemList(Collections.singletonList(
        new ParamFlowItem().setObject("1001").setCount(50)
    ));
ParamFlowRuleManager.loadRules(Collections.singletonList(rule));
```

**系统自适应保护**：

| 模式 | 指标 | 说明 |
|------|------|------|
| Load | 系统负载（BBR 算法） | 仅 Linux 有效 |
| CPU | CPU 使用率 | 1.5.0+ |
| RT | 平均响应时间 | — |
| 入口 QPS | 总 QPS | — |
| 并发线程数 | 总线程数 | — |

**规则持久化三种模式**：

| 模式 | 存储 | 变更推送 | 优点 | 缺点 |
|------|------|---------|------|------|
| 原始模式 | 内存 | — | 简单 | 重启丢失 |
| Push | Nacos/ZK | 配置中心监听实时生效 | 实时可靠 | 架构复杂 |
| Pull | 本地文件/DB | 客户端定期轮询（30s） | 实现简单 | 有延迟 |

**RestTemplate/Feign 整合 Sentinel**：

```java
@Bean
@SentinelRestTemplate(
    fallback = "fallback",
    blockHandler = "blockHandler",
    blockHandlerClass = SentinelUtil.class
)
public RestTemplate restTemplate() {
    return new RestTemplate();
}
```

```yaml
# application.yml
feign:
  sentinel:
    enabled: true  # Feign 调用自动接入 Sentinel
```

**Sentinel Slot 链（ProcessorSlotChain）**：每个资源进入 Sentinel 时依次经过以下 Slot：

```text
NodeSelectorSlot（构建调用树）
  → ClusterBuilderSlot（创建集群统计节点）
    → StatisticSlot（统计实时指标）
      → FlowSlot（流控规则校验）
        → DegradeSlot（熔断降级规则校验）
          → SystemSlot（系统自适应保护校验）
```

**追问链**：`@SentinelResource 详解 → blockHandler/fallback 区别 → 热点参数限流(LRU+滑动窗口) → 系统自适应保护(Load/CPU/RT) → 规则持久化Push vs Pull → RestTemplate/Feign 整合 → Slot 链各节点职责`

---

## 3.4 Dubbo RPC 框架

Dubbo 是阿里巴巴开源的高性能 Java RPC 框架，基于 TCP 长连接 + NIO 多路复用实现高效远程调用，与 Spring Cloud Alibaba 生态深度集成。

**Dubbo 协议特点**：

```text
TCP 长连接 + Netty NIO 多路复用 + Hessian2 二进制序列化
  → 适合小数据量（<100KB）、高并发场景
  → 单一长连接承载大量请求，减少连接建立开销
  → 不适合传大包（>100KB 建议切 HTTP）
```

**Dubbo vs OpenFeign 对比**：

| 维度 | Dubbo | OpenFeign |
|------|-------|-----------|
| 通信协议 | TCP 长连接 | HTTP 短连接 |
| 序列化 | Hessian2 二进制 | JSON 文本 |
| 性能 | 高（TCP 复用 + 二进制） | 中（HTTP 解析开销） |
| 侵入性 | 需要 Dubbo 接口契约 | 标准 HTTP 接口 |
| 跨语言 | 需多语言 SDK | 天然跨语言 |
| 适用场景 | 内部服务间高频调用 | 对外 REST API |

**负载均衡策略**：

| 策略 | 算法 | 说明 |
|------|------|------|
| Random（默认） | 加权随机 | 按权重分配 |
| RoundRobin | 加权轮询 | 平滑加权轮询 |
| LeastActive | 最少活跃数 | 选当前请求数最少的节点 |
| ConsistentHash | 一致性哈希 | 相同参数路由到同一节点 |

**集群容错策略**：

| 策略 | 行为 | 适用场景 |
|------|------|---------|
| Failover（默认） | 失败重试其他节点 | 读操作、幂等写 |
| Failfast | 立即失败 | 非幂等写操作 |
| Failsafe | 异常静默忽略 | 日志上报等非核心 |
| Forking | 并行调用多个，取第一个成功 | 实时性要求极高 |
| Broadcast | 广播所有节点 | 状态同步 |

**Dubbo SPI 扩展机制**：微内核 + 插件化架构，可自定义协议、序列化、过滤器、注册中心等。相比 Java SPI，Dubbo SPI 增加了按需加载（ExtensionLoader）、自适应扩展（@Adaptive）、条件激活（@Activate）等能力。

```text
java SPI：ServiceLoader 加载所有实现（全量加载、无选择）
dubbo SPI：ExtensionLoader 按需加载 + 自适应扩展
  → @SPI("dubbo") 指定默认实现名
  → @Adaptive 运行时动态选择实现
  → @Activate 条件激活（按参数匹配）
```

**多协议支持**：Dubbo 协议（默认 TCP）→ Triple（HTTP/2，云原生兼容 gRPC）、gRPC、Thrift、REST。3.x 推荐 Triple 协议适配 gRPC 生态。

> **常见陷阱**：Dubbo 协议传大包（>100KB）性能急剧下降；TCP 长连接线程池耗尽可能导致服务雪崩，需合理配置线程池参数。

> **关联知识点**：[JDK Proxy vs CGLIB](java知识规划——核心.md#16-设计模式) AOP 代理 / OpenFeign 声明式调用的 HTTP 方案对比

```java
// Dubbo 服务暴露
@DubboService
public class UserServiceImpl implements UserService {
    @Override
    public User findById(Long id) {
        return userMapper.selectById(id);
    }
}

// Dubbo 服务引用
@DubboReference
private UserService userService;
```

**追问链**：`Dubbo 协议特点 → TCP 长连接 NIO → vs OpenFeign 选型 → 负载均衡五种策略 → ConsistentHash 场景 → 集群容错五种策略 → Failover vs Failfast → SPI 扩展机制 vs Java SPI → Triple 协议云原生`

---

## 3.5 Seata 分布式事务

Seata 是阿里巴巴开源的分布式事务解决方案，提供四种事务模式覆盖不同一致性需求。

**AT 模式**（Auto Transaction，自动模式）：无侵入方案，通过 DataSourceProxy 自动拦截 SQL。

```text
一阶段：业务 SQL → Seata 代理 DataSource 拦截 → 记录 before image + after image
  → 插入 undo_log 表 → 获取全局锁 → 提交本地事务
二阶段 Commit：清除 undo_log → 释放全局锁
二阶段 Rollback：读取 undo_log before image → 生成反向 SQL 回滚数据 → 清除 undo_log
```

**AT 模式写隔离**：

```text
事务 A 获取全局锁（Table:PK）→ 提交本地事务释放本地锁
事务 B 尝试获取同一全局锁 → 获取超时后本地事务回滚（默认不重试，需业务层设计重试策略）
```

> AT 模式下获取全局锁失败默认抛异常回滚本地事务，不会阻塞等待重试。业务层需通过重试机制（如 AOP 重试 + 回退）处理全局锁竞争。

**AT 模式读隔离**：

```text
快照读（普通 SELECT）：不加全局锁，可能读到全局锁未提交的数据，存在脏读风险
当前读（SELECT FOR UPDATE）：触发全局锁，实现严格读隔离，但性能下降
```

> 面试追问方向：快照读 vs 当前读的选择策略是什么？AT 模式读隔离与 InnoDB MVCC 读隔离的区别？

**TCC 模式**（Try-Confirm-Cancel）：侵入式方案，需手动实现三阶段：

| 阶段 | 行为 | 需解决 |
|------|------|--------|
| Try | 资源预留（如冻结库存） | 空回滚、幂等 |
| Confirm | 确认提交 | 幂等 |
| Cancel | 补偿回滚 | 幂等、防悬挂 |

> 空回滚：Try 未执行但 Cancel 被调用；悬挂：Cancel 比 Try 先到达。需通过事务记录表状态判断。

**Saga 模式**：状态机编排，一阶段直接提交本地事务，失败后执行补偿事务。正向恢复（重试）vs 反向恢复（补偿）。

**XA 模式**：基于 X/Open XA 规范，通过分支事务 + 全局锁实现强一致性。实现简单但性能最低。

**四种模式对比**：

| 模式 | 一致性 | 性能 | 侵入性 | 适用场景 |
|------|--------|------|--------|---------|
| XA | 强一致 | 低 | 低 | 银行转账等 |
| AT | 最终一致 | 中 | 低 | 大部分微服务 |
| TCC | 最终一致 | 高 | 高 | 高并发核心链路 |
| Saga | 最终一致 | 高 | 中 | 长事务 |

**架构三角色**：

```text
TC（Transaction Coordinator）：独立部署的事务协调器，维护全局事务状态
TM（Transaction Manager）：发起方，开启/提交/回滚全局事务（@GlobalTransactional）
RM（Resource Manager）：参与方，注册分支事务 → 报告分支状态
```

> **关联知识点**：AT 模式 undo_log → [MySQL 事务日志](java知识规划——mysql.md#43-redo-log--bin-log--undo-log) / 隔离级别 → [MySQL MVCC](java知识规划——mysql.md#45-mvcc-实现原理undo-log--readview)

```java
@GlobalTransactional
public void createOrder(OrderCreateDTO dto) {
    orderService.create(dto);       // 本地事务
    accountService.deduct(dto);      // 远程调用 → RM 参与全局事务
    inventoryService.lock(dto);      // 远程调用 → RM 参与全局事务
    // 任一 RM 失败 → TC 协调全部回滚
}
```

**追问链**：`@GlobalTransactional → AT 模式二阶段流程 → undo_log 前后镜像 → 全局锁写隔离 → 获取全局锁失败不回滚 → TCC Try/Confirm/Cancel → 空回滚/幂等/悬挂 → Saga 状态机编排 → XA 强一致 → 四种模式对比选型 → TC/TM/RM 架构`

---

## 3.6 RocketMQ 消息中间件

RocketMQ 是阿里巴巴开源的分布式消息中间件，提供高可靠、高吞吐的消息能力，与 Spring Cloud Alibaba 生态深度集成。

**核心角色**：

```text
Producer（消息生产者）→ NameServer（无状态路由注册中心，节点之间不通信）
  → Broker（消息存储转发，主从部署）
  → Consumer（消息消费者，消费组负载均衡）
```

NameServer 节点间不通信，Producer/Consumer 从任一 NameServer 获取全量 Broker 路由信息。

**事务消息**：

```text
① Producer 发送半消息（Half Message，对 Consumer 不可见）
② Broker 存储半消息，返回 OK
③ Producer 执行本地事务
④ 本地事务成功 → 发送 COMMIT → Consumer 可见
⑤ 本地事务失败 → 发送 ROLLBACK → 半消息删除
⑥ 本地事务无结果 → Broker 回查 Producer（6s 间隔，最多 15 次）
```

> 回查最小间隔 6s，频繁回查有性能开销；回查接口必须幂等；事务消息不支持延迟/批量/定时。

**顺序消息**：分区顺序通过 `MessageQueueSelector` 将相同 sharding key 的消息投递到同一 Queue，消费端使用 `MessageListenerOrderly`。

```java
// 发送端 — 订单 ID 作为分区键
producer.send(message, new MessageQueueSelector() {
    @Override
    public MessageQueue select(List<MessageQueue> mqs, Message msg, Object arg) {
        Long orderId = (Long) arg;
        return mqs.get(orderId.intValue() % mqs.size());
    }
}, orderId);

// 消费端 — 有序消费
consumer.registerMessageListener((MessageListenerOrderly) (msgs, context) -> {
    // 串行消费同一 Queue
    return ConsumeOrderlyStatus.SUCCESS;
});
```

**延迟消息**：18 个固定延迟级别（1s/5s/10s/30s/1m/2m/3m/4m/5m/6m/7m/8m/9m/10m/20m/30m/1h/2h），通过延迟队列 `SCHEDULE_TOPIC_XXXX` 实现定时调度。

**消息可靠性保障**：

| 环节 | 保障措施 |
|------|---------|
| 生产端 | 同步发送 + 重试（默认 2 次）+ 发送回调确认 |
| Broker 端 | 同步刷盘（SYNC_FLUSH）+ 同步复制（SYNC_MASTER） |
| 消费端 | 业务处理完手动 CONSUME_SUCCESS，异常重试 16 次 |

**消息幂等性**：RocketMQ 投递语义为 at-least-once，消费端可能收到重复消息，需业务方自行幂等。

```java
// 方案一：唯一键去重
if (redis.setIfAbsent("order:paid:" + orderId, "1", 10, TimeUnit.SECONDS)) {
    processOrder(orderId);
}

// 方案二：状态机判断
int rows = db.update("UPDATE orders SET status='PAID' WHERE id=? AND status='UNPAID'", orderId);
if (rows > 0) { // 未处理过
    doPostProcess();
}

**消息堆积处理策略**：

堆积原因：消费能力跟不上生产速度（消费耗时 > 生产速率），或 Consumer 数量不足、处理逻辑过于重量级。

临时处理方案：
1. 创建新 Topic，扩容 Queue 数量（Queue 是消费并发单元）
2. 部署"搬运 Consumer"：从原 Topic 批量拉取并转发到新 Topic
3. 业务 Consumer 从新 Topic 消费，并行度提高

预防方案：监控 Consumer 堆积深度 → 动态扩容 Consumer（Rebalance 自动分配）→ 避免非核心业务与核心业务混用线程池。

> **常见陷阱**：事务消息回查接口必须幂等；消息堆积时不可随意跳过需确认不丢业务；at-least-once 意味着消费端必须在业务侧做幂等。

> **关联知识点**：事务消息 → [Seata AT 模式](#35-seata-分布式事务) 分布式事务对比 / 消息堆积 → [线程池机制](java知识规划——核心.md#13-并发编程) 异步处理

**追问链**：`RocketMQ 核心角色 → NameServer 无状态设计 → 事务消息半消息+回查机制 → 回查 6s/最多15次 → 顺序消息 MessageQueueSelector → 延迟消息 18 级别 → 消息可靠性三端保障 → 同步刷盘 vs 异步刷盘 → 消息幂等 at-least-once → 堆积处理策略`

---

## 3.7 链路追踪（Micrometer Tracing / SkyWalking）

Spring Boot 3.x 弃用 Sleuth，推荐使用 Micrometer Tracing（基于 Brave 或 OpenTelemetry 实现）。

**TraceId / SpanId**：

```text
外部请求 → Gateway 生成 TraceId（UUID）
  → 服务 A SpanA（Parent Span）
    → 调用服务 B SpanB（Child Span，携带 ParentSpanId=SpanA）
      → 调用服务 C SpanC
```

- TraceId：标识完整请求链路，透传所有服务
- SpanId：标识每个服务处理单元，ParentSpanId 构建调用树
- 透传方式：HTTP Header（`X-B3-TraceId`/`X-B3-SpanId`）或 Dubbo RpcContext

**Zipkin 集成**：

```yaml
# application.yml — Micrometer Tracing + Zipkin
management:
  tracing:
    sampling:
      probability: 0.1  # 采样率 10%
  zipkin:
    tracing:
      endpoint: http://zipkin-server:9411/api/v2/spans
```

**SkyWalking 架构**：

```text
Agent（Byte Buddy 字节码增强，无侵入）
  → OAP Server（数据聚合分析）
    → Storage（Elasticsearch / MySQL / H2）
      → UI（可视化展示）
```

SkyWalking 通过 Byte Buddy 在加载时修改字节码，自动拦截 HTTP/Dubbo/gRPC/DB 等调用，无需手动埋点。

**采样策略**：

| 策略 | 说明 | 配置 |
|------|------|------|
| 固定采样率 | 按百分比采样（0.0-1.0） | management.tracing.sampling.probability |
| 速率限制 | 每秒采样上限 | 自定义 Sampler |

> 生产环境采样率建议 0.1（10%），全量采样会对高并发服务产生性能影响。

> **关联知识点**：TraceId 透传 → [ThreadLocal 线程隔离](java知识规划——核心.md#13-并发编程) / Span 构建 → [AOP 切面拦截](java知识规划——核心.md#16-设计模式) 自动埋点

**追问链**：`链路追踪解决了什么问题 → TraceId/SpanId 父子关系 → HTTP Header 透传 → Micrometer Tracing 替代 Sleuth → Zipkin Span 上报 → SkyWalking 无侵入 Agent → Byte Buddy 字节码增强 → 采样策略 0.1 → 与日志系统 MDC 关联`

---

## 3.8 OpenFeign 声明式调用

OpenFeign 通过接口注解定义 HTTP 客户端，动态代理生成实现类。

```java
@FeignClient(
    name = "user-service",
    path = "/api/users",
    fallbackFactory = UserClientFallbackFactory.class
)
public interface UserClient {

    @GetMapping("/{id}")
    Result&lt;user> getUser(@PathVariable Long id);
}
```

**Feign 调用链路**：`@FeignClient 接口调用 → 动态代理发起 HTTP 请求 → RequestInterceptor 拦截 → 负载均衡 → 发送 HTTP 请求 → ErrorDecoder 处理响应`

> **常见陷阱**：Feign 超时不设置或设置过长会导致线程池耗尽；重试机制需要幂等性保证。

> **关联知识点**：Dubbo vs OpenFeign 对比 → TCP 长连接 vs HTTP 短连接选型依据 / Feign 动态代理 → [动态代理模式](java知识规划——核心.md#16-设计模式)

---

## 3.9 Bootstrap 上下文与配置加载

Spring Cloud 应用在启动时比 Spring Boot 多了一个 Bootstrap 上下文：

```text
Spring Cloud 应用启动
  → Bootstrap ApplicationContext 初始化
  → 加载 bootstrap.yml / bootstrap-{profile}.yml
  → 从 Nacos Config 拉取远程配置
  → 创建主 ApplicationContext（读取远程配置+本地配置合并）
  → 正常 Spring Boot 启动流程
```

> **关联知识点**：微服务治理 → [MySQL 分库分表](java知识规划——mysql.md#48-分库分表shardingsphere-原理) 分布式场景 / Sentinel 熔断 → [线程池拒绝策略](java知识规划——核心.md#13-并发编程) 类比

---

**追问链**：`Nacos 注册中心原理 → 心跳机制 → CAP 权衡(AP/CP) → 配置中心长轮询原理(30s挂起+MD5分片) → 灰度配置Beta发布 → Nacos 2.0 gRPC改进 → 临时vs持久化实例 → 注册中心CAP对比(Nacos/Eureka/Consul/ZK) → Gateway 路由三要素 → Predicate 匹配 → Filter 链 → 自定义GatewayFilter工厂 → GlobalFilter鉴权日志 → RequestRateLimiter Redis+Lua → Gateway vs Zuul 1.x → 动态路由 → Sentinel 流量控制 → @SentinelResource blockHandler/fallback → 热点参数限流(LRU+滑动窗口) → 系统自适应保护(Load/CPU/RT) → 规则持久化Push/Pull → 熔断状态机(Closed/Open/Half-Open) → 滑动窗口/令牌桶/漏桶对比 → Dubbo RPC(TCP长连接+NIO+Hessian2) → 负载均衡五种策略 → 集群容错五种策略 → Dubbo vs OpenFeign → SPI扩展机制 → Seata AT模式二阶段 → undo_log前后镜像 → 全局锁写隔离 → TCC Try/Confirm/Cancel → 空回滚幂等悬挂 → Saga状态机编排 → 四种模式对比(XA/AT/TCC/Saga) → TC/TM/RM架构 → RocketMQ核心角色 → 事务消息半消息+回查 → 顺序消息MessageQueueSelector → 延迟消息18级别 → 消息可靠性三端保障 → 消息幂等 → 链路追踪TraceId/SpanId → Micrometer Tracing替代Sleuth → Zipkin/SkyWalking集成 → 无侵入Agent Byte Buddy → 采样策略 → OpenFeign声明式调用 → Feign调用链路 → 超时重试配置 → Bootstrap上下文 → 与 @Conditional(2.3) 及线程池拒绝策略(核心1.3) 关联`
