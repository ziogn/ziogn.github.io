---
title: "java知识规划——分布式系统"
date: "2026-07-23 12:20"
tags: [java, distributed, interview, guide, java面试, research]
description: "分布式系统理论面试知识规划，覆盖 CAP/BASE、一致性协议（2PC/Paxos/Raft/Gossip）、分布式 ID（雪花/Leaf）、分布式事务（TCC/Seata AT）、分布式锁、分布式存储、RPC/gRPC、链路追踪、配置中心、系统设计思维十大模块。"
version: 0.0.1
author: ziogn
aliases: [分布式系统面试, 分布式理论, CAP, Paxos, Raft]
---


# java知识规划——分布式系统

> 本文档是 Java 知识规划体系的理论补全，按"理论基石 → 一致性协议 → ID → 事务 → 锁 → 存储 → RPC → 可观测 → 配置 → 设计思维"递进。与 [Spring Cloud 微服务](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94springCloud%E5%BE%AE%E6%9C%8D%E5%8A%A1/)方向的关系：微服务是实践，分布式理论是底层原理。建议先读微服务方向再读本文档。

---

## 7.1 CAP 定理与 BASE 理论

**一句话原理**：分布式系统在 Consistency（一致性）、Availability（可用性）、Partition Tolerance（分区容错性）三者中最多同时满足两个。网络分区是基础设施的必然现象（P 必须选），实际是在 C 和 A 之间取舍。

---

#### CAP 不三角

```text
C（一致性）：所有节点在同一时刻看到同一份数据
A（可用性）：每次请求都能收到非错响应（不保证数据最新）
P（分区容错性）：网络分区时系统仍能正常工作

P 是必选——网络分区一定会发生，不可选择忽略。
实际决策：CP（优先一致，允许不可用）vs AP（优先可用，接受最终一致）
```

**两级节点场景证明**：网络分区发生时，节点 N1 和 N2 无法通信。如果允许 N1 接受写入，则分区恢复后 C 丢失；如果 N1 拒绝写入，则 A 丢失。C 和 A 只能选一个。

---

#### PACELC 扩展

`PACELC` 在 CAP 基础上增加无分区时的决策维度：

```text
P(artition) → 分区时在 A(可用性) 和 C(一致性) 之间取舍
E(lse) → 无分区时在 L(延迟) 和 C(一致性) 之间取舍
```

**意义**：系统设计不仅要考虑分区时的行为，还要考虑正常运行时的性能取舍。

---

#### BASE 理论

| 要素 | 英文 | 说明 |
|------|------|------|
| BA | Basically Available | 基本可用——允许部分功能降级 |
| S | Soft State | 软状态——中间状态不要求强一致 |
| E | Eventually Consistent | 最终一致——经过一段时间后数据趋于一致 |

BASE 是 AP 系统的设计原则，本质是**对 ACID 的妥协**。

---

#### AP vs CP 选型实践

| 场景 | 选型 | 举例 |
|------|:----:|------|
| 注册中心 | AP（优先可用）| Nacos（Distro 协议）、Eureka |
| 配置中心 | CP（优先一致）| Nacos Config（Raft）、Consul、ZooKeeper |
| 分布式锁 | CP / AP | CP: ZK/etcd、AP: Redis（可容忍丢锁）|
| 消息队列 | AP（最终一致）| Kafka、RocketMQ |
| 银行转账 | CP | Seata AT（全局锁强一致）|

> **常见陷阱**：CAP 不是"三选二"，是"P 必须选"，C 和 A 只能选一个。在实际系统中，C 和 A 是连续光谱而非二元对立。

