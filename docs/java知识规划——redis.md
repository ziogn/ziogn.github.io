---
title: java知识规划——redis
created: 2026-07-23 12:10
updated: 2026-07-23 12:10
version: 0.0.1
author: ziogn
tags: [java, redis, interview, guide, java面试, research]
aliases: [Redis面试, Redis核心机制, Redisson, 缓存]
description: Redis 核心机制面试知识规划，覆盖数据结构与底层编码、持久化、主从哨兵集群、过期淘汰策略、分布式锁、缓存设计一致性、事务 Lua、高级特性、Redisson、实战场景十大模块。
---

# java知识规划——redis

> 本文档覆盖 Redis 面试知识体系，按"数据结构 → 持久化 → 集群 → 过期淘汰 → 分布式锁 → 缓存设计 → 事务 Lua → 高级特性 → Redisson → 实战场景"层层递进。每节末尾标注与 [Java 核心](java知识规划——核心.md)、[Spring Cloud 微服务](java知识规划——springCloud微服务.md) 及 [MySQL](java知识规划——mysql.md) 方向的知识关联。

---

## 6.1 核心数据结构与底层编码

**一句话原理**：Redis 有 9 种核心数据结构，每种底层由 2-3 种编码实现，根据数据特征自动切换。理解 RedisObject 和编码转换条件是区分"会用"和"懂原理"的关键。

---

#### RedisObject 头部

每个 key 的 value 在 Redis 中存储为 `redisObject`：

```text
┌──────────────────────────────────────────┐
│ redisObject 头部（16 bytes, 64-bit）       │
│ type:4bit（String/List/Set/ZSet/Hash）    │
│ encoding:4bit（int/embstr/raw/ht/...）     │
│ lru:24bit（LRU 时间戳 或 LFU 计数器）       │
│ refcount:4bytes（引用计数，共享整数对象）     │
│ ptr:8bytes（指向实际数据结构的指针）          │
└──────────────────────────────────────────┘
```

---

#### 数据结构速查表

| 外层类型 | 底层编码 | 转换条件 / 说明 |
|---------|---------|----------------|
| **String** | `int` / `embstr` / `raw` | int: 整数 ≤ 20 位；embstr: 字符串 ≤ 44 字节；raw: 其他 |
| **List** | `quicklist`（Redis 3.2+） | 每个节点是 ziplist，默认 8KB 一个节点 |
| **Hash** | `listpack`（Redis 7.0+ 替代 ziplist）| 元素 < 512 且所有值 < 64 字节用 listpack，否则用 hashtable |
| **Set** | `intset` / `hashtable` | 全整数且 < 512 个用 intset，否则用 hashtable |
| **ZSet** | `listpack` / `skiplist + hashtable` | 元素 < 128 且所有值 < 64 字节用 listpack，否则用 skiplist |
| **Bitmap** | 基于 String 位操作 | 非独立类型 |
| **HyperLogLog** | 基于 String，稀疏/稠密编码 | 标准误差 0.81% |
| **GEO** | 基于 ZSet（geohash 编码） | 非独立类型 |
| **Stream** | Rax（基数树）+ listpack | 独立数据结构 |

#### SDS（Simple Dynamic String）

String 底层使用 SDS，比 C 字符串（以 `\0` 结尾的 char[]）的优势：

| 维度 | C 字符串 | SDS |
|------|---------|-----|
| 长度获取 | O(n) 遍历 | O(1) 读取 len 字段 |
| 二进制安全 | 否（`\0` 截断）| 是（由 len 确定数据边界）|
| 空间预分配 | 无 | 预分配 + 惰性释放 |
| 扩容 | 每次 realloc | 预分配额外空间减少 realloc 次数 |

#### 跳表 vs B+Tree（面试高频）

| 对比维度 | 跳表（SkipList） | B+Tree |
|---------|----------------|--------|
| 数据结构 | 多层随机索引链表 | 多路平衡查找树 |
| 查询复杂度 | O(log n) 期望 | O(log n) 稳定 |
| 范围查询 | 指针横向遍历 | 叶子节点链表遍历 |
| 写入 | 随机层数，写放大少 | 页分裂/合并，写放大 |
| 适用场景 | 内存数据库（Redis）| 磁盘数据库（MySQL InnoDB）|

> **为什么 ZSet 用跳表不用 B+Tree**：Redis 是内存数据库，跳表的内存分配粒度更细（节点按需分配），实现简单。B+Tree 的页分裂成本和批读取优势在纯内存场景下不成立。

---

**追问链**：`RedisObject 头部(type/encoding/lru/refcount/ptr) → SDS vs C 字符串(长度获取 O(1)/二进制安全/预分配) → QuickList 结构(LinkedList+ZipList节点) → ListPack 替代 ZipList(解决连锁更新) → IntSet 升级(int16→int32→int64) → 跳表 vs B+Tree 选型原因(内存场景) → 编码转换条件(元素个数+长度)`

