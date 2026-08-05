---
title: java知识规划——mysql
created: 2026-07-11 15:00
updated: 2026-07-23 11:30
version: 0.1.0
author: ziogn
tags: [java, mysql, interview, guide, java面试, research]
aliases: [MySQL面试, MySQL核心机制, InnoDB, SQL优化]
description: MySQL 核心机制面试知识规划，覆盖 B+Tree 索引、索引优化、EXPLAIN 执行计划、事务 ACID、MVCC、InnoDB 锁机制、SQL 优化策略、分库分表、主从复制、InnoDB 内存结构十大模块。
---

# java知识规划——mysql

> 本文档覆盖面试权重 15% 的 MySQL 知识体系。按"索引 → 优化 → 执行计划 → 事务 → MVCC → 锁 → SQL 优化 → 分库分表 → 主从复制 → InnoDB 内存结构"递进。每节末尾标注与 [Spring 生态](java知识规划——spring.md) 及 [MyBatis](java知识规划——mybatis.md) 方向的知识关联。

---

## 4.1 B+Tree 数据结构 / 聚簇 vs 二级索引 / 最左前缀

**一句话原理**：B+Tree 非叶子节点只存索引键（不存数据），叶子节点存完整行数据（聚簇）或主键值（二级）且叶子节点间有双向链表；聚簇索引物理存储顺序=索引顺序，一张表一个；二级索引叶子存主键值需回表。

---

#### B+Tree 三层结构

```text
根节点（存放索引键的指针范围）
  ↓
内部节点（存放下一层节点的指针范围）
  ↓
叶子节点（存放完整数据或主键值，双向链表连接）
```

**B+Tree vs B-Tree 核心区别**：

| 维度 | B+Tree | B-Tree |
|------|--------|--------|
| 数据存储 | 只有叶子节点存数据 | 所有节点都存数据 |
| 叶子节点连接 | 有双向链表，支持范围扫描 | 无链表，范围查询需中序遍历 |
| I/O 次数 | 固定（等于树高，通常 3-4 层）| 不固定 |
| 范围查询 | 高效（叶子链表遍历）| 低效（反复回溯）|

**聚簇索引 vs 二级索引**：

| 对比 | 聚簇索引 | 二级索引（辅助索引）|
|------|---------|-----------------|
| 叶子节点 | 存储完整行数据 | 存储主键值 |
| 每表数量 | 1 个（主键）| 多个 |
| 回表 | 不需要 | 需要 |
| 物理顺序 | 与索引顺序一致 | 无关 |

**最左前缀原则**：`CREATE INDEX idx_a_b_c ON t(a, b, c)` 实际建立的索引为 `(a)`、`(a, b)`、`(a, b, c)`。`WHERE b=2` 或 `WHERE a=1 AND c=3` 均无法完全命中索引。

> **常见陷阱**：InnoDB 没有主键会选第一个 NOT NULL UNIQUE 列作为聚簇索引，都没有则自动生成 6 字节 rowid。回表是性能杀手，覆盖索引可解决。