> **关联知识点**：AP/CP 选型 → [Nacos 注册中心 CAP 权衡](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94springCloud%E5%BE%AE%E6%9C%8D%E5%8A%A1/#31-nacos注册中心--配置中心) / BASE 最终一致 → [MySQL 主从同步](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94mysql/#49-主从复制binlog) 最终一致

---

**追问链**：`CAP 定义(C/A/P) → 不三角证明(两节点分区) → P 是必选项 → PACELC 扩展(无分区时 L/C) → BASE 三要素(基本可用/软状态/最终一致) → AP vs CP 选型(注册中心 AP vs 配置中心 CP) → Nacos Distro vs Raft`

---

## 7.2 一致性协议（2PC / Paxos / Raft / Gossip）

**一句话原理**：一致性协议分为两大类别——**原子提交协议**（2PC/3PC，保证多节点同时提交或回滚）和**副本一致性协议**（Paxos/Raft，保证多副本数据一致）。Gossip 是去中心化的最终一致性协议。

---

#### 2PC（二阶段提交）

| 阶段 | 操作 | 说明 |
|:----:|------|------|
| **Prepare** | 协调者向所有参与者发送 prepare 请求 | 参与者执行事务但暂不提交，投票 Yes/No |
| **Commit/Abort** | 协调者收集投票，全 Yes 则发送 commit，任一 No 则发送 abort | 参与者按指令提交或回滚 |

**三大问题**：

| 问题 | 说明 |
|------|------|
| 同步阻塞 | Prepare 后参与者持有资源锁，等待协调者指令。长事务期间资源无法释放 |
| 协调者单点 | 协调者宕机后参与者无法决策，一直阻塞 |
| 脑裂（数据不一致）| Commit 阶段协调者宕机，部分参与者收到 Commit 并提交，部分未收到，数据不一致 |

**3PC 改进**：增加 CanCommit（询问能否提交）和 PreCommit（预提交）阶段，引入超时中断机制。PreCommit 后如果协调者超时，参与者自动提交。但网络分区时仍可能数据不一致。

---

#### Paxos（Basic Paxos）

Paxos 是 Leslie Lamport 提出的副本一致性协议，核心是**多数派（Quorum）**决策机制：

```text
Basic Paxos 两阶段：
  Phase 1 — Prepare：
    Proposer 选择提案编号 N，向 Acceptors 发送 Prepare(N)
    Acceptor 承诺：不再接受编号 < N 的提案。若已接受过某提案，则返回该提案
    → 获得多数 Acceptor 的 Promise 即为 Phase 1 成功

  Phase 2 — Accept：
    Proposer 发送 Accept(N, value) 给所有 Acceptor
    value 取值规则：Phase 1 中有已接受的提案，用编号最大的那个 value；否则 Proposer 自由选择
    → 多数 Acceptor 接受即提案通过
```

**Multi-Paxos**：通过选举唯一的 Leader（Proposer）简化流程。Leader 任期内的所有提案跳过 Prepare 阶段，直接进入 Accept，大幅提升性能。

---

#### Raft

Raft 将共识问题分解为三个可独立理解的子问题：

| 子问题 | 机制 | 说明 |
|--------|------|------|
| **Leader 选举** | Term + Election Timeout + 投票 | Follower → Candidate → Leader，获得多数票 |
| **日志复制** | Leader 接收请求 → AppendEntries → 多数确认 → Commit | 日志仅从 Leader 流向 Follower |
| **安全性** | 只有最新 Term 的 Log 可当选 Leader | 防止已提交的日志被覆盖 |

**Leader 选举流程**：
```text
Follower 在 Election Timeout（150-300ms 随机）内未收到 Leader 心跳
  → 转化为 Candidate，Term +1，给自己投票并请求其他节点投票
  → 获得多数（N/2+1）票 → 成为 Leader，开始发送心跳
  → 多个 Candidate 同时竞选 → 选票分裂 → 等待下一个 Election Timeout 重试
```

**日志复制流程**：
```text
Client 请求 → Leader 追加日志到本地
  → Leader 发送 AppendEntries RPC 给所有 Follower
  → 多数 Follower 写入成功 → Leader 提交日志，应用状态机
  → Leader 通知 Follower 该日志已提交
  → 全部节点应用状态机
```

**Raft vs Paxos 对比**：

| 维度 | Raft | Paxos |
|------|:----:|:-----:|
| 可理解性 | 高（分解为三个子问题）| 低（理论证明复杂）|
| 领导性 | 强（唯一 Leader）| 弱（可多个 Proposer 竞争）|
| 选主 | Term + Timeout | 额外 Paxos 实例 |
| 变更 | 支持成员变更（Joint Consensus 两阶段）| 需手动处理 |
| 应用 | etcd / Consul / Nacos CP 模式 | Chubby（Google）/ ZK（Zab，类 Raft）|

---

#### Gossip 协议

去中心化、节点间随机通信的最终一致性协议：

| 方式 | 说明 | 场景 |
|:----:|------|------|
| **反熵（Anti-entropy）** | 节点间全量数据交换，Push/Pull/Push-Pull 三种模式 | Redis Cluster 节点同步 |
| **谣言传播（Rumor mongering）** | 仅传播新数据，三状态：Suspective/Infective/Removed | Cassandra / Consul |

> **常见陷阱**：
> - 2PC 和 Paxos/Raft 解决的问题不同——2PC 解决的是"多个不同资源同时提交"，Paxos 解决的是"多个副本数据一致"
> - Raft 的 Election Timeout 需要随机化防止选票分裂，生产环境 150-300ms
> - Gossip 的反熵在大规模集群中网络开销大，谣言传播不能保证 100% 节点收到

> **关联知识点**：Raft → [Sentinel 故障转移 Raft](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94springCloud%E5%BE%AE%E6%9C%8D%E5%8A%A1/#32-gateway-路由网关) 选举 / Gossip → [Redis Cluster 通信](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94redis/#63-redis-主从--哨兵--集群) / 2PC → [Seata AT 全局锁](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94springCloud%E5%BE%AE%E6%9C%8D%E5%8A%A1/#35-seata-分布式事务) / Paxos → [ZooKeeper ZAB 协议](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94redis/#65-redis-分布式锁)

---

**追问链**：`2PC(Prepare/Commit) → 三大问题(阻塞/单点/脑裂) → 3PC 超时改进(仍可能不一致) → Paxos Prepare→Promise→Accept→Accepted → Multi-Paxos Leader 优化 → Raft Leader 选举(Term+Election Timeout) → 日志复制(AppendEntries/Commit/Apply) → 安全性(最新 Term 才能当选) → Raft vs Paxos(可理解性) → Gossip 反熵(全量) vs 谣言传播(增量) → 原子提交 vs 副本一致性(本质区别)`

---

## 7.3 分布式 ID 生成

**一句话原理**：Snowflake 雪花算法是业界主流方案（64 位 long，趋势递增、高性能）。美团 Leaf（号段模式/雪花模式+ZK）和百度 UidGenerator 是针对时钟回拨和 ID 缓存问题的优化方案。

---

#### 雪花算法（Snowflake）

```text
64 位 long 组成：
┌─┬──────────┬──────────┬──────────┐
│0│ 41bit    │ 10bit    │ 12bit    │
│ │ 毫秒时间戳│ 机器ID   │ 序列号   │
│ │ (69年)   │ (1024台) │ (4096/ms)│
└─┴──────────┴──────────┴──────────┘
```

- **1bit 符号位**：固定 0
- **41bit 时间戳**：毫秒级，自定义纪元（通常从 2016-11-01 起算），可用约 69 年
- **10bit 机器 ID**：集群 1024 个节点
- **12bit 序列号**：每毫秒 4096 个 ID，QPS 约 409 万/秒

```java
// 雪花算法 ID 生成核心
long timestamp = System.currentTimeMillis();
if (timestamp == lastTimestamp) {
    sequence = (sequence + 1) & 4095;  // 同一毫秒内递增
    if (sequence == 0) {               // 本毫秒已满，等待下一毫秒
        timestamp = waitNextMillis(lastTimestamp);
    }
} else {
    sequence = 0;                      // 新毫秒，序列号重置
}
id = (timestamp - EPOCH) << 22         // 时间戳左移 22 位
   | (workerId << 12)                  // 机器 ID 左移 12 位
   | sequence;                         // 序列号
```

**时钟回拨问题**：
- 回拨较小（< 几十 ms）→ 等待追上原时间
- 回拨较大 → 抛异常无法生成 ID（业界通过 ZK 记录上次时间戳来解决）
- 保留上一毫秒的最大序列号，回拨到上一毫秒时继续用该序列号

---

#### 方案对比

| 方案 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **UUID** | 128 位全局唯一 | 不依赖中心化服务 | 无序（B+Tree 页分裂）、存储大、不可读 |
| **Snowflake** | 64 位时间+机器+序列 | 趋势递增、高性能 | 依赖机器时钟 |
| **Leaf segment** | DB 号段预取（步长 step） | 双 buffer 异步加载，无时钟问题 | 依赖 DB |
| **Leaf snowflake** | 雪花算法 + ZK | 解决时钟回拨 | 依赖 ZK |
| **UidGenerator** | 雪花算法 + RingBuffer | CAS 无锁，自定义 bits | 百度内部，文档少 |
| **Redis INCR** | 自增原子命令 | 简单、递增 | 依赖 Redis 可用性 |

> **常见陷阱**：UUID 作为 MySQL 主键会导致频繁页分裂（UUID 无序）。Leaf 号段模式在 DB 宕机时无法分配新号段。雪花算法的时间戳回拨在容器环境（Docker/K8s）更频繁。

> **关联知识点**：Snowflake → B+Tree 顺序写入 / Leaf → 号段预取思想与 [MyBatis BatchExecutor](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94mybatis/#311-mybatis-executor-三种实现) 批量思想一致

---

**追问链**：`Snowflake 64 位组成(1+41+10+12) → QPS 409万 → 时钟回拨问题(小等/大抛) → UUID 缺点(无序页分裂) → Leaf segment(号段双buffer) → Leaf snowflake(ZK 持久化) → Redis INCR → 雪花算法 69年有效期`

---

## 7.4 分布式事务

**一句话原理**：分布式事务从强一致到最终一致有四种层次：XA（2PC 强一致，性能最低）→ Seata AT（自动补偿，无侵入）→ TCC（手动补偿，高侵入）→ 本地消息表 / 事务消息（最终一致，高吞吐）。

---

#### 四种模式对比

| 模式 | 一致性 | 性能 | 侵入性 | 适用场景 |
|:----:|:-----:|:----:|:------:|---------|
| **XA** | 强一致 | 最低 | 低（DB 层面支持）| 银行核心、资金转账 |
| **Seata AT** | 最终一致 | 中 | 低（@GlobalTransactional）| 大部分微服务场景 |
| **TCC** | 最终一致 | 高 | 高（业务实现三阶段）| 高并发核心链路 |
| **本地消息表/事务消息** | 最终一致 | 高 | 中 | 高吞吐异步场景 |

---

#### TCC 详解（Try/Confirm/Cancel）

| 阶段 | 行为 | 需解决的问题 |
|:----:|:----:|:-----------:|
| **Try** | 资源预留（如冻结库存）| **空回滚**：Try 未执行但 Cancel 被调用 |
| **Confirm** | 确认提交 | **幂等**：Confirm 可能被多次调用 |
| **Cancel** | 补偿回滚 | **悬挂**：Cancel 比 Try 先到达 |

> 三个问题通过事务记录表的状态机判断解决：记录表中有 Try 记录才执行 Cancel；没有 Try 记录说明是空回滚，直接返回成功。

#### Seata AT 模式要点

Seata AT 是业界最广泛使用的 Java 分布式事务方案，已在 [微服务文档](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94springCloud%E5%BE%AE%E6%9C%8D%E5%8A%A1/#35-seata-分布式事务) 详述。本文仅提炼其理论本质：

- AT = Auto Transaction，通过 DataSourceProxy 无侵入拦截 SQL
- 本质是 **TCC 的框架化实现**——Try（执行 SQL + 写 undo_log）= Confirm（清除 undo_log）/ Cancel（反向 SQL）
- 全局锁 = 分布式写隔离（基于表主键），获取失败抛异常回滚

#### RocketMQ 事务消息

| 步骤 | 说明 |
|:----:|------|
| ① 发送半消息 | Producer 发送 Half Message（对 Consumer 不可见）|
| ② 执行本地事务 | Producer 执行业务逻辑 |
| ③ 提交/回滚 | 本地事务成功 → COMMIT；失败 → ROLLBACK |
| ④ 服务端回查 | 无结果时 Broker 回查（6s 间隔，最多 15 次）|

> **常见陷阱**：回查接口必须幂等；事务消息不支持延迟/批量/定时。Seata AT 在全局锁竞争激烈时吞吐量急剧下降（全部转串行）。

> **关联知识点**：Seata AT → [微服务文档 Seata 全局锁](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94springCloud%E5%BE%AE%E6%9C%8D%E5%8A%A1/#35-seata-分布式事务) / 事务消息 → [RocketMQ 事务消息回查](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94springCloud%E5%BE%AE%E6%9C%8D%E5%8A%A1/#36-rocketmq-消息中间件) / XA → [MySQL 两阶段提交](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94mysql/#410-innodb-内存结构buffer-pool--redo-log--undo-log--binlog)

---

**追问链**：`四种模式对比(XA/AT/TCC/消息表) → TCC Try/Confirm/Cancel → 空回滚/幂等/悬挂三坑 → Seata AT(自动TCC实现) → 全局锁写隔离 → RocketMQ事务消息(半消息→回查6s/15次) → 回查幂等`

---

## 7.5 分布式锁

**一句话原理**：分布式锁三要素——互斥性、安全性（防误释放）、死锁预防（自动过期）。Redis（AP 高可用，可容忍丢锁）、ZooKeeper（CP 强一致，可靠性高）、etcd（Raft + Lease，云原生）三种方案各有适用场景。

---

#### 分布式锁方案对比

| 方案 | 一致性 | 性能 | 死锁预防 | 适用场景 |
|:----:|:-----:|:----:|:--------:|---------|
| **Redis SET NX + Lua** | AP | 最高 | TTL 自动过期 | 防重提交、缓存更新 |
| **Redisson RLock** | AP | 最高 | Watchdog 续期（10s/30s）| Spring Boot 项目（be-star）|
| **ZooKeeper 临时顺序节点** | CP | 中 | 会话断开自动删除 | 主备选举、配置管理 |
| **etcd Raft + Lease** | CP | 中 | Lease 租约续期 | K8s 协调、云原生 |

**Redis 主从切换丢锁问题**：
```text
Master 上锁成功 → Master 宕机 → Slave 晋升 Master
  → 新 Master 没有锁信息 → 其他线程可加锁成功
  → 本质：AP 系统的最终一致性
```

**ZooKeeper 锁原理**：
```text
尝试加锁线程 → 在锁节点下创建临时顺序节点（EPHEMERAL_SEQUENTIAL）
  → 获取所有子节点列表（按序号排序）
  → 自己是最小编号 → 加锁成功
  → 自己不是最小编号 → Watch 前一个节点
  → 前一个节点删除 → 重新检查自己是否最小编号
```

> **常见陷阱**：
> - Redis 锁主从切换丢锁问题只在"若此瞬间主宕机"的场景发生，实际业务概率极低。需要 CP 强一致的去使用 ZK/etcd
> - ZK 锁的"惊群效应"在大量线程等待同一锁时存在（虽然 ZK 1M/s 的处理能力已大幅缓解）
> - etcd 的 Lease 时间过短会导致锁频繁续期、过长会导致锁释放不及时

> **关联知识点**：Redis 分布式锁 → [Redis 分布式锁深度](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94redis/#65-redis-分布式锁) / ZK 临时节点 → [核心 会话超时](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#13-并发编程) 类比

---

**追问链**：`分布式锁三要素(互斥/安全/防死锁) → Redis SET NX+Lua(AP) → 主从切换丢锁 → Redisson Watchdog → ZooKeeper 临时顺序节点(CP 强一致) → Watch 前一个节点 → etcd Raft+Lease → Redis vs ZK vs etcd 选型`

---

## 7.6 分布式存储（进阶）

**一句话原理**：数据分片策略决定分布式存储的扩展性和查询效率。一致性哈希通过虚拟节点解决扩缩容的 rehash 问题。

---

#### 数据分片策略对比

| 策略 | 原理 | 优点 | 缺点 |
|:----:|------|:----:|:----:|
| **Range 分片** | 按 ID/时间连续区间划分 | 实现简单，范围查询高效 | 尾部热点（写集中在最新分区）|
| **Hash 分片（取模）** | hash(key) % N 等分数据 | 数据均匀 | 增删节点全量 rehash |
| **一致性哈希** | 哈希环 + 虚拟节点 | 增减节点仅影响相邻节点 | 实现相对复杂 |

**一致性哈希**：
```text
所有节点和 key 分布在同一个哈希环上（0 ~ 2^32-1）
key 的哈希值 → 在环上顺时针寻找第一个节点 → 数据路由到该节点
节点增减 → 只影响该节点在环上的相邻节点（迁移最少的数据）
虚拟节点 → 每个物理节点映射多个虚拟节点 → 解决节点偏斜
```

**应用场景**：
- Redis Cluster：CRC16 取模（16384 槽位哈希分片）
- Cassandra：一致性哈希 + 虚拟节点
- Ceph CRUSH：伪随机数据分布（无中心元数据）

> **关联知识点**：Hash 分片 → [Redis Cluster 16384 槽](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94redis/#63-redis-主从--哨兵--集群) / 一致性哈希 → 分布式缓存扩容

---

**追问链**：`Range 分片(尾热点) → Hash 分片(全量rehash) → 一致性哈希(哈希环+顺时针查找) → 虚拟节点(解决偏斜) → Redis Cluster CRC16 → Cassandra 虚拟节点`

---

## 7.7 RPC 与通信

**一句话原理**：RPC 的核心是"像调用本地方法一样调用远程服务"。序列化方式和传输协议是影响性能的关键因素。Dubbo（TCP + Hessian2，内部服务高频）和 gRPC（HTTP/2 + Protobuf，跨语言云原生）是主流方案。

---

#### 序列化方案对比

| 方案 | 体积 | 速度 | 跨语言 | 特点 |
|:----:|:----:|:----:|:-----:|------|
| **JSON** | 大 | 慢 | 是 | 可读性强，解析开销大 |
| **Protobuf** | 最小 | 最快 | 是 | TLSV 格式，需 .proto IDL |
| **Hessian2** | 小 | 快 | 部分 | Dubbo 默认，Java 友好 |
| **Kryo** | 小 | 极快 | 否 | Java 专用，速度最快 |

---

#### Dubbo vs gRPC 对比

| 维度 | Dubbo | gRPC |
|:----:|:-----:|:----:|
| 传输协议 | TCP 长连接（单一连接）| HTTP/2（多路复用 + 流式传输）|
| 序列化 | Hessian2 / JSON | Protobuf |
| 服务治理 | 完善（负载均衡/熔断/降级/路由）| 需第三方实现 |
| 跨语言 | 需多语言 SDK | 原生跨语言 |
| 适用场景 | Java 内部服务高频调用 | 跨语言云原生、流式通信 |

---

#### BIO → NIO → Netty 演进

| 模型 | 线程模型 | 连接数上限 | 典型代表 |
|:----:|---------|:--------:|---------|
| **BIO**（Blocking I/O）| 一个连接一个线程 | C10K | Tomcat（早期）|
| **NIO**（Non-blocking I/O）| Selector 多路复用 | 数万 | Tomcat NIO |
| **Netty**（NIO 封装）| Reactor 主从多线程 + 零拷贝 | 百万 | Dubbo、gRPC |

> **常见陷阱**：Hessian2 不适合传大包（>100KB 用 HTTP）。JSON 序列化的字符串字段会膨胀 3-5 倍（`"key"` vs 二进制 tag）。

> **关联知识点**：Netty → [核心 NIO/Netty 深度](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#15-nio-与-netty) / Dubbo 协议 → [微服务 Dubbo 深度](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94springCloud%E5%BE%AE%E6%9C%8D%E5%8A%A1/#34-dubbo-rpc-框架) / gRPC → HTTP/2 多路复用

---

**追问链**：`RPC 四组件(Client+Stub+Server+Stub) → 序列化(JSON/Protobuf/Hessian2/Kryo) → BIO 一个连接一个线程 → NIO Selector → Netty Reactor 主从多线程 → Dubbo TCP+Netty+Hessian2 → gRPC HTTP/2+Protobuf → Dubbo vs gRPC 选型`

---

## 7.8 分布式链路追踪

**一句话原理**：TraceId + SpanId + ParentSpanId 构建调用树，透传所有服务节点。OpenTelemetry（OTLP 协议）是业界统一标准。采样策略决定追踪数据的覆盖率和存储成本。

---

#### TraceID / SpanID 结构

```text
外部请求 → Gateway
  └─ TraceId = "abc123" SpanId = "A"
    ├─ 调用 Service A → SpanId = "A1", ParentSpanId = "A"
    │  └─ 调用 Service B → SpanId = "A1-1", ParentSpanId = "A1"
    └─ 调用 Service C → SpanId = "A2", ParentSpanId = "A"
```

**透传机制**：HTTP（`X-B3-TraceId`/`X-B3-SpanId` Header）、Dubbo（RpcContext）、MQ（Message Header）

---

#### OpenTelemetry 四大组件

| 组件 | 职责 |
|------|------|
| **API** | 定义 Traces/Metrics/Logs 接口 |
| **SDK** | 实现 API，包括采样、处理、导出 |
| **Collector** | 接收、处理、导出遥测数据（推送/拉取）|
| **Backends** | 存储和查询（Jaeger / Zipkin / Prometheus / Grafana）|

OTLP 协议：gRPC 4317 端口 / HTTP 4318 端口，统一 Traces/Metrics/Logs 传输。

#### 采样策略

| 策略 | 原理 | 优点 | 缺点 |
|:----:|:----:|:----:|:----:|
| **头部采样** | 请求进入时决定 | 实现简单 | 可能错过尾部异常 |
| **尾部采样** | 请求结束后根据结果 | 可捕获异常链路 | 需缓存所有请求数据 |
| **概率采样** | 固定百分比（0.1 = 10%）| 生产环境推荐 | 小流量数据不足 |

> **关联知识点**：TraceId 透传 → [核心 ThreadLocal](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#13-并发编程) / 采样策略 → [SkyWalking 采样](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94springCloud%E5%BE%AE%E6%9C%8D%E5%8A%A1/#37-链路追踪micrometer-tracing--skywalking)

---

**追问链**：`TraceId/SpanId/ParentSpanId 调用树 → HTTP Header 透传(X-B3-TraceId) → OpenTelemetry 四组件(API/SDK/Collector/Backends) → OTLP 统一协议 → 头部采样 vs 尾部采样 → 概率采样 10%`

---

## 7.9 分布式配置中心

**一句话原理**：配置中心的核心是"推" vs "拉"的模式选择。Nacos 长轮询（拉模式优化）和 Nacos 2.0 gRPC（推模式）是主流的两种实现方式。Bootstrap 上下文是 Spring Cloud 在启动时优先拉取远程配置的机制。

---

#### 推模式 vs 拉模式

| 维度 | 推模式 | 拉模式 | 长轮询（优化拉模式）|
|:----:|:-----:|:-----:|:----------------:|
| 实时性 | 高（服务端主动推送）| 低（轮询间隔）| 中（秒级）|
| 复杂度 | 高（长连接管理）| 低 | 中 |
| 压力 | 轻（服务端主动发起）| 重（大量空转轮询）| 中（挂起不超时不释放）|
| 代表 | Nacos 2.0 gRPC | 原始轮询 | Nacos 1.x |

**Nacos 长轮询流程**：
```text
客户端请求携带所有配置项 MD5
  → 服务端逐批比对（每批 3000 个配置项）
  → 有变更 → 立即返回变更 Key
  → 无变更 → 挂起请求 30 秒（非 WebSocket，HTTP 长轮询）
  → 30 秒内发生变更 → 返回
  → 30 秒无变更 → 返回空，客户端重新发起请求
```

> **关联知识点**：Bootstrap 上下文 → [Spring Cloud 配置加载](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94springCloud%E5%BE%AE%E6%9C%8D%E5%8A%A1/#39-bootstrap-上下文与配置加载) / Nacos 2.0 gRPC → [核心 Netty](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#15-nio-与-netty)

---

**追问链**：`推模式(长连接/实时/假死风险) → 拉模式(轮询/实现简单/空转) → 长轮询(挂起30s的优化) → Nacos 长轮询流程(MD5分批比对/3000一批) → Nacos 2.0 gRPC(毫秒级) → Bootstrap 上下文(启动时拉取远程配置)`

---

## 7.10 分布式系统设计思维

**一句话原理**：分布式的核心假设是"任何环节都可能失败"。Design for Failure、优雅降级、超时重试退避、幂等设计是构建可靠分布式系统的四大基石。

---

#### 八大谬误（Fallacies of Distributed Computing）

1. **网络可靠** — 网络会断、丢包、延迟抖——写代码时假设网络永远可靠会出大问题
2. **零延迟** — 同城机房也有 0.5-2ms 延迟——跨区域延迟可能在 50-200ms
3. **无限带宽** — 带宽有限，大 payload 会导致网络 IO 成为瓶颈
4. **网络安全** — 网络天然不安全——TLS、鉴权、授权是必选
5. **拓扑不变** — 服务 IP 会变、节点会扩缩容——服务发现是必须的
6. **单管理员** — 存在多个团队/系统——标准化协议和契约很重要
7. **零成本** — 跨网络通信有时间成本和硬件成本
8. **环境同质** — 不同环境（OS/网络/硬件）行为可能不同

---

#### 防护四层模型

```text
L4 — 降级：核心功能兜底、非核心关闭、降级开关（配置中心）
L3 — 熔断限流：熔断(Closed/Open/Half-Open)、限流(滑动窗口/令牌桶)、隔板(线程池隔离)
L2 — 超时重试：连接超时 vs 读取超时分设、指数退避+Jitter、重试幂等
L1 — 幂等设计：唯一键去重、状态机、Token、去重表
```

---

#### 幂等设计要点

| 方案 | 原理 | 场景 |
|:----:|:----:|:----:|
| **唯一键去重** | 每次请求携带唯一键，消费前先查是否已处理（Redis setnx/DB 唯一索引）| MQ 消费、支付回调 |
| **状态机** | 业务状态单向流转，状态不符合则拒绝 | 订单状态变更 |
| **Token 机制** | 表单提交前先申请 Token，提交时验证并删除 | 防重复提交 |
| **乐观锁** | `UPDATE SET version=version+1 WHERE id=? AND version=oldVersion` | 更新操作 |
| **去重表** | 利用数据库唯一索引，插入冲突则已处理 | 幂等性要求最高 |

#### 雪崩防护链

```text
请求 → 线程池隔离（限流并发数） → 信号量隔离（限流并发） → 熔断器（快速失败）
  → 限流（控制流量入口） → 降级（返回默认值/缓存旧值） → 启动保护
```

> **常见陷阱**：
> - 超时单一设置容易导致雪崩——连接超时（connectTimeout）和读取超时（readTimeout）必须分开
> - 重试不配退避 + Jitter 会导致惊群效应——大量重试请求瞬间打垮系统
> - 幂等设计不是万能——唯一键方案依赖中心化存储，状态机方案需确保状态枚举完整

> **关联知识点**：熔断 → [Sentinel 熔断状态机](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94springCloud%E5%BE%AE%E6%9C%8D%E5%8A%A1/#33-sentinel-限流与熔断) / 线程池隔离 → [核心 线程池](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#13-并发编程) / 降级开关 → [配置中心](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94springCloud%E5%BE%AE%E6%9C%8D%E5%8A%A1/#39-bootstrap-上下文与配置加载)

---

**追问链**：`八大谬误(网络可靠/零延迟/带宽/安全/拓扑/管理/成本/同质) → Design for Failure → 四层防护(降级→熔断限流→超时重试→幂等) → 幂等设计方案(唯一键/状态机/Token/乐观锁/去重表) → 超时退避(指数退避+Jitter 防惊群) → 雪崩防护链(线程池→信号量→熔断→限流→降级)`

---

**整体追问链（方向七）**：`CAP(C/A/P) 不三角 → PACELC 扩展 → BASE(可用/软状态/最终一致) → AP vs CP 选型 → 2PC(Prepare/Commit)三大问题 → Paxos Prepare→Promise→Accept→Accepted → Multi-Paxos Leader → Raft 三大子问题(选举/复制/安全) → Raft vs Paxos → Gossip 反熵 vs 谣言传播 → Snowflake 64bit(1+41+10+12) → 时钟回拨 → Leaf 号段双buffer → 分布式事务四种模式(XA/AT/TCC/消息表) → TCC三坑(空回滚/幂等/悬挂) → Seata AT 全局锁 → 分布式锁三要素 → Redis AP vs ZK CP → 一致性哈希 + 虚拟节点 → RPC 序列化(JSON/Protobuf/Hessian2/Kryo) → Netty Reactor → Dubbo vs gRPC → TraceId/SpanId 调用树 → OpenTelemetry 采样策略 → 推模式/拉模式/长轮询 → 八大谬误 → 幂等设计 → 雪崩四层防护 → 与微服务/Paxos/Seata/Redis 的跨层关联`