---

## 6.2 Redis 持久化

**一句话原理**：RDB（全量快照，fork 子进程 + Copy-on-Write 写入临时文件）和 AOF（写命令追加日志，三种刷盘策略）。Redis 4.0+ 支持混合持久化（AOF 文件头 RDB 快照 + 增量 AOF 命令）。

---

#### RDB vs AOF vs 混合持久化

| 维度 | RDB | AOF | 混合（Redis 4.0+） |
|------|-----|-----|-----------------|
| 数据内容 | 二进制快照 | 写命令文本 | RDB 快照 + 增量 AOF |
| 恢复速度 | 快（直接加载到内存）| 慢（逐条重放）| 快（加载 RDB + 重放少量 AOF）|
| 数据安全性 | 最后一次快照之后的数据丢失 | 最多丢 1 秒（everysec）| 同 AOF |
| 文件大小 | 小（二进制压缩）| 大（命令文本积累）| 较小 |
| 对主进程影响 | fork 阻塞 + COW 内存开销 | 写日志 IO 开销（可配置）| 同 RDB + AOF |

**RDB 触发方式**：
```text
SAVE         → 阻塞式，主进程生成 RDB，期间不处理任何请求（生产禁用）
BGSAVE       → fork 子进程在后台生成 RDB，主进程继续处理请求
自动 save   → redis.conf: save 900 1 / save 300 10 / save 60 10000
```

**fork COW（Copy-on-Write）**：`fork()` 时子进程共享父进程内存页表。主进程修改数据时，被修改的内存页复制一份给主进程，子进程始终持有 fork 时刻的旧数据快照。子进程将快照写入临时 RDB 文件，写入成功后 `rename` 替换旧 RDB。

**AOF 三种刷盘策略**：

| appendfsync | 行为 | 安全性 | 性能 |
|:-----------:|------|:-----:|:----:|
| `always` | 每条命令执行后 fsync 写入磁盘 | 最安全（丢 0 条）| 最慢 |
| `everysec`（默认）| 每秒一次 fsync | 最多丢 1 秒数据 | 较优 |
| `no` | 由 OS 决定刷盘时机 | 丢数据量不确定 | 最快 |

**AOF 重写（BGREWRITEAOF）**：fork 子进程将内存中的数据转化为最小命令集写入新 AOF 文件，解决命令积累导致的文件膨胀。重写期间新命令写入重写缓冲区（AOF rewrite buffer），重写完成后合并追加。

> **常见陷阱**：
> - Redis 不保证事务 ACID 中的持久性（AOF everysec 最多丢 1 秒数据）
> - `BGSAVE` 和 `BGREWRITEAOF` 不能同时执行，子进程冲突时后者被拒绝
> - fork 时间与内存大小相关（约：每 GB 需要 10-20ms），超大实例（>10GB）fork 可能阻塞数秒