> **关联知识点**：数据结构 → [核心 HashMap 红黑树](java知识规划——核心.md#14-集合框架) / 回表 → 4.2 覆盖索引

---

**追问链**：`B+Tree 结构 → 非叶子节点只存键 → 叶子双向链表 → 相比 B-Tree 优势 → 聚簇索引组织表 → 二级索引回表 → 联合索引最左前缀 → 失效场景 → 字段顺序建议`

---

## 4.2 索引优化（覆盖索引 / 索引下推 ICP / MRR）

**一句话原理**：覆盖索引（查询字段全在索引中，Extra=Using index 免回表）；索引下推 ICP（MySQL 5.6+，WHERE 条件下推到引擎层过滤减少回表）；MRR（随机 I/O 变顺序 I/O，收集主键 ID→排序→回表）。

---

| 优化 | 原理 | Extra 信号 | 版本要求 |
|------|------|-----------|---------|
| 覆盖索引 | 索引包含所有查询字段，无需回表 | `Using index` | 始终支持 |
| ICP | WHERE 条件下推到存储引擎过滤 | `Using index condition` | MySQL 5.6+ |
| MRR | 按主键排序后回表（随机 I/O→顺序 I/O）| `Using MRR` | MySQL 5.6+ |

**覆盖索引示例**：

```sql
-- idx_name_age(name, age)
-- 需要查询的字段（name, age）全在索引中 → 覆盖索引，避免回表
SELECT name, age FROM user WHERE name = '张三';
-- EXPLAIN Extra: Using index

-- SELECT * 无法利用覆盖索引
SELECT * FROM user WHERE name = '张三';
-- 需要回表查询所有列
```

> **常见陷阱**：覆盖索引需要索引包含所有 SELECT 字段（注意 `SELECT *` 破坏覆盖索引）；ICP 在二级索引上生效，聚簇索引不需要；索引失效场景（函数包裹、隐式类型转换、LIKE 前导 %）。

---

**追问链**：`覆盖索引原理 → 避免回表 → EXPLAIN Using index → ICP 下推 → 联合索引尾字段范围条件效果 → MRR 排序回表 → 三种优化对比`

---

## 4.3 EXPLAIN 执行计划解读

**一句话原理**：`EXPLAIN SELECT` 返回 type（扫描方式，const→eq_ref→ref→range→index→ALL 性能递减）、key（实际索引）、key_len（索引使用长度）、rows（估计扫描行数）、Extra（附加信息）。

---

#### type 分级（性能从高到低）

```text
system → const → eq_ref → ref → range → index → ALL
```

| type | 含义 | 典型场景 |
|------|------|---------|
| const | 主键/唯一索引等值查询 | `WHERE id = 1` |
| eq_ref | JOIN 关联的主键/唯一索引 | `JOIN ... ON a.id = b.id` |
| ref | 普通索引等值查询 | `WHERE name = '张三'` |
| range | 索引范围查询 | `WHERE age > 18` |
| index | 全索引扫描（比全表略好）| `SELECT age FROM user`（覆盖索引）|
| ALL | 全表扫描 | 无索引的查询或索引失效 |

**Extra 信号解读**：

| Extra | 含义 | 评估 |
|-------|------|:----:|
| `Using index` | 覆盖索引，无需回表 | 好 |
| `Using index condition` | 索引下推（ICP）| 较好 |
| `Using where` | Server 层过滤 | 中性 |
| `Using filesort` | 需要额外排序 | 坏 |
| `Using temporary` | 使用临时表 | 坏 |

> **常见陷阱**：`possible_keys` 有值但 `key=NULL` 说明有索引但优化器决定不用（通常因为数据量小或索引选择性差）。

---

**追问链**：`EXPLAIN 输出解读 → type 扫描方式排序 → key/key_len 判定 → rows 估算偏差 → Extra 信号分类 → Using filesort 优化 → 与慢查询分析结合`

---

## 4.4 事务 ACID 与隔离级别

**一句话原理**：ACID 由 Undo Log（原子性）+ MVCC + 锁（隔离性）+ Redo Log WAL（持久性）共同保证。四种隔离级别递进解决脏读→不可重复读→幻读。

---

| 级别 | 脏读 | 不可重复读 | 幻读 |
|------|:---:|:---------:|:---:|
| READ UNCOMMITTED | 可能 | 可能 | 可能 |
| READ COMMITTED（RC） | 不可能 | 可能 | 可能 |
| REPEATABLE READ（RR，MySQL 默认）| 不可能 | 不可能 | InnoDB 间隙锁避免 |
| SERIALIZABLE | 不可能 | 不可能 | 不可能 |

**ACID 四特性对应的底层机制**：
- **原子性（A）**：Undo Log，事务回滚时通过 Undo Log 还原数据
- **一致性（C）**：最核心目标，通过 A+I+D 共同保证
- **隔离性（I）**：MVCC + 锁机制
- **持久性（D）**：Redo Log WAL 机制

> **常见陷阱**：RR 级别下当前读（SELECT FOR UPDATE）仍可能幻读（由 Gap Lock 解决）；RC 性能一般优于 RR（锁竞争更少）。

> **关联知识点**：@Transactional 隔离级别 → [Spring 事务管理](java知识规划——spring.md#25-spring-事务管理) / MVCC → 4.5

---

**追问链**：`ACID 四特性 → Undo Log 原子性 → Redo Log 持久性 → MVCC 隔离性 → 四种隔离级别定义 → 三类并发问题 → MySQL RR 默认原因 → RC vs RR 性能对比 → 与 @Transactional 关系`

---

## 4.5 MVCC 实现原理（Undo Log + ReadView）

**一句话原理**：MVCC 实现非阻塞快照读。Undo Log 版本链（DB_TRX_ID + DB_ROLL_PTR 隐藏列）；ReadView（m_ids/min_trx_id/max_trx_id/creator_trx_id）判定可见性。RC 每次 SELECT 新建 ReadView，RR 第一次 SELECT 生成复用。

---

#### ReadView 可见性判定

```text
遍历 Undo Log 版本链，对每个版本的事务 trx_id：
  ├── trx_id == creator_trx_id → 可见（自己修改的版本）
  ├── trx_id < min_trx_id → 可见（已提交的旧事务）
  ├── trx_id >= max_trx_id → 不可见（未来事务）
  └── trx_id 在 m_ids 中 → 不可见（活跃事务）
        不在 m_ids 中 → 可见（已提交）
```

**RC vs RR 差异**：

| 维度 | RC | RR |
|------|----|----|
| ReadView 生成 | 每次 SELECT 都新建 | 第一次 SELECT 生成，后续复用 |
| 不可重复读 | 可能 | 否 |
| 快照读实现 | 每次读最新已提交版本 | 读事务启动时的快照版本 |

**快照读 vs 当前读**：
- **快照读**：普通 SELECT，不加锁，走 MVCC 版本链
- **当前读**：`SELECT ... FOR UPDATE` / `UPDATE` / `DELETE`，走行锁 + Next-Key Lock

> **关联知识点**：锁机制 → 4.6 / 事务隔离级别 → 4.4 / 乐观并发控制 → [核心 CAS](java知识规划——核心.md#13-并发编程)

---

**追问链**：`MVCC 解决的问题 → Undo Log 版本链 → DB_TRX_ID/DB_ROLL_PTR → ReadView 四字段 → 可见性判定算法 → RC vs RR ReadView 生成时机 → 快照读 vs 当前读 → 与 @Transactional 底层实现关联`

---

## 4.6 InnoDB 锁机制（行锁 / Gap Lock / Next-Key Lock）

**一句话原理**：InnoDB 锁加在索引上。Record Lock 锁定索引记录；Gap Lock 锁定记录间间隙（RR 级别防止幻读）；Next-Key Lock = Record Lock + Gap Lock（左开右闭）。唯一索引等值查询退化为 Record Lock。

---

#### 锁分类

```text
按粒度：行锁 | 表锁 | 意向锁(IS/IX)
按模式：共享锁(S) | 排他锁(X)
按算法：Record Lock | Gap Lock | Next-Key Lock
```

**锁退化规则**：

| 查询类型 | 锁类型 |
|---------|-------|
| 唯一索引等值查询命中记录 | Record Lock（退化为行锁）|
| 唯一索引等值查询未命中 | Gap Lock（锁定不存在记录所在的间隙）|
| 普通索引范围查询 | Next-Key Lock（行锁 + 间隙锁）|
| 无索引条件 | 全表行锁（实际为表锁）|

**死锁检测**：InnoDB 通过 **wait-for graph** 检测死锁，回滚代价较小的事务。

> **常见陷阱**：没有索引的行操作 → 行锁退化为表锁（全表扫描）；Gap Lock 只在 RR 级别生效。

> **关联知识点**：MVCC → 4.5 / 隔离级别 → 4.4 / AQS → [核心 并发编程](java知识规划——核心.md#13-并发编程)

---

**追问链**：`InnoDB 锁分类 → Record Lock → Gap Lock(RR 生效) → Next-Key Lock → 锁退化规则 → 唯一索引等值 → 死锁 wait-for graph → 与 AQS Condition 类比`

---

## 4.7 SQL 优化策略

**一句话原理**：慢查询定位 → EXPLAIN 分析 → 索引优化 → SQL 改写。深分页用游标分页（`WHERE id > last_id LIMIT 20`）替代 `LIMIT 100000, 20`。

---

```text
1. 慢查询日志：SET long_query_time = 2; 分析 mysqldumpslow / pt-query-digest
2. EXPLAIN 分析：type/key/rows/Extra 定位问题
3. 索引设计：频繁 WHERE/ORDER BY/JOIN 列、区分度低的列不建索引、长字符串前缀索引
4. SQL 改写：避免 SELECT *、JOIN 小表驱动大表、避免函数、避免隐式转换、LIKE 非前缀 %
5. 深分页优化：游标分页 WHERE id > last_id LIMIT 20
```

> **常见陷阱**：隐式类型转换（`WHERE int_col = '123'`）导致索引失效；OR 条件两端必须都有索引否则失效；深分页 `LIMIT 1000000, 20` 虽然返回 20 条但需要扫描前 100 万行。

> **关联知识点**：EXPLAIN → 4.3 / 索引 → 4.1 / 深分页 → [MyBatis 分页](java知识规划——mybatis.md#38-分页实现原理rowbounds--pagehelper)

---

**追问链**：`慢查询定位 → long_query_time → EXPLAIN 分析 → 索引优化三原则 → SQL 改写五避免 → 深分页游标优化 → JOIN 小表驱动大表 → 与 PageHelper 分页优化关联`

---

## 4.8 分库分表（ShardingSphere 原理）

**一句话原理**：分库分表策略（垂直分库/垂直分表/水平分库/水平分表）。ShardingSphere 核心流程：SQL 解析 → SQL 路由 → SQL 改写 → SQL 执行 → 结果归并。

---

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| 垂直分库 | 按业务模块拆分到不同数据库 | 模块间耦合低 |
| 垂直分表 | 大表拆为"宽表+明细表"（冷热分离）| 大字段影响性能 |
| 水平分库 | 同一张表数据分散到多个数据库实例 | 写压力大 |
| 水平分表 | 同一张表数据分散到多个表 | 单表数据量巨大 |

**ShardingSphere 五流程**：`SQL 解析(AST) → SQL 路由(分片键) → SQL 改写(表名) → SQL 执行(并行) → 结果归并(排序/聚合)`

> **常见陷阱**：分片键选择不当导致查询路由到全部分片；分布式事务需要 Seata/XA 方案。

> **关联知识点**：分布式事务 → [Spring Cloud](java知识规划——spring.md#28-spring-cloud-微服务) / 雪花算法 → [核心 并发编程](java知识规划——核心.md#13-并发编程)

---

**追问链**：`分库分表策略(垂直/水平) → ShardingSphere 五流程 → 解析→路由→改写→执行→归并 → 分片算法(取模/范围/复合) → 分布式 ID 雪花算法 → 跨库事务 → 与 Spring Cloud 关联`

---

## 4.9 主从复制（Binlog）

**一句话原理**：主库事务提交写 Binlog → Binlog Dump Thread 发送 → 从库 I/O Thread 写入 Relay Log → SQL Thread 重放。

---

| 格式 | 记录内容 | 日志量 | 一致性 |
|------|---------|-------|-------|
| STATEMENT | SQL 语句 | 小 | 非确定性函数导致不一致 |
| ROW（默认）| 行数据前后镜像 | 大 | 绝对一致 |
| MIXED | 自动选择 | 中 | 折中 |

**复制模式**：异步（默认）→ 半同步（至少一个从库写 Relay Log）→ 全同步（全部执行完）。

> **常见陷阱**：半同步复制性能下降（等待从库写 Relay Log）；大事务导致主从延迟。

> **关联知识点**：读写分离 → 4.8 ShardingSphere / Binlog → 4.10 两阶段提交

---

**追问链**：`主从复制三线程 → Binlog Dump → I/O Thread → SQL Thread → STATEMENT/ROW/MIXED → 异步/半同步/全同步 → 主从延迟 → 与 ShardingSphere 读写分离关联`

---

## 4.10 InnoDB 内存结构（Buffer Pool / Redo Log / Undo Log / Binlog）

**一句话原理**：Buffer Pool（16KB 页缓存 + 变种 LRU 防扫描污染）保证数据缓存；Redo Log（WAL 机制，顺序 I/O 提升写性能）保证持久性；Undo Log 保证原子性和 MVCC 版本链；Binlog（Server 层）用于复制和恢复。Redo Log 和 Binlog 通过两阶段提交保持一致性。

---

| 组件 | 层次 | 作用 |
|------|------|------|
| Buffer Pool | InnoDB | 缓存数据页和索引页，变种 LRU 淘汰 |
| Redo Log | InnoDB | WAL 循环写，持久性 D |
| Undo Log | InnoDB | 回滚 + MVCC 版本链 |
| Binlog | Server | 逻辑日志，复制+恢复 |

**一条 UPDATE 完整日志流程**：

```sql
UPDATE user SET name='new' WHERE id=1
  → Buffer Pool 查找/加载页
  → 写入 Undo Log（旧值）
  → 修改 Buffer Pool 数据页（标记脏页）
  → 写入 Redo Log Buffer
  → 事务提交：Redo Log fsync → Binlog fsync（两阶段提交）
  → 后台 Checkpoint 刷脏页
```

**两阶段提交**：Prepare（Redo Log）→ Binlog → Commit（Redo Log commit 标记），崩溃恢复时对比两者状态决定事务提交还是回滚。

**Buffer Pool LRU 变种**：普通 LRU 在批量全表扫描时会把热点数据全部挤出。InnoDB 变种 LRU 将链表分为 Old 区（尾部 3/8）和 New 区（头部 5/8），新读取的页先插入 Old 区头部，只有再次访问才移到 New 区。

> **常见陷阱**：Redo Log 循环写不能用于数据恢复（Binlog 用于恢复）；两阶段提交不是分布式事务的 XA，是 MySQL 内部一致性协议。

> **关联知识点**：MVCC 版本链 → 4.5 / Redo Log → 4.4 持久性 / Binlog → 4.9 / [MyBatis 缓存对比](java知识规划——mybatis.md#34-一级缓存和二级缓存机制及问题)

---

**追问链**：`Buffer Pool LRU 变种 → 16KB 页 → Checkpoint 刷脏 → Redo Log WAL → 顺序 I/O vs 随机 I/O → Undo Log 版本链(4.5) → Binlog 三种格式(4.9) → 两阶段提交 → 崩溃恢复 → UPDATE 完整日志流程 → 与 MyBatis 缓存对比`

---

**整体追问链（方向四）**：`B+Tree 三层结构 → 聚簇 vs 二级索引 → 最左前缀失效 → 覆盖索引 Using index → ICP 下推 → MRR 顺序 I/O → EXPLAIN type/key_len/Extra → ACID 四特性底层机制 → 四种隔离级别 → 三类并发问题 → MVCC Undo Log 版本链 → ReadView 可见性判定 → RC vs RR ReadView 差异 → 快照读 vs 当前读 → Record Lock/Gap Lock/Next-Key Lock → 锁退化规则 → 慢查询定位 → SQL 改写 → 深分页游标 → 分库分表 ShardingSphere → 主从复制 Binlog 三格式 → Buffer Pool LRU 变种 → Redo Log WAL → 两阶段提交 → 窗口函数 ROW_NUMBER/RANK/DENSE_RANK → CTE 递归查询 → Hash Join → Online DDL INSTANT/INPLACE/COPY → 自增锁三种模式 → utf8mb4 陷阱 → 排序规则选型 → 与 @Transactional 及 MyBatis 缓存的跨层关联`

---

## 4.11 MySQL 8.0 新特性（窗口函数 / CTE / Hash Join / 不可见索引）

**一句话原理**：MySQL 8.0 引入了窗口函数、CTE、Hash Join、不可见索引等重大特性，弥补了与传统商业数据库的功能差距。

---

#### 窗口函数

窗口函数在"窗口"（一组行）上执行计算，**不改变返回的行数**——这是与 GROUP BY 最本质的区别。GROUP BY 会压缩行数，窗口函数保留每一行明细的同时进行聚合/排序/偏移计算。

**排名函数**：

```sql
SELECT name, department, salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num,
    RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS rnk,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rnk,
    NTILE(4)     OVER (PARTITION BY department ORDER BY salary DESC) AS quartile
FROM employee;
```

| 函数 | 同值编号策略 | 适用场景 |
|------|-------------|---------|
| `ROW_NUMBER()` | 同值不同号（严格顺序）| 分页、去重 |
| `RANK()` | 同值同号，跳过后续名次 | 排名榜（并列后跳过）|
| `DENSE_RANK()` | 同值同号，不跳过 | 密集排名（并列后连续）|
| `NTILE(N)` | 平均分 N 组 | 分桶分析 |

**分析函数（前后行访问）**：

```sql
-- LAG: 前一行的值，LEAD: 后一行的值
SELECT time, price,
    LAG(price, 1)  OVER (ORDER BY time) AS prev_price,    -- 上一行
    LEAD(price, 1) OVER (ORDER BY time) AS next_price     -- 下一行
FROM stock_history;
```

**帧边界子句**：定义窗口函数的计算范围：

```sql
-- ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING: 当前行 + 前一行 + 后一行
-- ROWS UNBOUNDED PRECEDING: 窗口第一行到当前行
-- RANGE BETWEEN ...: 按值范围（而非行号）确定边界
SUM(salary) OVER (ORDER BY hire_date ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING)
```

> **关联知识点**：窗口函数保留明细 vs GROUP BY 压缩 → 4.2 覆盖索引（分析查询的索引优化）

---

#### CTE（公用表表达式）

**非递归 CTE**：替代嵌套子查询，提升可读性：

```sql
WITH dept_avg AS (
    SELECT department, AVG(salary) AS avg_salary
    FROM employee GROUP BY department
),
high_earners AS (
    SELECT e.name, e.salary, d.avg_salary
    FROM employee e JOIN dept_avg d USING(department)
    WHERE e.salary > d.avg_salary * 1.5
)
SELECT * FROM high_earners;
```

**递归 CTE**：处理树形结构（组织架构、分类树）：

```sql
WITH RECURSIVE org_tree AS (
    -- 锚点：根节点
    SELECT id, name, parent_id, 1 AS level
    FROM organization WHERE parent_id IS NULL
    UNION ALL
    -- 递归：逐层向下
    SELECT o.id, o.name, o.parent_id, t.level + 1
    FROM organization o JOIN org_tree t ON o.parent_id = t.id
)
SELECT * FROM org_tree ORDER BY level, id;
```

> **常见陷阱**：递归 CTE 必须包含 `UNION ALL`（不能是 UNION）；递归部分必须有终止条件（通常是 WHERE 条件限制递归深度）；`cte_max_recursion_depth` 参数控制最大递归深度（默认 1000）。

---

#### Hash Join

MySQL 8.0.18+ 引入，**等值连接且无索引时自动使用**。两阶段执行：

```text
Build Phase：选择小表（build table），逐行计算 hash 存入内存 hash 表
  ↓
Probe Phase：扫描大表（probe table），对每行计算 hash → 到 hash 表中探测匹配
```

**查看方式**：

```sql
EXPLAIN FORMAT=TREE
SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id;
-- 输出类似：
-- -> Inner hash join (o.customer_id = c.id)  (cost=...)
--     -> Table scan on o  (cost=...)
--     -> Hash
--         -> Table scan on c  (cost=...)
```

**限制条件**：
- 仅适用于等值 JOIN（非等值连接不会用 Hash Join）
- 不支持 LEFT/RIGHT JOIN 中的被驱动表
- 当 build table 过大超出 `join_buffer_size`（默认 256K）时，会溢出到磁盘（chunk 分片）

> **常见陷阱**：Hash Join 不是在所有 JOIN 场景都优于 NLJ（Index Nested-Loop Join）。有索引时 NLJ 通常更快；Hash Join 的优势在于大表无索引等值连接场景。

---

#### 不可见索引与降序索引

**不可见索引**：优化器不会使用的索引，用于安全测试删除索引的影响：

```sql
ALTER TABLE employee ALTER INDEX idx_salary INVISIBLE;
-- 查看查询计划是否变化
EXPLAIN SELECT * FROM employee WHERE salary > 10000;
ALTER TABLE employee ALTER INDEX idx_salary VISIBLE;  -- 恢复
```

限制：主键不能设为不可见。

**降序索引**：MySQL 8.0 真正实现降序索引（5.7 只解析 DESC 关键字但实际建升序索引）：

```sql
CREATE INDEX idx_dept_salary ON employee(dept_id ASC, salary DESC);
-- 查询 `WHERE dept_id=1 ORDER BY salary DESC` 直接走索引，无需 filesort
```

#### 直方图

帮助优化器在无索引列上做更好的执行计划选择：

```sql
-- 创建直方图（扫描全表，将数据分布统计到 N 个桶）
ANALYZE TABLE employee UPDATE HISTOGRAM ON salary WITH 100 BUCKETS;

-- 查看直方图信息
SELECT * FROM information_schema.COLUMN_STATISTICS
WHERE TABLE_NAME = 'employee';

-- 删除直方图
ANALYZE TABLE employee DROP HISTOGRAM ON salary;
```

> **关联知识点**：不可见索引 → 4.2 索引优化 / 降序索引 → 4.3 EXPLAIN（避免 filesort）/ 直方图 → 索引选择性

---

**追问链**：`窗口函数 vs GROUP BY 核心区别 → ROW_NUMBER/RANK/DENSE_RANK 对比 → NTILE 分桶 → LAG/LEAD 前后行访问 → 帧边界子句 ROWS/RANGE → 非递归 CTE 替代子查询 → WITH RECURSIVE 树形查询 → 递归终止条件 → Hash Join Build+Probe 两阶段 → Hash Join vs NLJ 选型 → 不可见索引安全测试 → 降序索引避免 filesort → 直方图辅助优化器`

---

## 4.12 字符集陷阱与排序规则

**一句话原理**：MySQL 的 `utf8` 是伪 UTF-8（实际是 utf8mb3，最多 3 字节），存储 emoji/生僻字必须用 `utf8mb4`。排序规则的选择影响字符串比较和 ORDER BY 结果。

---

#### utf8 陷阱

| 字符集 | 最大字节 | 覆盖范围 | 说明 |
|--------|:-------:|---------|------|
| `utf8` / `utf8mb3` | 3 字节 | Unicode BMP（U+0000 至 U+FFFF）| 不支持 4 字节字符（emoji、生僻汉字）|
| `utf8mb4` | 4 字节 | 完整 Unicode（U+0000 至 U+10FFFF）| utf8 的超集，兼容所有字符 |

**问题场景**：用户输入 emoji（如 👍）、生僻汉字（如 𠮟），写入 `utf8` 列时报错：

```sql
-- 表使用 utf8 字符集
CREATE TABLE user (name VARCHAR(100)) DEFAULT CHARSET=utf8;
INSERT INTO user VALUES ('用户👍');  -- ❌ Error: Incorrect string value
```

**解决方案**：

```sql
ALTER TABLE user CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- 或创建时指定
CREATE TABLE user (name VARCHAR(100)) DEFAULT CHARSET=utf8mb4;
```

**MySQL 8.0 的变化**：默认字符集从 `latin1` 改为 `utf8mb4`（MySQL 8.0.1+），默认排序规则为 `utf8mb4_0900_ai_ci`。

> **常见陷阱**：`utf8mb4` 是 `utf8` 的超集，从 `utf8` 改为 `utf8mb4` 不会丢失数据；但反过来（`utf8mb4` → `utf8`）可能因 4 字节字符无法截断而失败。VARCHAR 字段改为 utf8mb4 后字符数上限降低（4 字节占更多空间），但 MySQL 实际按字节存储，影响已存在的数据行长度。

---

#### 排序规则选型

| 排序规则 | 版本 | 特点 | 性能 |
|---------|:----:|------|:----:|
| `utf8mb4_general_ci` | MySQL 4.1+ | 排序算法简单，Unicode 支持不完整（如 ß 和 ss 视为不同） | 最快 |
| `utf8mb4_unicode_ci` | MySQL 5.0+ | 基于 Unicode 标准排序规则（UCA 4.0），准确完整 | 稍慢 |
| `utf8mb4_0900_ai_ci` | MySQL 8.0+ | 基于 Unicode 9.0（UCA 9.0），`ai`=不区分重音，`ci`=不区分大小写 | 与 unicode_ci 接近 |

**后缀含义**：

| 后缀 | 含义 | 示例对比 |
|------|------|---------|
| `_bin` | 二进制比较（按字节值）| 'a' != 'A' |
| `_ci` | Case Insensitive，不区分大小写 | 'a' = 'A' |
| `_ai_ci` | Accent Insensitive + Case Insensitive | 'a' = 'á' = 'A' |
| `_as` | Accent Sensitive，区分重音 | 'a' != 'á' |
| `_cs` | Case Sensitive，区分大小写 | 'a' != 'A' |

**选择建议**：MySQL 8.0 新项目用默认的 `utf8mb4_0900_ai_ci`；MySQL 5.7 迁移项目用 `utf8mb4_unicode_ci`（兼容性更好）；需要精确二进制比较用 `_bin`；需要严格大小写区分用 `_cs`。

> **常见陷阱**：排序规则不一致的字段 JOIN 可能导致索引失效（隐式转换）；更改排序规则后已有数据的 ORDER BY 结果可能变化；utf8mb4 的索引长度限制比 utf8 更严格（最大 767 字节 / 4 = 191 字符）。

> **关联知识点**：字符集 → 4.7 SQL 优化（隐式类型转换导致索引失效的类似逻辑）

---

**追问链**：`utf8 陷阱(实际是 utf8mb3) → 4字节字符(emoji)写入报错 → utf8mb4 完整 UTF-8 → MySQL 8.0 默认 utf8mb4 → 排序规则三种对比(general/unicode/0900) → 后缀含义(bin/ci/ai_ci/as/cs) → 排序规则不一致导致索引失效 → 索引长度限制`

---

## 4.13 Online DDL

**一句话原理**：MySQL 8.0 支持三种 DDL 算法：INSTANT（仅改元数据，秒级完成）、INPLACE（原表修改，允许并发 DML）、COPY（临时表复制，最重）。选择合适的算法可以避免生产环境 DDL 阻塞写入。

---

#### ALGORITHM 三种模式

| 算法 | 版本 | 原理 | 并发 DML | 磁盘空间 |
|------|:----:|------|:--------:|:--------:|
| `INSTANT` | 8.0.12+ | 只修改数据字典元数据 | 允许 | 无额外空间 |
| `INPLACE` | 5.6+ | 原表直接修改，逐条记录处理 | 允许（LOCK=NONE）| 重建索引时需额外空间 |
| `COPY` | 始终 | 创建临时新表，拷贝数据，RENAME 替换 | 不允许 | 双倍空间 |

```sql
-- 显式指定 ALGORITHM 和 LOCK
ALTER TABLE employee ADD COLUMN age INT DEFAULT 0,
    ALGORITHM=INSTANT,
    LOCK=NONE;
```

**INSTANT（8.0.12+）**：
- 仅修改数据字典中的元信息，不操作数据文件，操作秒级完成
- 8.0.12 仅支持 ADD COLUMN（顺序加列，不能指定位置）
- 8.0.29 增加支持 INSTANT DROP COLUMN
- **限制**：不支持压缩表、全文索引表、临时表；一行最多 64 次 INSTANT 变更（超过自动使用 INPLACE）

**INPLACE**：
- 原表直接修改（不拷贝临时表），通过 Row Log 记录变更
- 支持并发 DML（LOCK=NONE 时），DDL 期间允许读写
- 加二级索引时，需要建立排序文件用于索引构建
- 需要额外的 undo/redo log 空间（取决于并发 DML 量）

**COPY**：
- `CREATE TABLE new` → 逐条拷贝数据 → RENAME 替换原表
- 需要双倍磁盘空间
- 全程不能有并发 DML（LOCK=EXCLUSIVE）
- 目前已经是大多数 DDL 操作的退路选项

---

#### LOCK 配置

| LOCK 模式 | 允许并发读 | 允许并发写 | 适用场景 |
|-----------|:---------:|:---------:|---------|
| `NONE` | 是 | 是 | 生产环境核心表 DDL |
| `SHARED` | 是 | 否 | 允许只读场景 |
| `EXCLUSIVE` | 否 | 否 | 紧急修复、初始化 |

---

#### 常见 DDL 操作支持矩阵

| DDL 操作 | 最低 ALGORITHM | 推荐 LOCK | 说明 |
|---------|:-------------:|:---------:|------|
| ADD COLUMN | INSTANT（8.0.12+）| NONE | 只能顺序加列，不能指定位置 |
| DROP COLUMN | INSTANT（8.0.29+）| NONE | 无需重建表 |
| ADD INDEX | INPLACE | NONE | 需构建排序文件 |
| DROP INDEX | INPLACE | NONE | 仅修改元数据 |
| CHANGE COLUMN | COPY | EXCLUSIVE | 重命名+类型变更需 COPY |
| ADD FULLTEXT INDEX | COPY | SHARED | 不支持 INPLACE |
| 修改列默认值 | INSTANT | NONE | 仅改元数据 |
| RENAME TABLE | INSTANT | NONE | 仅改元数据 |
| ALTER INDEX INVISIBLE | INSTANT | NONE | 仅改元数据 |

> **常见陷阱**：
> - `ALGORITHM=INSTANT` 不是万能药——加 NOT NULL DEFAULT 列仍需要扫描行，INSTANT 只处理元数据
> - 8.0 之前 Online DDL 会通过临时表空间记录并发 DML 变更，大事务并发时可能导致临时表空间撑爆
> - Online DDL 过程中 `ALTER TABLE ... WAIT N` 设置等待锁超时，超时后回滚 DDL 不影响业务

> **关联知识点**：DDL 锁 → 4.6 InnoDB 锁机制 / 索引构建 → 4.1 B+Tree 重建

---

**追问链**：`DDL 三种算法(INSTANT/INPLACE/COPY) → INSTANT 原理(改元数据) → INSTANT 限制(64次/不支持压缩表) → INPLACE 逐条处理+Row Log → COPY 双倍空间 → LOCK 四种配置(NONE/SHARED/EXCLUSIVE) → ADD COLUMN INSTANT → ADD INDEX INPLACE+NONE → CHANGE COLUMN COPY → INSTANT NOT NULL DEFAULT 陷阱 → WAIT N 超时控制`

---

## 4.14 MySQL 自增锁

**一句话原理**：`innodb_autoinc_lock_mode` 控制自增主键的加锁策略：传统模式（表级锁）→ 连续模式（互斥锁+表级锁）→ 交错模式（纯互斥锁，最高并发）。自增值 MySQL 8.0 通过 redo log 持久化。

---

#### innodb_autoinc_lock_mode 三种模式

| 模式 | 名称 | simple insert | bulk insert | 连续性 | 并发度 |
|:----:|:----:|:------------:|:----------:|:-----:|:-----:|
| 0 | 传统模式 | 表级锁（AUTO-INC 锁） | 表级锁 | 最高 | 最低 |
| 1 | 连续模式（默认） | 轻量互斥锁（mutex） | 表级锁 | 高 | 中 |
| 2 | 交错模式 | 轻量互斥锁 | 轻量互斥锁 | 不保证连续 | 最高 |

**simple insert vs bulk insert**：

| 插入类型 | 说明 | 示例 |
|---------|------|------|
| simple insert | 插入行数预先可知 | `INSERT INTO t VALUES(1), (2), (3)` |
| bulk insert | 插入行数预先不知 | `INSERT ... SELECT`、`LOAD DATA`、`INSERT ... ON DUPLICATE KEY UPDATE` |

**模式 1（连续，MySQL 默认）**：simple insert 使用轻量级互斥锁（`AUTO-INC 互斥量`），语句开始时获取，分配完自增值立即释放。bulk insert 使用表级 AUTO-INC 锁，整个语句期间保持，结束后释放。保证每个语句内的自增值是连续的。**这是 MySQL 5.1-8.0 的默认模式**。

**模式 2（交错）**：所有 INSERT-like 操作都使用轻量互斥锁，无表级锁。并发最高，但 `INSERT ... SELECT` 这种 bulk insert 会预先申请一批自增值，实际插入的行数少于申请的数量，导致空洞。

```text
模式 1 → simple insert: 互斥锁（快，不影响并发）
          bulk insert: 表级锁（串行，保证语句级连续）
模式 2 → 全部互斥锁（最高并发，但自增号可能乱序/空洞）
```

> **常见陷阱**：模式 2 在 statement-based 复制下不安全（从库自增值与主库不一致），MySQL 8.0 推荐 binlog_format=ROW 时使用模式 2 获取更高并发。

---

#### 自增值不连续的原因

| 原因 | 说明 |
|------|------|
| 事务回滚 | 自增值不回退（已分配的 ID 即使事务回滚也不会重新使用）|
| 唯一键冲突 | INSERT 失败前已分配的自增值被消耗 |
| 批量插入预留 | `INSERT ... SELECT` 预申请多个 ID，实际插入少于申请数 |
| MySQL 5.7 重启 | 每次重启取 `MAX(id) + 1` 作为初始值（可能覆盖之前预分配的 ID）|

---

#### MySQL 8.0 自增持久化改进

**MySQL 5.7 的问题**：自增值存储在内存中，重启后通过 `SELECT MAX(id) + 1` 恢复。如果重启前有预分配但未使用的自增值，重启后会丢失。

**MySQL 8.0 的改进**：自增值通过 **redo log** 持久化，重启后可以从 redo log 恢复自增值状态，不会丢失未使用的预分配值。每次自增值变更都写入 redolog：

```sql
-- 查看当前自增值
SHOW CREATE TABLE employee\G
-- AUTO_INCREMENT=1001 显示当前自增值

-- 修改自增值（仅能改大不能改小）
ALTER TABLE employee AUTO_INCREMENT = 2000;
```

> **常见陷阱**：自增值大于 `MAX(id)` 是正常的（已分配但未使用或已回滚）。如果自增值回卷（`MAX(id)` 接近 `AUTO_INCREMENT`），需要手动 `ALTER TABLE ... AUTO_INCREMENT = MAX(id) + 1` 修复。设置自增值不能小于当前 `MAX(id)`。

> **关联知识点**：自增锁 → 4.6 锁机制（表级锁 vs 行级锁对比）/ redo log 持久化 → 4.10 InnoDB 内存结构 / 自增主键 → 4.1 聚簇索引（B+Tree 顺序写入优化）

---

**追问链**：`innodb_autoinc_lock_mode 三种模式(0/1/2) → simple insert vs bulk insert 区别 → 模式 1 连续模式(simple互斥锁+bulk表级锁) → 模式 2 交错模式(全部互斥锁) → statement-based 复制不安全 → 自增不连续四大原因(事务回滚/键冲突/批量预留/重启) → MySQL 8.0 redo log 持久化 → 自增值手动修改`

---

**整体追问链（方向四 更新）**：`B+Tree 三层结构 → 聚簇 vs 二级索引 → 最左前缀失效 → 覆盖索引 Using index → ICP 下推 → MRR 顺序 I/O → EXPLAIN type/key_len/Extra → ACID 四特性底层机制 → 四种隔离级别 → 三类并发问题 → MVCC Undo Log 版本链 → ReadView 可见性判定 → RC vs RR ReadView 差异 → 快照读 vs 当前读 → Record Lock/Gap Lock/Next-Key Lock → 锁退化规则 → 慢查询定位 → SQL 改写 → 深分页游标 → 分库分表 ShardingSphere → 主从复制 Binlog 三格式 → Buffer Pool LRU 变种 → Redo Log WAL → 两阶段提交 → 窗口函数 ROW_NUMBER/RANK/DENSE_RANK → CTE 递归查询 → Hash Join Build+Probe → 不可见索引安全测试 → 直方图统计 → utf8mb3 陷阱→排序规则选型(0900/unicode/general) → Online DDL INSTANT/INPLACE/COPY → LOCK 配置(NONE/SHARED/EXCLUSIVE) → 自增锁三种模式(0 表级锁/1 连续/2 交错) → 自增不连续原因 → 8.0 redo log 持久化 → 与 @Transactional 及 MyBatis 缓存的跨层关联`