> **关联知识点**：fork COW → [MySQL Buffer Pool](java知识规划——mysql.md#410-innodb-内存结构buffer-pool--redo-log--undo-log--binlog) 类似的内存快照思想 / AOF → MySQL Redo Log WAL 机制

---

**追问链**：`RDB 触发机制(SAVE/BGSAVE/自动save) → fork COW 原理(子进程共享页表) → AOF 刷盘策略(always/everysec/no) → AOF 重写 fork 子进程+重写缓冲区 → 混合持久化(RDB头+AOF增量) → 生产选型建议`

---

## 6.3 Redis 主从 / 哨兵 / 集群

**一句话原理**：主从复制（数据冗余 + 读写分离），Sentinel（自动故障转移），Cluster（数据分片 + 高可用）。三种模式逐步升级，面试中常问核心同步流程、故障转移机制和 Cluster 分片原理。

---

#### 主从同步

**全量同步**：
```text
从节点发送 PSYNC ? -1（首次连接）
  → 主节点返回 +FULLRESYNC {replid} {offset}
  → 主节点 BGSAVE 生成 RDB，同时将新命令写入 replication buffer
  → 主节点发送 RDB 到从节点
  → 从节点清空旧数据，加载 RDB
  → 主节点发送 replication buffer 中的增量命令
  → 同步完成
```

**增量同步**：
```text
从节点断线重连 → 发送 PSYNC {replid} {offset}
  → 主节点检查 offset 是否在 replication backlog 中
    → 在 backlog 内 → +CONTINUE → 发送 backlog 中缺失的命令
    → 不在 backlog 内 → +FULLRESYNC → 触发全量同步
```

**关键参数**：
- `repl-backlog-size`：默认 1MB，环形缓冲区，生产建议 128MB+（取决于断线重连间隔）
- `repl-id`：主节点唯一标识，主从切换后 replid 变化触发新全量同步

---

#### Sentinel（哨兵）

**三个角色**：监控（PING 心跳）、通知（故障告警）、自动故障转移

**故障判定流程**：
```text
PING 超时 → 主观下线（SDOWN，单个哨兵判定）
  → 多哨兵交换信息 → 半数以上哨兵 agree
    → 客观下线（ODOWN）
      → Raft 选举 leader 哨兵（协调故障转移）
        → 选新主节点（优先级 > replication offset > runid）
        → 通知其他从节点复制新主
        → 原主恢复后降为从节点
```

---

#### Cluster 集群

**数据分片**：16384 个哈希槽，`CRC16(key) & 16383` 决定 key 归属的槽，每个节点负责一段 slot 区间。

```text
Cluster 节点数 ≤ 1000（心跳包大小限制：16k slots 用 2k bitmap）
每个节点与所有其他节点保持 TCP 连接 + Gossip 协议交换信息
```

**重定向机制**：

| 状态码 | 触发场景 | 行为 |
|:------:|---------|------|
| MOVED | 槽已永久迁移到另一节点 | 客户端更新路由缓存，重定向到新节点 |
| ASK | slot 正在迁移中（临时） | 客户端发送 ASKING 命令后查询目标节点，不更新路由缓存 |

**Cluster 多 key 操作**：`{hashtag}` 强制 key 到同一槽。`MSET {user:1}:name name1 {user:1}:age 18`

> **常见陷阱**：
> - 主从复制无法自动故障转移（需要 Sentinel 或 Cluster 架构）
> - 全量同步主节点需 `BGSAVE`，fork 可能影响大实例性能
> - Cluster 模式下不支持多 key 跨槽操作（除非用 `{hashtag}` 强制同槽）
> - 16384 槽位设计原因：每节点心跳包携带 2k bits 槽位 bitmap，不超过 1 个 MTU（1500 bytes）

> **关联知识点**：Sentinel Raft → [分布式系统 Raft 协议理论底层](java知识规划——分布式系统.md) / Cluster Gossip → Gossip 去中心化协议 / 主从同步 backlog → [Kafka ISR 副本同步](java知识规划——分布式系统.md) 对比

---

**追问链**：`全量同步(PSYNC→BGSAVE→RDB→replication buffer) → 增量同步(backlog → offset) → repl-backlog-size 设置 → Sentinel SDOWN/ODOWN → Raft 选举 leader 哨兵 → 新主选举策略(优先级>offset>runid) → Cluster 16384 槽 CRC16 → MOVED(永久) vs ASK(迁移中) → {hashtag} 强制同槽 → 为什么 16384 不是 65536(心跳包大小限制)`

---

## 6.4 过期策略与内存淘汰

**一句话原理**：Redis 用两种策略删除过期 key（定期删除 + 惰性删除）。当内存超过 `maxmemory` 时，按配置的淘汰策略（8 种）回收内存。

---

#### 过期键删除策略

| 策略 | 机制 | 优点 | 缺点 |
|------|------|------|------|
| **定期删除** | 每 100ms 随机抽 20 个过期 key，若过期比例 > 25% 则继续循环 | 主动回收 | 无法保证所有过期 key 及时删除 |
| **惰性删除** | 访问 key 时检查是否过期，过期则删 | CPU 友好 | 过期 key 长时间不被访问则占用内存 |

两种策略配合使用，缺一不可。

---

#### 8 种淘汰策略（`maxmemory-policy`）

| 策略 | 范围 | 淘汰算法 | 适用场景 |
|------|:----:|---------|---------|
| `noeviction`（默认）| — | 不删除，写入返回 OOM 错误 | 数据不可丢失（如分布式锁）|
| `allkeys-lru` | 所有 key | 近似 LRU | 通用缓存 |
| `allkeys-lfu` | 所有 key | LFU | 热点模式访问 |
| `allkeys-random` | 所有 key | 随机 | 等概率访问场景 |
| `volatile-lru` | 有 TTL 的 key | 近似 LRU | TTL 已设且可淘汰 |
| `volatile-lfu` | 有 TTL 的 key | LFU | TTL 已设 + 热点 |
| `volatile-random` | 有 TTL 的 key | 随机 | TTL 已设 + 等概率 |
| `volatile-ttl` | 有 TTL 的 key | TTL 最小优先 | 优先淘汰快过期的 key |

**近似 LRU**：Redis 的 LRU 不是严格 LRU（防止链表操作的开销）。每次随机采样 `maxmemory-samples`（默认 5）个 key，淘汰其中最久未访问的。采样数越大淘汰结果越接近严格 LRU，但 CPU 开销也越大。

**LFU 计数器**：LFU 使用 `logistic counter`，高 8 位存储衰减周期（分钟级），低 8 位存储访问计数，随着时间推移自动衰减。优势：长期高频率 key 不会被一次突发冷 key 挤出。

> **常见陷阱**：`noeviction` 是默认策略，首次配置缓存场景必须改成 `allkeys-lru`，否则 Redis 会被写满报错。LFU 不适用于间歇性突发热点场景。

> **关联知识点**：近似 LRU → [MySQL Buffer Pool](java知识规划——mysql.md#410-innodb-内存结构buffer-pool--redo-log--undo-log--binlog) 变种 LRU / 淘汰策略 → [核心 ConcurrentHashMap](java知识规划——核心.md#14-集合框架) 扩容思想对比

---

**追问链**：`定期删除(每100ms抽20个+25%阈值) + 惰性删除(访问时检查) → 8 种淘汰策略 → allkeys-lru 通用缓存 → noeviction 默认陷阱 → 近似 LRU 随机采样(N=5) → LFU 计数器(8位衰减+8位计数) → maxmemory-policy 配置选择`

---

## 6.5 Redis 分布式锁

**一句话原理**：Redis 通过 `SET NX EX` 原子命令实现分布式锁。Redisson 提供功能更完善的可重入锁（RLock）和看门狗机制。RedLock 多节点锁方案在学术界和生产界存在争议。

---

#### SET NX EX 原子命令

```bash
SET lock:order:1001 "thread-1" NX EX 30
# NX：key 不存在时才设置（互斥）
# EX 30：自动过期 30 秒（防止死锁）

# 解锁 — Lua 保证原子性
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
```

**核心要点**：
- `NX + EX` 必须是一步原子命令（`SETNX` 和 `EXPIRE` 两条命令不原子）
- 解锁必须比较 value（线程标识）再删除，否则可能释放别人的锁
- 过期时间需要大于业务最大执行时间

---

#### Redisson RLock 与看门狗

| 特性 | Redisson RLock | 简单 SET NX |
|------|---------------|-------------|
| 可重入 | 是（Hash 结构，field=线程 ID，value=重入计数）| 否 |
| 自动续期 | 是（看门狗每 10 秒续期 30 秒）| 否 |
| 等待锁 | 支持 tryLock 超时等待 | 不等待，立即返回 |
| 底层存储 | Hash（大 key=锁名, field=线程 ID, value=重入次数）| 普通 String |

```java
// Redisson 使用
RLock lock = redissonClient.getLock("lock:order:" + orderId);
try {
    if (lock.tryLock(3, 30, TimeUnit.SECONDS)) {  // 等待 3s，持有 30s
        // 业务逻辑
    }
} finally {
    lock.unlock();
}
```

**看门狗原理**：`lock()` 默认 30 秒过期。Redisson 启动一个后台 Netty 时间轮任务，每 10 秒检查锁是否被持有，是则续期到 30 秒。客户端宕机后看门狗不再续期，锁自动释放。

---

#### RedLock 算法与争议

**RedLock 流程**：同时在 N/2+1（通常 3/5）个独立的 Redis 节点上加锁，过半成功才算加锁成功。

**争议点**（Martin Kleppmann 批评）：
- 时钟漂移：不同节点时间不同步导致锁提前过期
- GC 停顿：持有锁的线程 FGC 期间锁已过期，其他线程获取了锁
- RedLock 本身是 AP 系统，却想提供 CP 的强一致性

**业界评价**：多数 Java 项目不单独使用 RedLock，单主 Redis + 主从切换锁丢失是可接受的业务风险（CP 场景使用 ZK/etcd）。

#### Redis 锁 vs ZooKeeper 锁 vs etcd

| 方案 | 一致性 | 性能 | 适用场景 |
|------|:-----:|:----:|---------|
| Redis `SET NX` + Redisson | AP（最终一致）| 最高 | 可容忍短时间的锁丢失（如防重提交）|
| ZooKeeper 临时顺序节点 | CP（强一致）| 中 | 锁丢失不可接受（如主备选举）|
| etcd Raft + Lease | CP（强一致）| 中 | 云原生场景、K8s 协调 |

> **常见陷阱**：
> - 解锁时不校验线程 ID → 可能释放别人的锁
> - 过期时间设置过短 → 业务未完成锁已释放 → 其他线程同时进入
> - 主从切换 → 主 Redis 宕机锁未同步到从 → 新主上锁丢失
> - RedLock 时钟依赖 → 生产环境需保证 NTP 时间同步

> **关联知识点**：watchdog 续期 → [核心 AQS park/unpark](java知识规划——核心.md#13-并发编程) 类似的"超时-重试"设计 / RedLock 争议 → [分布式系统 CAP 三角](java知识规划——分布式系统.md) 本质是 AP vs CP 取舍

---

**追问链**：`SET NX EX 原子命令 → 解锁 Lua 脚本(不释放别人锁) → Redisson RLock(Hash 可重入) → 看门狗(每10秒续期30秒) → Netty时间轮 → RedLock N/2+1 过半加锁 → RedLock 争议(时钟漂移/GC停顿) → Redis vs ZK vs etcd(AP vs CP 取舍)`

---

## 6.6 缓存设计与一致性

**一句话原理**：缓存穿透（查不存在的数据）、缓存击穿（热点 key 过期）、缓存雪崩（大量 key 同时过期）是三种典型问题。缓存一致性的核心矛盾是 DB 和缓存的更新顺序。

---

#### 缓存三问题对比

| 问题 | 定义 | 解决方案 |
|------|------|---------|
| **缓存穿透** | 查询不存在的数据，每次绕过缓存直接查 DB | 布隆过滤器（Bloom Filter）、缓存空值 + 短 TTL |
| **缓存击穿** | 单个热点 key 过期瞬间，大量并发请求打到 DB | 互斥锁（SET NX）、逻辑过期（value 内嵌过期时间）|
| **缓存雪崩** | 大量 key 同时过期（或 Redis 宕机）导致流量打到 DB | 随机过期时间、多级缓存、限流降级、集群高可用 |

**布隆过滤器**：基于 bitmap + 多个 hash 函数的概率型数据结构：
- 判断"不存在" → 一定不存在（无漏报）
- 判断"存在" → 可能存在误判（有误报率）

```bash
# Redisson 布隆过滤器
RBloomFilter<String> filter = redissonClient.getBloomFilter("blacklist");
filter.tryInit(1000000L, 0.01);  // 预计存 100 万，误报率 1%
filter.add("user:1001");
filter.contains("user:1001");  // true
```

---

#### 缓存更新策略

| 策略 | 操作顺序 | 优点 | 缺点 |
|------|---------|------|------|
| **Cache Aside**（旁路缓存）| 先更新 DB → 再删除缓存 | 实现简单，最常用 | 删除缓存后第一次查询缓存 miss |
| **Read Through** | 缓存代理读写，由缓存负责加载数据 | 应用层无感知 | 需要缓存层支持（如 Redis 模块）|
| **Write Behind** | 先更新缓存 → 异步写入 DB | 高性能 | 可能丢数据 |

**Cache Aside 为什么是先更新 DB 再删缓存（而非先删缓存再更新 DB）**：

```text
❌ 先删缓存 → 更新 DB（线程安全问题）：
  线程 A 删缓存         → 线程 B 查缓存(miss) → 线程 B 读旧数据写缓存 → 线程 A 更新 DB
  → 缓存中一直是旧数据

✅ 先更新 DB → 再删缓存（推荐）：
  线程 A 更新 DB → 线程 A 删缓存
  → 后续查询命中新数据
  → 极小窗口：更新 DB 成功但删缓存失败（通过延迟双删 + 补偿机制解决）
```

**延迟双删**：先删缓存 → 更新 DB → sleep(几百 ms) → 再删缓存。解决主从同步延迟导致的缓存淘汰后读到从库旧数据的问题。

> **常见陷阱**：
> - Cache Aside 的"先更新 DB 再删缓存"在删缓存失败时仍有不一致风险（解决方案：binlog 订阅 + 消息队列补偿）
> - 缓存穿透的布隆过滤器无法删除已存在元素的记录（可考虑计数布隆过滤器或布谷鸟过滤器）
> - 击穿的互斥锁方案中，获得锁的线程查询 DB 后必须双检（DCL 思想），防止并发查两次 DB

> **关联知识点**：布隆过滤器 → [核心 BitMap](java知识规划——核心.md#14-集合框架) 位运算 / DCL 双检 → [核心 DCL 单例](java知识规划——核心.md#16-设计模式) / 缓存一致性 → MySQL 更新与缓存删除的事务原子性

---

**追问链**：`缓存穿透(不存在的数据) → 布隆过滤器(多个hash+bitmap) → 缓存击穿(热点key过期) → 互斥锁双检 → 缓存雪崩(大量key同时过期) → 随机过期时间 → Cache Aside(先更新DB再删缓存) → 为什么不是先删缓存再更新DB(并发写旧数据) → 延迟双删 → 3种缓存更新策略对比`

---

## 6.7 Redis 事务与 Lua

**一句话原理**：Redis 事务（MULTI/EXEC）批量入队、一次性执行，但不支持回滚。Lua 脚本提供真正的原子性执行。Redis 7 Functions 进一步将 Lua 脚本持久化到 RDB/AOF。

---

#### 事务（MULTI/EXEC/DISCARD/WATCH）

```bash
MULTI               # 开启事务，后续命令入队
SET key1 value1
SET key2 value2
EXEC                # 一次性执行队列中的所有命令
```

**核心特性**：

| 维度 | Redis 事务 | 关系型数据库事务 |
|------|-----------|----------------|
| 执行方式 | 命令入队后一次性执行 | 逐条执行 |
| 原子性 | 不保证（运行时错误不影响其他）| 保证（全部成功或回滚）|
| 回滚 | 不支持（语法错误不执行，运行时错误不停止）| 支持 |
| 隔离性 | 单线程，天然隔离 | MVCC 保证 |
| 持久性 | 不保证（由 AOF 配置决定）| Redo Log 保证 |

**WATCH 乐观锁**：

```bash
WATCH stock:1001       # 监视 key
val = GET stock:1001   # 读取当前值
MULTI
SET stock:1001 $newval
EXEC                   # 如果 stock:1001 在 WATCH 后被修改 → 事务失败
```

> **常见陷阱**：Redis 事务的执行时错误不会回滚（如 `LPUSH key` 对 String 类型操作，该命令失败但其他命令正常执行）。

---

#### Lua 脚本

**为什么 Lua 能保证原子性**：Redis 单线程模型，Lua 脚本执行期间不会被其他命令打断。脚本中的所有命令要么全部执行，要么全部不执行。

```bash
EVAL "redis.call('SET', KEYS[1], ARGV[1]); redis.call('INCR', KEYS[2]); return redis.call('GET', KEYS[1])" 2 key1 key2 value1

# 缓存脚本（避免每次传递脚本体）
SCRIPT LOAD "return redis.call('SET', KEYS[1], ARGV[1])"
# → "6b1bf486c..."（SHA1 哈希）
EVALSHA "6b1bf486c..." 1 mykey myvalue
```

**Redis 7 Functions**：将 Lua 脚本以函数形式注册到 Redis 中，与数据一起持久化到 RDB/AOF，在复制和集群模式下自动同步，解决 EVAL 脚本在重启后需重新加载的问题：

```bash
FUNCTION LOAD "#!lua name=mylib\n redis.register_function('myfunc', function(keys, args) return redis.call('SET', keys[1], args[1]) end)"
FCALL myfunc 1 mykey myvalue
```

> **常见陷阱**：Lua 脚本应轻量快速，不要执行耗时操作或无限循环，否则会阻塞整个 Redis 无法处理任何其他命令。脚本内应避免使用随机函数导致主从数据不一致。

> **关联知识点**：Lua 原子性 → [核心 AQS park/unpark](java知识规划——核心.md#13-并发编程) 的原子语义 / Functions 持久化 → RDB/AOF 持久化、复制机制

---

**追问链**：`MULTI/EXEC 入队一次性执行 → 不支持回滚(运行时错误不停止) → WATCH 乐观锁(CAS 检查) → Lua 脚本原子性(单线程+不打断) → EVALSHA 缓存脚本 → Redis 7 Functions(持久化+复制) → 耗时脚本阻塞风险`

---

## 6.8 高级特性

**一句话原理**：Pipeline（批量命令减 RTT）、Pub/Sub（广播消息不持久化）、Stream（可靠消息队列，消费者组 + ACK）、Redis 7 核心新特性。

---

#### Pipeline vs 事务对比

| 特性 | Pipeline | 事务（MULTI/EXEC）|
|------|:-------:|:-----------------:|
| 原子性 | 否（中间结果可读）| 是（但不保证回滚）|
| 减少 RTT | 是（批量发送）| 是（入队+EXEC 两次 RTT）|
| 其他连接可读中间结果 | 否（本地缓存）| 是（命令在服务器排队）|

#### Stream 消息队列

| 特性 | List（BLPOP） | Pub/Sub | Stream |
|------|:------------:|:-------:|:------:|
| 持久化 | 是（数据在内存）| 否（离线丢失）| 是 |
| ACK 机制 | 无 | 无 | 有（XACK）|
| 消费者组 | 无 | 无 | 支持（XGROUP）|
| 消息回溯 | 无 | 无 | 支持 |

**Stream 核心概念**：
- **消费者组**（XGROUP）：组内消费者负载均衡消费，一条消息只能被组内一个消费者消费
- **last_delivered_id**：记录组内已交付的最后消息 ID
- **PEL（Pending Entries List）**：已交付但未 ACK 的消息列表，消费端宕机后可以从 PEL 恢复
- **XACK**：消费完成后手动确认，从 PEL 移除

```bash
XADD mystream * field1 value1 field2 value2        # 添加消息，* 表示自动生成消息 ID (timestamp-seq)
XGROUP CREATE mystream mygroup $                    # 创建消费者组，$ 表示从最新消息开始
XREADGROUP GROUP mygroup consumer1 COUNT 10 BLOCK 5000 STREAMS mystream >  # > 表示只消费未交付消息
XACK mystream mygroup 1700000000000-0              # 确认消息已处理
```

#### Redis 7 核心新特性

| 特性 | 说明 |
|------|------|
| Multi-Part AOF | AOF 文件拆分为多个 Base + Incremental 文件，减少重写开销 |
| ListPack 全面替代 ZipList | 解决连锁更新问题，降低编码复杂度 |
| Redis Functions | Lua 脚本持久化，替代 EVAL |
| Sharded Pub/Sub | 跨槽位 Pub/Sub 消息广播 |
| ACL V2 | 更细粒度的权限控制 |
| 新命令 | ZMPOP / LMPOP / ZINTERCARD / HRANDFIELD 等 |

> **关联知识点**：Stream 消费者组 → [RocketMQ 消费组/重试](java知识规划——springCloud微服务.md#36-rocketmq-消息中间件) 对比 / Pub/Sub → 观察者模式

---

**追问链**：`Pipeline 批量减 RTT(非原子) → Pub/Sub 广播(不持久化) → Stream 消息队列(XADD/XREAD)→ 消费者组(last_delivered_id+PEL+XACK)→ Redis 7 Multi-Part AOF → Sharded Pub/Sub → Functions → listpack 全面替代`

---

## 6.9 Redisson 深度（与 be-star 项目关联）

**一句话原理**：Redisson 在 Redis 之上实现了 Java 生态的分布式数据结构和服务框架，核心包括分布式锁、分布式集合、分布式限流器、Spring Cache 整合等。

---

#### Redisson 分布式锁家族

| 锁类型 | 方法名 | 特点 |
|--------|-------|------|
| 可重入锁 | `RLock` | 同一线程可重入，看门狗自动续期 |
| 读写锁 | `RReadWriteLock` | 读读不互斥、读写互斥、写写互斥 |
| 公平锁 | `RFairLock` | FIFO 顺序排队 |
| 联锁 | `RMultiLock` | 多个锁同时加锁 |
| 红锁 | `RRedLock` | RedLock 实现（已标记废弃）|

```java
// RLock 核心用法（可重入、看门狗自动续期）
RLock lock = redissonClient.getLock("lock:order:" + orderId);

// tryLock 两个超时：等待时间（waitTime）和持有时间（leaseTime）
// leaseTime 不传则看门狗自动续期（默认 30s）
if (lock.tryLock(5, TimeUnit.SECONDS)) {
    try {
        // 业务逻辑
    } finally {
        lock.unlock();
    }
}
```

**看门狗失效场景**：未显式设置 `leaseTime` 时，默认调用 `lock()` 或 `tryLock()` 启动看门狗，每 10 秒续期到 30 秒。设置 `leaseTime` 后不启动看门狗。

---

#### 分布式限流器

`RRateLimiter` 基于**令牌桶算法**实现：

```java
RRateLimiter limiter = redissonClient.getRateLimiter("rate:api:query");
// 速率：每 1 秒放 5 个令牌
limiter.trySetRate(RateType.OVERALL, 5, 1, RateIntervalUnit.SECONDS);

// 尝试获取 1 个令牌，阻塞等待
limiter.acquire(1);

// 尝试获取 1 个令牌，不等待
if (limiter.tryAcquire(1)) {
    // 执行业务
}
```

---

#### 分布式信号量与倒计时

| 组件 | 类比 JUC | 方法 |
|------|---------|------|
| `RSemaphore` | Semaphore | acquire/release |
| `RCountDownLatch` | CountDownLatch | await/countDown |
| `RBlockingQueue` | BlockingQueue | put/take |

---

#### Redisson 分布式集合

| 集合 | 接口 | 特点 |
|------|------|------|
| `RMap` | java.util.Map | 分布式 Map，可配置本地缓存（RMapCache）|
| `RSet` | java.util.Set | 分布式 Set |
| `RList` | java.util.List | 分布式 List |
| `RQueue` | java.util.Queue | 分布式队列（支持延迟队列 RDelayedQueue）|

#### Redisson Spring Cache 整合

```java
@Configuration
@EnableCaching
public class RedissonCacheConfig {
    @Bean
    public CacheManager cacheManager(RedissonClient redissonClient) {
        return new RedissonSpringCacheManager(redissonClient, "classpath:cache-config.yml");
    }
}

// 使用时与 @Cacheable 完全一致
@Cacheable(value = "users", key = "#userId")
public User getUser(Long userId) {
    return userMapper.selectById(userId);
}
```

> **常见陷阱**：
> - Redisson 的 RRateLimiter 基于 Redis 单节点，分布式场景下需考虑网络延迟对令牌桶的影响
> - RLock 看门狗只对未设置 leaseTime 的 `lock()/tryLock()` 生效，显式设置 leaseTime 不启动看门狗
> - RMapCache 本地缓存需要配置同步策略（RMapCache 使用 Redis 过期消息通知）

> **关联知识点**：RLock → [核心 AQS](java知识规划——核心.md#13-并发编程) 的可重入设计 / RRateLimiter → [Sentinel 限流](java知识规划——springCloud微服务.md#33-sentinel-限流与熔断) / Spring Cache 整合 → [Spring Boot Cache AutoConfig](java知识规划——spring.md#23-spring-boot-核心机制)

---

**追问链**：`Redisson 锁家族(RLock/RReadWriteLock/RFairLock/RMultiLock) → RLock 可重入(Hash+线程ID计数) → 看门狗(10s续期30s, Netty时间轮) → RRateLimiter 令牌桶 → RSemaphore/RCountDownLatch → 分布式集合(RMap/RSet/RList) → Spring Cache 整合(@Cacheable 底层 Redisson) → be-star 项目实践`

---

## 6.10 Redis 实战场景

**一句话原理**：Redis 的数据结构直接对应常见业务问题——ZSet（排行榜）、Bitmap（签到统计）、HyperLogLog（UV 去重）、GEO（附近的人）、滑动窗口（限流）。

---

#### 常见场景速查

| 场景 | 数据结构 | 核心命令 | 关键注意 |
|------|---------|---------|---------|
| 排行榜 | ZSet | ZADD / ZREVRANGE / ZINCRBY | ZREVRANGE WITHSCORES Top N |
| 计数器 | String | INCR / DECR | 原子操作，防超卖 ||
| Session 共享 | String / Hash | SETEX / HSET | 设置合理过期时间 |
| 分布式锁 | String / Hash（Redisson）| SET NX / RLock | 解锁 Lua 校验线程 ID |
| 限流（滑动窗口）| ZSet | ZREMRANGEBYSCORE / ZCARD | 时间戳作为 score |
| UV 统计 | HyperLogLog | PFADD / PFCOUNT | 误差 0.81% |
| 签到 | Bitmap | SETBIT / BITFIELD / BITCOUNT | BITFIELD 支持子命令批量操作 |
| 附近的人 | GEO | GEOADD / GEORADIUS | 底层 ZSet + geohash |
| 消息队列 | Stream | XADD / XREADGROUP / XACK | 消费者组 + PEL 保证不丢 |
| 布隆过滤器 | Redisson BF | RBloomFilter（tryInit/trySet/contains）| 不可删除 |

#### 滑动窗口限流（ZSet 实现）

```java
public boolean allowAction(String userId, String action, int maxCount, int windowSeconds) {
    String key = "rate:" + action + ":" + userId;
    long now = System.currentTimeMillis();
    long windowStart = now - windowSeconds * 1000L;

    // 原子执行 Lua 脚本
    // 1. 删除窗口外的记录
    // 2. 统计窗口内记录数
    // 3. 未超限则添加当前记录
    String lua = """
        redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
        local count = redis.call('ZCARD', KEYS[1])
        if count < tonumber(ARGV[2]) then
            redis.call('ZADD', KEYS[1], ARGV[3], ARGV[4])
            redis.call('EXPIRE', KEYS[1], ARGV[5])
            return 1
        end
        return 0
    """;
    return redisTemplate.execute(
        new DefaultRedisScript<>(lua, Long.class),
        List.of(key),
        String.valueOf(windowStart), String.valueOf(maxCount),
        String.valueOf(now), String.valueOf(now), String.valueOf(windowSeconds)
    ) == 1;
}
```

> **常见陷阱**：ZSet 限流在百万级用户场景下内存占用大（每个请求存一条 ZSet 记录），建议配合 Redis 过期时间自动清理。大规模 UV 统计用 HyperLogLog，精确去重用 Bitmap。

> **关联知识点**：GEO → ZSet 底层 / Stream → [RocketMQ](java知识规划——springCloud微服务.md#36-rocketmq-消息中间件) 消息队列对比 / 布隆过滤器 → Guava BloomFilter

---

**追问链**：`ZSet 排行榜(ZREVRANGE) → String 计数器(INCR 原子) → HyperLogLog UV(PFADD/PFCOUNT 0.81%) → Bitmap 签到(BITFIELD 连续签到) → GEO 附近的人(GEOADD/GEORADIUS) → ZSet 滑动窗口限流(Lua 原子) → 实战选型(按数据结构定场景)`

---

**整体追问链（方向六）**：`RedisObject 头部(type/encoding/lru/refcount/ptr) → SDS vs C 字符串 → 跳表 vs B+Tree(内存场景) → ListPack 替代 ZipList → RDB fork COW → AOF everysec 刷盘 → 混合持久化 → 全量同步 RDB+replication buffer → 增量同步 backlog → Sentinel SDOWN/ODOWN → Cluster 16384 槽 CRC16 → MOVED vs ASK → 定期删除+惰性删除 → 8 种淘汰策略 → 近似 LRU 随机采样 → LFU 衰减 → SET NX EX 原子命令 → Redisson RLock 可重入 → 看门狗 10s/30s → RedLock 争议(AP vs CP) → 缓存穿透(布隆过滤器) → 击穿(互斥锁双检) → 雪崩(随机过期时间) → Cache Aside(先DB后Cache) → MULTI/EXEC 事务无回滚 → WATCH 乐观锁 → Lua 脚本原子性 → Redis 7 Functions → Pipeline 减 RTT → Stream 消费者组 PEL+XACK → Redisson 锁家族 → RRateLimiter 令牌桶 → Spring Cache 整合 → ZSet 排行榜/ZSet 限流/Stream 队列 → 关联 Java 核心及 Spring Cloud 微服务方向`
