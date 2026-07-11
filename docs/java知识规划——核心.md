---
title: java知识规划——核心
created: 2026-07-11 15:00
updated: 2026-07-11 15:00
version: 0.0.1
author: ziogn
tags: [java, interview, guide, java面试, research]
aliases: [Java核心技术, Java面试核心, JVM, 并发编程, 集合框架]
description: Java 核心技术面试知识规划，覆盖 Java 版本特性、JVM 内存模型与 GC、并发编程、集合框架、NIO/Netty、设计模式六大模块，附知识点追问链与跨域知识关联。
---

# java知识规划——核心

> 本文档覆盖面试权重 30% 的 Java 核心知识，按"语言特性 → 运行时原理 → 并发 → 数据结构 → IO → 设计"的逻辑递进。与 Spring 生态体系、MyBatis、MySQL、AI 开发等方向的知识关联见[总览文档](java知识规划——总览.md)的跨域链路。

## 1.1 Java 版本特性演进（8→11→17→21）

涵盖 Java 8/11/17/21 四个 LTS 版本的核心特性，重点理解 Lambda 编译原理、Stream 惰性求值、虚拟线程并发模型、Record 与模式匹配的语言级增强。

---

#### Lambda 与 invokedynamic

Java 8 Lambda 的编译方式与匿名内部类有本质区别：

- **匿名内部类**：javac 编译为独立的 `OuterClass$1.class` 文件，每次调用经历类加载、验证、准备完整流程
- **Lambda 表达式**：javac 生成一条 `invokedynamic` 指令，首次调用时通过 BootstrapMethods 属性中的 `LambdaMetafactory.metafactory()` 动态生成本地内部类（`Unsafe.defineAnonymousClass`），后续调用直接命中已链接的 CallSite

```java
字节码对比：
匿名内部类：
  new InnerClass                     // 创建类实例
  invokespecial InnerClass.<init>    // 调用构造器

Lambda 表达式：
  invokedynamic LambdaMetafactory    // 启动引导方法，首次链接后直接调用
```

关键优势：不产生额外 class 文件、首次调用后性能优于匿名内部类（直接 MethodHandle 调用）、延迟绑定（bootstrap 在运行时才触发）。

> **常见陷阱**：Lambda 捕获的外部变量必须是 effectively final（从 Java 8 起，匿名内部类要求 final，Lambda 要求 effectively final）。

> **关联知识点**：invokedynamic → JVM 字节码指令集 / Lambda → Stream 函数式编程 / 函数式接口 → 方法引用（`::`）

---

#### Stream 惰性求值与并行流

**惰性求值机制**：
- **中间操作**（`filter`/`map`/`sorted`/`distinct`）构建操作流水线（`AbstractPipeline`），不执行实际计算
- **终端操作**（`collect`/`forEach`/`reduce`/`count`）触发整个流水线一次性执行
- 特征：Stream 只能消费一次，终端操作后 Stream 已关闭

**并行流陷阱**：
- `parallelStream()` 默认使用 `ForkJoinPool.commonPool()`，线程数 = `Runtime.availableProcessors() - 1`
- 多个并行流共享同一线程池，一个操作阻塞（如慢 SQL）会影响所有并行任务
- 线程池中的线程不可见 `ThreadLocal` 值（`ForkJoinWorkerThread` 不继承）

```java
// 自定义 ForkJoinPool 隔离并行流
ForkJoinPool customPool = new ForkJoinPool(4);
try {
    customPool.submit(() -> list.parallelStream()
        .forEach(item -> process(item))
    ).get();
} finally {
    customPool.shutdown();
}
```

> **关联知识点**：并行流 → CompletableFuture（异步任务编排）/ 共享线程池陷阱 → 线程池隔离 / 惰性求值 → 函数式编程思想

---

#### 虚拟线程（Java 21）

虚拟线程是 Java 21 正式 GA 的轻量级并发模型（Project Loom 的产出）：

| 维度 | 平台线程（Platform Thread） | 虚拟线程（Virtual Thread） |
|------|----------------------------|---------------------------|
| 调度者 | OS 内核 | JVM 用户态 |
| 栈大小 | 默认 1MB+ | 几 KB，动态伸缩 |
| 上下文切换 | 系统调用，微秒级 | Java 方法调用，纳秒级 |
| 最大数量 | 数千 | 数百万 |
| 适用场景 | CPU 密集 | I/O 密集（大量阻塞等待） |

**与线程池的关系**：虚拟线程非常轻量，不需要池化。每个任务直接创建新虚拟线程：

```java
// 方式一：直接创建
Thread.startVirtualThread(() -> handleRequest());

// 方式二：Executors 工厂
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    executor.submit(() -> handleRequest());
}
```

**不适用场景**：CPU 密集计算不适合虚拟线程。虚拟线程的 carrier 线程数量有限（通常等于 CPU 核数），长时间占用的 CPU 任务会阻塞其他虚拟线程运行。虚拟线程的优势在于大量任务处于等待（I/O）状态时的高效调度。

> **常见陷阱**：
> - 虚拟线程中使用 `synchronized` 会导致 pinning（钉住 carrier 线程），降低调度的优势
> - 使用 `ThreadLocal` 时创建成本极低，但若每个虚拟线程都使用带大对象的 ThreadLocal，内存压力反而更大
> - 虚拟线程 `pinned` 问题：`synchronized` 块或 `native` 方法中无法 yield

> **关联知识点**：虚拟线程 vs 平台线程 → 线程池 / 虚拟线程的 carrier → 并发模型演进 / 结构化并发 → Java 21 结构化任务 API（`StructuredTaskScope`）

---

#### Record 与模式匹配

**Record（Java 14 Preview → 16 正式）** vs **Lombok @Data**：

| 特性 | Record | Lombok @Data |
|------|--------|-------------|
| 不可变性 | 是（所有字段 final） | 否（生成 setter） |
| 继承 | 隐式 final，不可继承 | 可继承 |
| equals/hashCode/toString | 自动生成（基于所有 component） | 自动生成 |
| 注解放置 | 可放在 component 上声明式传递 | 需要手动加 |
| 序列化 | 与普通类一致 | 与普通类一致 |

```java
// Record 声明
public record User(Long id, String name, String email) {}

// 等价于手动创建的包含 final 字段、全参构造器、equals/hashCode/toString 的不可变类
// 反序列化可通过规范构造器（canonical constructor）
```

**Sealed Class（Java 17 正式）**：严格控制类型层次：

```java
// 约束 Shape 只有两个子类
public sealed class Shape permits Circle, Rectangle {}
final class Circle extends Shape {}
final class Rectangle extends Shape {}
```

**Switch 模式匹配（Java 21 正式）**：

```java
// 旧写法：instanceof + 强转
if (obj instanceof String) {
    String s = (String) obj;
    System.out.println(s.length());
}

// 新写法：模式匹配 + Guard
switch (obj) {
    case String s when s.length() > 5 -> System.out.println("长字符串: " + s);
    case String s                  -> System.out.println("短字符串: " + s);
    case null                      -> System.out.println("null");
    case Integer i                 -> System.out.println("整数: " + i);
    default                        -> System.out.println("其他");
}
```

> **常见陷阱**：Record 不适合可变对象（如 JPA Entity），适合 DTO / 值对象 / 多返回值。Sealed Class 的 permit 子类必须在同一模块或同一包内。

> **关联知识点**：Record → 集合框架中的不可变集合 / Sealed Class → 类型安全设计 / 模式匹配 → 函数式编程中的访客模式 / Switch 表达式 → 配合 Optional/Stream 简化代码

---

**追问链**：`Lambda invokedynamic 原理 → 和匿名内部类性能区别 → 为什么明确捕获的变量必须 effectively final → Stream 中间和终端操作区别 → 惰性求值原理 → 并行流 ForkJoinPool 陷阱 → 如何隔离 → 虚拟线程和平台线程区别 → 为什么不适用 CPU 密集 → pinned 问题 → 和线程池的关系 → Record 和 @Data 对比 → 什么场景用 Record → Sealed Class 解决了什么问题 → Switch 模式匹配有哪些新写法`

---

## 1.2 JVM 内存模型与垃圾回收

涵盖运行时数据区结构、GC 收集器演进（CMS→G1→ZGC）、OOM 排查实战、JMM 规范与类加载机制。

---

#### 运行时数据区

**堆分代结构**（比例非固定，默认可调）：

```text
                    堆（Heap）
┌──────────────────────────────────────────────┐
│  新生代（Young Generation）      │ 老年代      │
│  ┌─────┬────┬────┐               │ (Old/Tenured)│
│  │Eden │ S0 │ S1 │               │              │
│  │ 8   │ 1  │ 1  │               │              │
│  └─────┴────┴────┘               │              │
└──────────────────────────────────────────────┘
```

- **Eden**：新对象优先分配在 Eden，Minor GC 后将存活对象复制到 S0/S1
- **S0/S1**：From 和 To 区交替使用，保证始终有一个空区用于复制
- **老年代**：长期存活对象（默认每 Minor GC 一次年龄 +1，`-XX:MaxTenuringThreshold` 默认 15）
- **大对象**：直接进入老年代（`-XX:PretenureSizeThreshold`）

**元空间（Metaspace）vs 永久代（PermGen）**：
- **JDK 8** 移除了永久代，类元数据存储在元空间（本地内存 / Native Memory）
- 默认无上限，受本地内存限制，避免经典的 PermGen OOM
- 字符串常量池和静态变量从永久代移至堆

**栈帧结构**：每个方法调用创建一个栈帧：

| 栈帧组件 | 说明 |
|---------|------|
| 局部变量表 | this + 方法参数 + 局部变量，编译时确定大小 |
| 操作数栈 | 字节码指令的操作数，深度编译时确定 |
| 动态链接 | 指向运行时常量池的方法引用符号 |
| 方法出口 | 正常返回（PC 计数器恢复）或异常返回（异常表查找） |

> **常见陷阱**：栈溢出（`StackOverflowError`）通常来自递归无终止条件；元空间 OOM 通常来自 CGLIB/ASM 动态生成大量类（如 Spring AOP 代理无限生成）。

> **关联知识点**：栈帧 → 方法调用和递归 / 元空间 → 类加载机制 / 堆分代 → GC 收集器设计依据

---

#### GC 演进路线：CMS → G1 → ZGC

| 特性 | CMS | G1 | ZGC |
|------|-----|-----|-----|
| 引入 | JDK 5 | JDK 7 | JDK 11 实验 → JDK 15 正式 → JDK 21 分代 ZGC |
| 默认 | 可选（JDK 9 废弃，JDK 14 移除） | JDK 9+ 默认 | 需手动指定 |
| 堆结构 | 连续分代 | Region（1-32MB） | Region（动态，最多 4K 个） |
| 核心机制 | 并发标记 + 并发清除 | Region + SATB + 可预测停顿 | 染色指针 + 读屏障 + 并发 |
| 停顿目标 | 几十毫秒 | 10-200ms（可配置） | <1ms（与堆大小无关） |
| 主要问题 | 碎片 + 浮动垃圾 + 并发失败 | 大对象分配效率 | 内存开销（额外指针 64bit 系统 4%）|

**CMS 四阶段**：
1. 初始标记（STW）：标记 GC Roots 直接可达对象
2. 并发标记：从 GC Roots 出发遍历对象图
3. 重新标记（STW）：修正并发期间变动的引用
4. 并发清除：并发回收死亡对象

**G1 Region 化核心**：
- 堆划分为 1-32MB 的 Region
- `-XX:MaxGCPauseMillis=200` 设定目标停顿，G1 按回收收益排序 Region（优先回收最快释放最多空间的 Region）
- Mixed GC：同时回收年轻代 + 部分高收益老年代 Region
- SATB（Snapshot-At-The-Beginning）：并发标记时记录快照，保证标记正确性

**ZGC 染色指针**：
- 64 位指针中 42 位存地址，18 位存元数据（Finalizable / Remapped / Marked0 / Marked1）
- 无需对象头标记位，操作指针即操作标记状态
- 并发整理（压缩）不产生碎片

> **常见陷阱**：CMS 已被 JDK 14 正式移除，G1 在低延迟场景表现不如 ZGC，ZGC 在超大堆（TB 级）有明显优势但会占用更多 CPU 资源。

> **关联知识点**：GC 停顿 → JVM 调优实战 / CMS 并发标记 → 三色标记算法 / G1 SATB → RSet（Remembered Set） / ZGC 染色指针 → 指针压缩（`-XX:+UseCompressedOops`）

---

#### OOM 排查流程

**命令工具链**：

```bash
# 查看堆配置和使用量
jmap -heap <pid>

# 对象统计（按实例数降序，live 参数触发 Full GC 后统计）
jmap -histo:live <pid> | head -20

# 线程栈 + 死锁检测
jstack <pid>

# GC 状态每秒查看（S0/S1/Eden/Old 使用率 + GC 次数/时间）
jstat -gcutil <pid> 1000

# 导出 heap dump（live 参数只保留存活对象，文件更小）
jmap -dump:live,format=b,file=/tmp/heap.hprof <pid>
```

**MAT (Memory Analyzer) 分析步骤**：

```text
1. 打开 heap dump → 自动生成 Leak Suspects Report
2. Suspects 视图 → 查看疑似泄漏的 GC Root 到对象的引用链
3. Dominator Tree → 按"支配树"查看最大对象的引用路径
   └─ 找支配树中最大的对象，看谁引用了它（传入引用 / incoming references）
4. 检查常见泄漏模式：
   - ThreadLocalMap Entry 中 key=null 但 value 仍在
   - HashMap 中大量 Entry 堆积
   - ClassLoader 泄漏（热部署场景）
```

> **常见陷阱**：
> - `jmap -dump` 导 heap dump 时会触发 Full GC，生产环境谨慎使用
> - 推荐使用 `jcmd <pid> GC.heap_dump /tmp/heap.hprof`（JDK 8+）
> - Arthas 的 `heapdump` 命令支持只 dump 存活对象

> **关联知识点**：OOM 排查 → 引用类型（强/软/弱/虚）/ MAT 支配树 → 内存泄漏模式 / heap dump → 日志分析（GC log + `-XX:+PrintGCDetails`）

---

#### JMM 与 happens-before

JMM（Java Memory Model）定义线程间的通信规范，不涉及具体 JVM 实现，是跨平台的抽象规范。

**核心规则**（happens-before）：

| 规则 | 说明 |
|------|------|
| 程序次序规则 | 同一个线程中，写在前面的操作 happens-before 后面的操作 |
| volatile 规则 | 对 volatile 变量的写 happens-before 后续任何对该变量的读 |
| 锁规则 | unlock happens-before 后续的 lock |
| 线程启动规则 | `Thread.start()` happens-before 被启动线程中的任何操作 |
| 线程终止规则 | 线程中所有操作 happens-before `Thread.join()` 返回 |
| 传递性 | A happens-before B, B happens-before C → A happens-before C |

```java
// volatile 规则示例：保证 flag 的可见性
volatile boolean flag = false;
int data = 0;

// 线程 A
data = 42;      // 1
flag = true;    // 2 — volatile 写

// 线程 B
if (flag) {     // 3 — volatile 读（看到 flag=true → 也看到 data=42）
    System.out.println(data); // 输出 42 而不是 0
}
```

根据 happens-before 传递性：2 happens-before 3（volatile 规则），1 happens-before 2（程序次序规则），因此 1 happens-before 3，线程 B 一定看到 data=42。

> **常见陷阱**：volatile 保证可见性但不保证原子性（`count++` 仍需要 synchronized 或 AtomicInteger）。JMM 是规范，JVM 实现通过插入内存屏障达成。

> **关联知识点**：JMM → volatile / happens-before → 并发编程三大特性（原子性、可见性、有序性）/ 锁规则 → synchronized 锁升级

---

#### 双亲委派模型与打破场景

**双亲委派模型**：

```text
Bootstrap ClassLoader（C++ 实现，加载 rt.jar / java.base）
        ↑ 委派
Extension / Platform ClassLoader（JDK 9 改名为 Platform）
        ↑ 委派
Application ClassLoader（加载 classpath）
        ↑ 委派
自定义 ClassLoader
```

工作机制：加载类时先委托给父加载器，父无法加载时才自己加载。保障基础类（`java.lang.Object`）的统一性。

**三种打破场景**：

1. **SPI 机制（JDBC）**：DriverManager 由 Bootstrap ClassLoader 加载，但需要加载厂商实现的 JDBC 驱动 → 使用 `Thread.currentThread().getContextClassLoader()` 打破
2. **Tomcat 容器**：每个 Web 应用独立 WebAppClassLoader，优先加载 Web 应用的类，实现应用隔离和热部署（重新创建 ClassLoader 替换）
3. **OSGi 模块化**：网状加载模型，类加载器之间相互委托，基于包的导入导出规则

```java
// JDBC SPI 打破双亲委派示例
// DriverManager（BootstrapClassLoader 加载）通过 SPI 加载 MySQL 驱动
// 实际使用的是 Thread Context ClassLoader
ServiceLoader<Driver> drivers = ServiceLoader.load(Driver.class);
```

> **关联知识点**：双亲委派 → 类加载隔离 / SPI 打破 → [Spring Boot 自动配置](java知识规划——spring.md#23-spring-boot-核心机制) / Tomcat 打破 → 热部署原理 / 类加载 → 元空间 OOM

---

**追问链**：`运行时数据区 → 堆分代结构 → 对象什么时候进入老年代 → 元空间比永久代好在哪 → 栈帧有哪些部分 → CMS 并发标记过程 → G1 Region 设计为什么能预测停顿 → ZGC 染色指针是什么 → 和指针压缩什么关系 → OOM 排查流程 → MAT 怎么用 → JMM 的 happens-before 规则 → volatile 规则保证了什么 → 和内存屏障什么关系 → 双亲委派模型 → 什么时候需要打破 → SPI/Tomcat/OSGi 三种打破场景 → 和 Spring Boot 自动配置的关系`

---

## 1.3 并发编程

从底层 CPU 原语到高层异步编排的完整并发知识链。同步 / 锁 / 线程池 / 异步编排构成面试中占比最高的 Java 核心模块。

---

#### synchronized 锁升级（JDK 6 优化）

synchronized 经历了从重量级到轻量级的持续优化。

**Mark Word 布局**（64-bit JVM）：

```text
锁状态       | 标志位 | Mark Word 内容
无锁/偏向    | 01    | 偏向线程 ID + epoch + 分代年龄 + 1（偏向位）
轻量级锁     | 00    | 指向栈中 Lock Record 的指针
重量级锁     | 10    | 指向 Monitor（ObjectMonitor）的指针
GC 标记      | 11    | （GC 时使用）
```

**锁升级全链**：

```text
无锁 → 偏向锁 → 轻量级锁（CAS 自旋） → 重量级锁（OS 互斥量）

偏向锁：
  Mark Word 记录线程 ID → 同线程重入只检查 ID，无需 CAS
  批量撤销/重偏向：当一个类的偏向锁被频繁撤销 → 禁用偏向锁
  （JDK 15 默认关闭偏向锁，因其在高并发应用中的维护成本 > 收益）

轻量级锁：
  线程在自己的栈帧中创建 Lock Record
  通过 CAS 将 Mark Word 替换为 Lock Record 指针
  多个线程竞争时 CAS 失败 → 自旋等待 → 自旋超过阈值 → 膨胀为重量级

重量级锁：
  CAS 失败次数超过阈值 → 膨胀为 ObjectMonitor
  _EntryList 阻塞队列 → _WaitSet 等待队列（wait/notify）
  进入内核态，线程阻塞
```

> **常见陷阱**：JDK 15+ 默认关闭偏向锁（`-XX:-UseBiasedLocking`）。锁升级是单向的，不能降级。wait/notify 只能在 synchronized 块中使用。

> **关联知识点**：synchronized → Mark Word 对象头 / Monitor 实现 → AQS 的相似思路 / 锁升级 → CAS 原理 / synchronized 与 ReentrantLock 对比

---

#### AQS（AbstractQueuedSynchronizer）

JUC 锁和同步器的基石，核心三要素：

**CLH 队列变体**：
- 双向链表（Node 节点），头节点持有锁
- 后继节点通过 `LockSupport.park()/unpark()` 阻塞/唤醒
- 公平锁：新线程入队尾；非公平锁：新线程先 CAS 抢锁，失败再入队

**state**：
- `volatile int state`，表示同步状态
- ReentrantLock：0=未锁定，>0=重入次数
- Semaphore：剩余许可数
- CountDownLatch：计数

**Condition**：
- 内部维护 `ConditionObject` 等待队列（单向链表）
- `await()`：释放锁，入队等待队列，挂起
- `signal()`：等待队列头节点移到同步队列

```java
// AQS 独占模式核心骨架（简化理解）
public final void acquire(int arg) {
    if (!tryAcquire(arg) &&              // 子类实现：CAS 尝试获取
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg)) // 入队 + 自旋/阻塞
        selfInterrupt();
}
```

**基于 AQS 的实现**：
- `ReentrantLock`（独占模式 + Condition）
- `CountDownLatch`（共享模式，count=0 时释放所有等待线程）
- `Semaphore`（共享模式，state 表示剩余许可）
- `CyclicBarrier`（基于 ReentrantLock + Condition 实现）
- `ReentrantReadWriteLock`（独占 + 共享双模式）

> **关联知识点**：AQS → ReentrantLock / AQS CLH 队列 → Condition / AQS 共享模式 → CountDownLatch / AQS → synchronized Monitor 的异同

---

#### CAS 与 ABA 问题

**CAS 操作**：`Unsafe.compareAndSwapObject()` 底层调用 CPU `cmpxchg` 指令，比较当前值与预期值，相等则交换。

```java
// AtomicInteger.incrementAndGet 底层：CAS 循环
public final int incrementAndGet() {
    for (;;) {
        int current = get();
        int next = current + 1;
        if (compareAndSet(current, next))  // CAS 成功则返回
            return next;                   // 失败则重试
    }
}
```

**ABA 问题**：从 A 改为 B 再改回 A，CAS 无法感知中间变化。

```java
// 解决方案：AtomicStampedReference 带版本号
AtomicStampedReference<String> ref = new AtomicStampedReference<>("A", 0);
int[] stamp = new int[1];
String value = ref.get(stamp);   // value="A", stamp[0]=0
ref.compareAndSet("A", "B", stamp[0], stamp[0] + 1); // stamp → 1
ref.compareAndSet("B", "A", stamp[0], stamp[0] + 1); // stamp → 2
// 其他线程通过 stamp 可以感知到版本已变化
```

> **常见陷阱**：CAS 在竞争激烈时会导致大量自旋浪费 CPU（"自旋风暴"）。ABA 问题在部分场景不敏感（如计数器），但在链表操作中可能导致严重 bug。

> **关联知识点**：CAS → Atomic 系列类（AtomicInteger/AtomicLong/AtomicReference）/ CAS 自旋 → synchronized 轻量级锁自旋 / ABA → AtomicStampedReference → 数据库乐观锁版本号思路一致

---

#### volatile 与内存屏障

**volatile 语义**：
- **可见性**：volatile 写立即刷入主存，读从主存获取
- **有序性**：禁止 JIT 编译器和 CPU 对该变量的指令重排序
- **不保证原子性**：`volatile int count++;` 不是原子操作

**四种内存屏障类型**：

| 屏障类型 | 指令示例 | 语义 |
|---------|---------|------|
| LoadLoad | Load1 → LoadLoad → Load2 | Load1 数据加载先于 Load2 |
| LoadStore | Load1 → LoadStore → Store2 | Load1 先于 Store2 刷新 |
| StoreStore | Store1 → StoreStore → Store2 | Store1 数据对其他处理器可见先于 Store2 |
| StoreLoad | Store1 → StoreLoad → Load2 | 最重屏障，Store1 对所有人可见后才 Load2 |

**DCL 为什么需要 volatile**：

```java
public class Singleton {
    private static volatile Singleton instance;  // ← volatile 必不可少

    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                    // ① 分配内存空间
                    // ② 初始化对象
                    // ③ 将 instance 指向分配的内存地址
                    // 不加 volatile：②③ 可能重排为 ①③②
                    // 线程 B 在 ③ 之后读到 instance != null → 访问未初始化的对象
                }
            }
        }
        return instance;
    }
}
```

**不使用 volatile 的风险**：`instance = new Singleton()` 三个步骤可能被 JIT 重排为 `① → ③ → ②`。线程 B 在第 ③ 步完成后读到 `instance != null`，但对象尚未初始化，调用方法导致空指针。

**替代方案**：静态内部类也可以做到懒加载和线程安全，不需要 volatile：

```java
public class Singleton {
    private Singleton() {}
    private static class Holder {
        static final Singleton INSTANCE = new Singleton();
    }
    public static Singleton getInstance() {
        return Holder.INSTANCE;  // 类加载机制保证线程安全
    }
}
```

> **常见陷阱**：volatile 不保证复合操作的原子性，64 位变量（long/double）的读写在非 volatile 情况下可能被拆分为两次 32 位操作。

> **关联知识点**：volatile → JMM happens-before 规则 / DCL → 单例模式 / 内存屏障 → CPU 乱序执行 / 可见性 → CPU 缓存一致性协议（MESI）

---

#### ThreadLocal 内存泄漏

**引用链**：

```text
Thread
  └─ ThreadLocalMap
       └─ Entry（弱引用）─ key: ThreadLocal<?>
                  └─（强引用）─ value: Object
```

**泄漏根源**：
- Entry 的 key 是弱引用（`WeakReference<ThreadLocal>`），GC 时 key 被回收 → key = null
- Value 是强引用，只要 Thread 仍然存活，value 就一直可达
- Entry 只在 `get()`/`set()`/`remove()` 时被动清理 stale entries
- 线程池中线程被复用，一直存活 → value 永远无法回收

```java
// 正确用法：必须 finally remove
private static final ThreadLocal<Context> contextHolder = new ThreadLocal<>();

public void process() {
    try {
        contextHolder.set(new Context(...));
        // ... 业务逻辑
    } finally {
        contextHolder.remove();  // 必须清理，防止内存泄漏
    }
}
```

**伪内存泄漏**：即使 key 变为 null，value 仍被线程引用，无法回收。长期运行的线程池任务尤其需要注意。

**替代方案**：
- `InheritableThreadLocal`：子线程继承父线程的 ThreadLocal 值（线程池中不适用，线程池复用线程不会重新继承）

> **关联知识点**：ThreadLocal 隔离 → [AI ChatMemory @MemoryId](java知识规划——ai开发.md#55-chatmemory-与提示模板) 会话隔离 / 弱引用引用链 → 引用类型（软/弱/虚）/ remove 模式 → try-finally 最佳实践 / ThreadLocal 在线程池中 → 异步任务上下文传递

---

#### 线程池核心参数

**ThreadPoolExecutor 7 大参数**：

| 参数 | 说明 |
|------|------|
| `corePoolSize` | 核心线程数，即使空闲也不会被回收（除非 allowCoreThreadTimeOut） |
| `maximumPoolSize` | 最大线程数 |
| `keepAliveTime` + `unit` | 非核心线程空闲存活时间 |
| `workQueue` | 阻塞队列（`ArrayBlockingQueue` / `LinkedBlockingQueue` / `SynchronousQueue` / `PriorityBlockingQueue`）|
| `threadFactory` | 线程工厂（建议自定义命名） |
| `handler` | 拒绝策略 |

**任务流程**：

```text
提交任务
  ↓
核心线程是否满？
  否 → 创建核心线程执行
  是 ↓
工作队列是否满？
  否 → 入队等待
  是 ↓
当前线程数 < maximumPoolSize？
  是 → 创建非核心线程执行
  否 ↓
执行拒绝策略
```

**拒绝策略**：
- `AbortPolicy`（默认）：抛 `RejectedExecutionException`
- `CallerRunsPolicy`：调用者线程执行（背压）
- `DiscardPolicy`：静默丢弃
- `DiscardOldestPolicy`：丢弃队列头任务

```java
// 最佳实践：自定义命名 + 合理参数
ThreadPoolExecutor executor = new ThreadPoolExecutor(
    4,                                  // corePoolSize
    8,                                  // maximumPoolSize
    60L, TimeUnit.SECONDS,             // keepAliveTime
    new LinkedBlockingQueue<>(1000),    // 有界队列，避免 OOM
    new ThreadFactoryBuilder()
        .setNameFormat("biz-pool-%d")
        .build(),                       // 可识别线程名（Guava 或自定义）
    new ThreadPoolExecutor.CallerRunsPolicy() // 背压
);
```

**线程数估算**：

```text
CPU 密集：Ncpu + 1（如 4 核 → 5 个线程）
IO 密集：2 * Ncpu（或更大，取决于等待时间占比）
公式：线程数 = Ncpu * (1 + 等待时间 / 计算时间)
```

**为什么禁止 Executors**：
- `Executors.newCachedThreadPool()`：最大线程数为 Integer.MAX_VALUE，可能创建过多线程导致 OOM
- `Executors.newFixedThreadPool()`：队列为无界 `LinkedBlockingQueue`，请求堆积可能导致 OOM
- **统一使用 `new ThreadPoolExecutor(...)` 手动指定参数**，明确边界

> **常见陷阱**：动态调参使用 `setCorePoolSize()` / `setMaximumPoolSize()` 需结合队列监控。队列满了再扩线程的机制在某些低频突增场景不够灵敏，可结合 `Semaphore` 做前置限流。

> **关联知识点**：线程池 → 虚拟线程对比（池化 vs 按需创建）/ 线程池拒绝策略 → [Spring Cloud Sentinel](java知识规划——spring.md#28-spring-cloud-微服务) 熔断降级 / 线程池隔离 → Hystrix 线程池隔离模式 / 有界队列 → 系统容量规划

---

#### CompletableFuture 异步编排

CompletableFuture 提供了声明式的异步任务编排能力：

```java
// 基础用法
CompletableFuture.supplyAsync(() -> fetchUser(userId), executor)
    .thenApply(user -> enrichUser(user))            // 同步转换
    .thenCompose(enriched -> fetchOrders(enriched))  // 异步 flatMap
    .orTimeout(3, TimeUnit.SECONDS)                  // 超时控制
    .exceptionally(ex -> {
        log.error("处理失败", ex);
        return defaultResult();
    });

// 多个任务并行
CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> findUser(id), executor);
CompletableFuture<Config> configFuture = CompletableFuture.supplyAsync(() -> loadConfig(), executor);

CompletableFuture.allOf(userFuture, configFuture)
    .thenApply(v -> combine(userFuture.join(), configFuture.join()))
    .orTimeout(5, TimeUnit.SECONDS);
```

**核心方法分类**：

| 类别 | 方法 | 说明 |
|------|------|------|
| 同步转换 | `thenApply(Function)` | 对结果同步转换 |
| 异步 flatMap | `thenCompose(Function)` | 返回新的 CompletableFuture，解嵌套 |
| 消费 | `thenAccept(Consumer)` | 消费结果不返回值 |
| 并行等待 | `allOf(CompletableFuture...)` | 所有完成 |
| 任一完成 | `anyOf(CompletableFuture...)` | 任一完成即返回 |
| 超时 | `orTimeout(long, TimeUnit)`（JDK 9+） | 超时异常 |
| 异常恢复 | `exceptionally(Function)` | 异常时提供默认值 |
| 双向组合 | `thenCombine(CompletableFuture, BiFunction)` | 两个结果一起处理 |

> **常见陷阱**：
> - `thenApply` vs `thenCompose`：thenApply 返回的是计算结果，thenCompose 返回的是一个新的 CompletableFuture，用于扁平化
> - `allOf` 返回 `CompletableFuture<Void>`，需要通过 `.join()` 获取各子任务结果
> - 默认使用 `ForkJoinPool.commonPool()`，务必传入自定义线程池

> **关联知识点**：CompletableFuture → 并行流对比 / 异步编排 → [AI Streaming](java知识规划——ai开发.md#56-streaming-流式响应) onNext 回调 / thenCompose → 函数式编程 flatMap / allOf → 并发聚合 / orTimeout → 超时降级模式

---

**追问链**：`synchronized 锁升级全链 → Mark Word 结构 → 偏向锁为什么 JDK 15 默认关闭 → AQS 核心原理 → CLH 队列 → state 含义 → Condition 作用 → 基于 AQS 实现了哪些同步器 → CAS 原理 → ABA 问题 → AtomicStampedReference → volatile 可见性和有序性 → 四种内存屏障 → DCL 为什么要 volatile → 替代方案静态内部类 → ThreadLocal 引用链 → 为什么内存泄漏 → remove 最佳实践 → 线程池 7 参数 → 任务流程 → IO/CPU 密集估算 → 为什么禁止 Executors → CompletableFuture thenApply/thenCompose区别 → allOf 获取结果方式 → 和虚拟线程什么关系 → ChatMemory @MemoryId 和 ThreadLocal 隔离思路的类比`

---

## 1.4 集合框架

覆盖面试最高频的集合类源码分析，重点理解 HashMap 核心机制、线程安全集合的实现演进、以及 LRU 缓存的设计思路。

---

#### Collection 框架概览：List vs Set vs Map

Collection 框架是 Java 集合体系的核心，面试中经常从顶层设计问起，需要清晰掌握三大家族的定位差异。

**继承结构**：

```text
Iterable（可迭代）
  └─ Collection（集合）
       ├─ List（有序、可重复、索引访问）
       │    ├─ ArrayList  ← 动态数组，随机访问 O(1)
       │    └─ LinkedList ← 双向链表，两端操作 O(1)
       ├─ Set（不可重复、无索引）
       │    ├─ HashSet       ← 基于 HashMap，无序，O(1)
       │    ├─ LinkedHashSet ← 基于 LinkedHashMap，插入顺序
       │    └─ TreeSet       ← 基于 TreeMap（红黑树），排序，O(log n)
       └─ Queue（本指南不展开）

Map（key-value 映射，独立于 Collection）
  ├─ HashMap      ← 散列表，无序
  ├─ LinkedHashMap← 散列表+双向链表，可排序/维持顺序
  └─ TreeMap      ← 红黑树，自动排序
```

> **常见陷阱**：Collection（接口） 与 Collections（工具类） 不要混淆——Collections 提供 `sort()`/`unmodifiableList()`/`synchronizedList()` 等静态方法。

---

##### List 接口：有序、可重复、索引访问

**List 三要素**：

| 特性 | 说明 | 面试考点 |
|------|------|---------|
| 有序 | 元素按插入顺序排列 | 插入顺序不是排序 |
| 可重复 | 允许 null 和重复元素 | equals() 判断重复 |
| 索引访问 | 通过 `get(index)` 随机访问 | ArrayList → O(1)，LinkedList → O(n) |

**ArrayList vs LinkedList 选择决策**：

| 维度 | ArrayList | LinkedList |
|------|-----------|------------|
| 底层结构 | 动态数组（Object[]） | 双向链表（Node） |
| 随机访问 get(i) | O(1) — 数组下标直达 | O(n) — 从头/尾遍历 |
| 尾部添加 add(e) | O(1) 均摊（扩容时 O(n)） | O(1) — 链尾追加 |
| 中间插入/删除 | O(n) — 元素位移 | O(n) 查找 + O(1) 断链 |
| 内存占用 | 紧凑（仅存数据） | 更高（每个元素存 prev/next 指针 + 数据） |
| 扩容机制 | 默认 1.5 倍（`grow()` → `newCapacity = oldCapacity + (oldCapacity >> 1)`） | 无需扩容 |

> 面试追问：**ArrayList 扩容后原来的元素怎么处理？** → `Arrays.copyOf()` 调用 `System.arraycopy()` 原生方法复制到新数组，本质上是一个 O(n) 操作。所以如果预知数据量，使用 `new ArrayList<>(initialCapacity)` 指定初始容量可以避免多次扩容。

---

##### Set 接口：不可重复、无索引

**Set 三要素**：

| 特性 | 说明 |
|------|------|
| 不可重复 | 通过 `equals()` 和 `hashCode()` 判重，`add()` 返回 false 表示重复 |
| 无索引 | 没有 `get(index)`——无序结构无法索引 |
| null 值 | HashSet 允许一个 null；TreeSet 不允许 null（会出 NPE） |

**HashSet vs LinkedHashSet vs TreeSet**：

| 维度 | HashSet | LinkedHashSet | TreeSet |
|------|---------|---------------|---------|
| 底层 | HashMap | LinkedHashMap | TreeMap（红黑树） |
| 顺序 | 无序（哈希决定） | 插入顺序 | 自然排序 / Comparator |
| 性能 | O(1) | O(1)（略高，维护双向链表） | O(log n) |
| null | 允许 1 个 | 允许 1 个 | 不允许 |
| 适用 | 默认选择 | 需保持插入顺序 | 需自动排序 |

> **常见陷阱**：Set 判重的关键是 `hashCode()` 和 `equals()` 必须一致（相等的对象必须有相同的 hashCode）。如果只重写 equals 不重写 hashCode，HashSet 会误判为不同元素，允许重复添加。

---

##### HashSet vs HashMap

**最根本的关系**：HashSet 底层就是 HashMap，面试问到 HashSet 的源码时，其实就是在问 HashMap。

```java
// HashSet 核心源码 —— 一个包装
public class HashSet<E> {
    // 核心：HashSet 内部持有 HashMap 实例
    private transient HashMap<E, Object> map;

    // PRESENT 是一个静态占位对象，value 永远是它
    private static final Object PRESENT = new Object();

    public HashSet() {
        map = new HashMap<>();           // 初始化一个 HashMap
    }

    public boolean add(E e) {
        return map.put(e, PRESENT) == null;  // 元素作为 key，PRESENT 作为 value
    }

    public boolean remove(Object o) {
        return map.remove(o) == PRESENT;
    }

    public boolean contains(Object o) {
        return map.containsKey(o);       // 利用 HashMap 的 O(1) 查找
    }

    public int size() {
        return map.size();
    }
}
```

| 对比维度 | HashMap | HashSet |
|---------|---------|---------|
| 存储内容 | key-value 键值对 | 单个元素（内部作为 HashMap 的 key） |
| 底层实现 | 数组+链表+红黑树 | 直接使用 HashMap 实例 |
| 重复判断 | key 重复 → 覆盖 value | add 重复 → 返回 false |
| null 支持 | 一个 null key，多个 null value | 允许一个 null 元素 |
| 使用场景 | 键值映射 | 唯一元素集合 |

> **一句话记法**：HashSet 就是"假装自己没有 value 的 HashMap"——元素作为 key，value 统一用一个占位常量 PRESENT。

> **关联知识点**：HashSet → HashMap 继承体系 / Set 判重 → equals + hashCode 契约 / TreeSet → 红黑树 / LinkedHashSet → LinkedHashMap

---

#### HashMap：put/get 全流程与 JDK 7 vs 8

**数据结构演进**：

| 维度 | JDK 7 | JDK 8 |
|------|-------|-------|
| 底层结构 | 数组 + 链表 | 数组 + 链表 + 红黑树 |
| 插入方式 | 头插法 | 尾插法 |
| 哈希算法 | 9次扰动（4次位运算 + 5次异或） | 1次扰动（高位异或） |
| 树化 | 不支持 | 链表长度 >= 8 转红黑树 |
| 扩容 rehash | 重新计算 hash | 原位置 or 原位置 + oldCap |

**put 方法全流程**（JDK 8）：

```java
// HashMap.put 方法核心逻辑（简化）
public V put(K key, V value) {
    Node<K,V>[] tab; Node<K,V> p; int n, i; K k; V e;

    // 1. 计算 hash：key.hashCode() 高 16 位与低 16 位异或
    int h = (key == null) ? 0 : key.hashCode();
    int hash = (key == null) ? 0 : h ^ (h >>> 16);

    // 2. 数组为空 → 扩容（resize）
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;

    // 3. 计算桶下标：(n - 1) & hash
    // 4. 桶为空 → 直接插入
    if ((p = tab[i = (n - 1) & hash]) == null)
        tab[i] = newNode(hash, key, value, null);
    else {
        // 5. 桶不为空 → 遍历链表/红黑树
        if (p.hash == hash && ((k = p.key) == key || (key != null && key.equals(k))))
            e = p;  // 找到相同 key → 覆盖
        else if (p instanceof TreeNode)
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
        else {
            for (int binCount = 0; ; ++binCount) {
                // 尾插法追加到链表末尾
                if ((e = p.next) == null) {
                    p.next = newNode(hash, key, value, null);
                    // 链表长度 >= 8 时树化
                    if (binCount >= TREEIFY_THRESHOLD - 1)
                        treeifyBin(tab, hash);
                    break;
                }
                if (e.hash == hash && ((k = e.key) == key || (key != null && key.equals(k))))
                    break;
                p = e;
            }
        }
    }
    // 6. 键值对数量 > threshold（容量 * 负载因子）→ 扩容
    if (++size > threshold)
        resize();
}
```

**get 流程**：计算 hash → 定位桶 → 检查第一个节点 → 红黑树查找 → 链表遍历。

**为什么容量是 2 的幂**：

- 计算桶下标使用 `(n - 1) & hash` 替代 `hash % n`，位运算远快于取模
- 当 `n = 2^k` 时，`(n - 1) & hash` 等价于 `hash % n`
- 扩容后，元素要么在原位置（高位为 0），要么在原位置 + oldCap（高位为 1），rehash 时直接通过新增高位判断，无需重新计算 hash

**负载因子为什么是 0.75**：

- 时间与空间的折中。负载因子越大（如 0.9），空间利用率高但冲突概率增加、查询效率下降；负载因子越小（如 0.5），冲突少但扩容频繁、空间浪费
- 在负载因子 0.75 的条件下，每个桶的节点数近似服从泊松分布（λ ≈ 0.5），一个桶中出现 8 个以上节点的概率约为 0.00000006，因此红黑树化阈值设为 8 是合理的

**红黑树化 / 退化条件**：

| 条件 | 动作 | 原因 |
|------|------|------|
| 链表长度 >= 8（且数组长度 >= 64）| 树化 | 链表查询 O(n) 退化严重 |
| 链表长度 >= 8（数组长度 < 64）| 扩容而非树化 | 短数组下扩容比树化收益更高 |
| 树节点数 <= 6 | 退化为链表 | 避免树与链表频繁转换的开销 |

**JDK 7 头插法死循环**：

多线程场景下，JDK 7 的 `resize()` 使用头插法迁移元素，扩容后两个线程同时操作导致环形链表：

```text
线程 A 迁移：e → A → B → C（正常）
线程 B 并发扩容：头插法倒序迁移
结果：A.next = B, B.next = A（环形链表）
后续 get(key) 遍历链表 → 死循环
```

JDK 8 改为尾插法 + 扩容后元素相对位置不变（高位为 0 留在原位置，高位为 1 移到 oldCap+原位置），从根本上解决了死循环问题（但 HashMap 仍不支持并发，并发请用 ConcurrentHashMap）。

> **常见陷阱**：
> - HashMap 的 key 可变时（如放入后修改对象字段），hashCode 变化导致再也无法 get 到
> - null key 存储在 table[0]，null value 允许
> - 红黑树化条件中的 `MIN_TREEIFY_CAPACITY = 64` 经常被忽略
> - JDK 8 修复了死循环但不代表 HashMap 线程安全

> **关联知识点**：HashMap → ConcurrentHashMap（线程安全）/ 红黑树 → 数据结构 / 2 的幂扩容 → 位运算优化 / 负载因子 → 哈希表设计原理

---

#### ConcurrentHashMap：JDK 7 Segment → JDK 8 CAS+synchronized

| 维度 | JDK 7 | JDK 8 |
|------|-------|-------|
| 同步机制 | Segment（继承 ReentrantLock）分段锁 | CAS + synchronized 锁桶首节点 |
| 锁粒度 | 默认 16 个 Segment，并发度 16 | 单个桶（可扩容到数千桶），并发度更高 |
| 定位 | 两次哈希（Segment → 桶） | 一次哈希（直接定位桶） |
| 查询性能 | 读操作不加锁但使用 volatile | 读操作不加锁（Node.val 和 next 均为 volatile）|
| 扩容 | Segment 内部独立扩容 | 多线程协助扩容（TransferTask） |

**JDK 8 put 流程**：

```java
// ConcurrentHashMap.putVal（JDK 8，简化）
final V putVal(K key, V value, boolean onlyIfAbsent) {
    for (Node<K,V>[] tab = table;;) {
        // 1. 桶为空 → CAS 无锁插入
        if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
            if (casTabAt(tab, i, null, new Node<K,V>(hash, key, value)))
                break;  // CAS 成功即完成，无需加锁
        }
        // 2. 正在扩容 → 协助迁移（ForwardingNode）
        else if ((fh = f.hash) == MOVED)
            tab = helpTransfer(tab, f);
        // 3. 桶非空 → synchronized 锁桶首节点
        else {
            synchronized (f) {
                // 插入链表或红黑树
            }
        }
    }
}
```

**size() 统计 —— CounterCell**：

- 维护一个 `baseCount` 和 `CounterCell[]` 数组
- 低竞争时 CAS 更新 `baseCount`；CAS 失败时更新 `CounterCell` 中随机位置的计数
- `size()` 调用时求和 `baseCount + sum(CounterCell[])`，避免全局加锁

> **常见陷阱**：
> - JDK 8 的 size() 是一个近似值（弱一致性），不是精确值
> - ConcurrentHashMap 的迭代器是弱一致性（weakly consistent），迭代过程中修改不会抛 `ConcurrentModificationException`
> - 不支持 `null` key 和 `null` value

> **关联知识点**：ConcurrentHashMap → CAS / synchronized / 红黑树 → 数据结构 / ForwardingNode → 扩容迁移设计

---

#### CopyOnWriteArrayList：读写分离

**写时复制机制**：

```java
// CopyOnWriteArrayList.add 核心
public boolean add(E e) {
    final ReentrantLock lock = this.lock;
    lock.lock();  // 写操作加锁
    try {
        Object[] elements = getArray();
        int len = elements.length;
        Object[] newElements = Arrays.copyOf(elements, len + 1);  // 复制新数组
        newElements[len] = e;
        setArray(newElements);  // 替换引用
    } finally {
        lock.unlock();
    }
}

// 读操作不加锁
public E get(int index) {
    return getArray()[index];  // 直接读数组引用
}
```

**核心特点**：
- 读操作完全无锁，性能极高
- 写操作复制完整新数组（内存开销翻倍），适合读多写少场景
- 迭代器基于创建时的数组快照，遍历过程中修改不可见（弱一致性）

| 特性 | CopyOnWriteArrayList | Vector | Collections.synchronizedList |
|------|---------------------|--------|------------------------------|
| 读性能 | 高（无锁） | 低（synchronized） | 低（synchronized） |
| 写性能 | 低（数组复制） | 中 | 中 |
| 一致性 | 弱（快照读） | 强（互斥） | 强（互斥） |
| 适用场景 | 读多写少（配置/黑名单） | 已淘汰 | 简单同步 |

**为什么没有 ConcurrentArrayList**：因为 ArrayList 的随机访问是基于数组下标的精确位置，无法像 ConcurrentHashMap 那样分桶加锁而不破坏语义。ConcurrentHashMap 能分桶是因为键值对通过对 key 哈希分散到不同桶，换句话说是**哈希表的分桶特性天然支持分段并发**。

> **常见陷阱**：
> - 批量写入场景性能极差（每次 add 复制整个数组），考虑使用 `addAllAbsent()` 批量操作
> - 写操作不应放在热点路径上
> - 迭代器不反映最新数据，长时间持有迭代器可能导致读取到过时数据

> **关联知识点**：CopyOnWriteArrayList → ConcurrentHashMap 对比（为什么后者能做分段） / 读写分离思想 → 数据库读写分离设计 / 弱一致性 → 并发集合整体设计思路

---

#### LinkedHashMap 实现 LRU 缓存

LinkedHashMap 继承了 HashMap，在 Entry 中增加了 `before/after` 双向链表来维护元素顺序：

```java
// 实现 LRU 缓存 —— 模板方法模式
public class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private final int maxCapacity;

    public LRUCache(int maxCapacity) {
        // accessOrder=true：访问顺序（不是插入顺序）
        super(maxCapacity, 0.75f, true);
        this.maxCapacity = maxCapacity;
    }

    // removeEldestEntry 在每次 put() 后回调
    // 返回 true 时移除最久未访问的条目（链表头部）
    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > maxCapacity;
    }
}
```

**关键机制**：
- `accessOrder=true`：每次 `get()` 或 `put()` 已有 key 时，将该 Entry 移动到链表尾部（最近访问）
- `put()` 完成后回调 `removeEldestEntry()`，决定是否移除链表头部 Entry（最久未访问）
- 配合 `final` 方法 + `afterNodeAccess()` / `afterNodeInsertion()` 钩子（模板方法模式）

LinkedHashMap 本身不是线程安全的，LRU 缓存在多线程场景下需配合 `Collections.synchronizedMap()` 或使用 `ReentrantLock`。

> **常见陷阱**：
> - accessOrder 是构造器第三个参数，默认 false（插入顺序）
> - removeEldestEntry 只在 put/putAll 后回调，get 不会触发移除
> - 线程安全需要外层加锁

> **关联知识点**：LinkedHashMap → HashMap 继承体系 / 模板方法 → 设计模式 / LRU → 缓存淘汰策略（Redis、Guava Cache 的相似思路）

---

**追问链**：`Collection 框架结构 → List vs Set vs Map 三大家族 → ArrayList vs LinkedList 选择（随机访问 O(1) vs O(n)，两端插入 O(1) vs O(n)）→ 扩容机制 1.5 倍 → HashSet vs LinkedHashSet vs TreeSet → Set 判重必须 equals+hashCode 一致 → HashSet 底层是 HashMap → add(e)→map.put(e,PRESENT) → HashMap put 流程 → 为什么 2 的幂扩容 → 为什么负载因子 0.75 → 红黑树化条件 8 退化 6 → JDK 7 头插死循环原因 → ConcurrentHashMap JDK 7 Segment 分段锁 → JDK 8 CAS+synchronized → size() CounterCell 统计 → CopyOnWriteArrayList 读写分离 → 写时复制内存开销 → 为什么没有 ConcurrentArrayList → LinkedHashMap accessOrder 实现 LRU → removeEldestEntry 模板方法 → 线程安全 LRU 怎么保证`

---

## 1.5 NIO 与 Netty

IO 模型演进是面试中的进阶话题，重点理解多路复用的本质（一个线程管理多个连接）、Netty 对 Reactor 模型的实现、以及零拷贝的性能优化思路。

---

#### BIO → NIO → AIO 演进

| 维度 | BIO | NIO | AIO |
|------|-----|-----|-----|
| 全称 | Blocking I/O | Non-blocking I/O | Asynchronous I/O |
| 模型 | 阻塞同步 | 非阻塞同步（多路复用） | 非阻塞异步 |
| 线程模型 | 一个连接一个线程 | Selector 线程管理多 Channel | 回调 / Future |
| 连接数 | 连接数受限（受线程数限制）| 可管理数千连接 | 可管理数万连接 |
| Linux 实现 | 无特殊 | select/poll/epoll | 基于 epoll 模拟 |
| 适用场景 | 连接数少、固定 | 连接数多、IO 密集 | 连接极大、长连接 |

**关键演进逻辑**：BIO 每连接一个线程 → 连接增多导致线程膨胀 → NIO 引入 Selector 一个线程轮询多连接 → 回调式 AIO 进一步解放线程（但 Linux 平台 AIO 实现不成熟，实际高性能网络编程主要用 NIO + Reactor）

---

#### Selector 与 epoll

**select / poll / epoll 对比**：

| 特性 | select | poll | epoll |
|------|--------|------|-------|
| 数据结构 | 位图（fd_set） | 链表（pollfd 数组） | 事件表（红黑树 + 就绪链表）|
| 最大连接数 | 1024（FD_SETSIZE） | 无上限 | 无上限 |
| 遍历方式 | 线性 O(n) 扫描 | 线性 O(n) 扫描 | 回调 O(1) 通知 |
| 内核-用户复制 | 每次调用复制整个 fd_set | 每次调用复制 pollfd 数组 | 通过 mmap 共享内存减少拷贝 |
| 触发方式 | 水平触发 | 水平触发 | 水平 + 边缘触发 |
| 就绪事件通知 | 需要遍历所有 fd | 需要遍历所有 fd | 只返回就绪的 fd（回调注册）|

**水平触发（Level-Triggered, LT）**：只要 fd 有数据未读取，每次 `epoll_wait` 都会返回该 fd。
**边缘触发（Edge-Triggered, ET）**：仅在 fd 状态变化时通知一次（如从不可读变为可读），应用程序必须一次性读完所有数据。

```text
水平触发：缓冲区有数据 → 每次 select 都通知
         只读一部分 → 下次 select 继续通知（可能重复通知）

边缘触发：缓冲区从空→有数据 → 通知一次
         只读一部分 → 不再次通知（必须一次读完，否则丢失数据）
```

> **常见陷阱**：Netty 默认使用水平触发（`Selector` 默认 LT），边缘触发需要手动配置且实现难度高（需要循环 read 直到 EAGAIN），实际生产环境很少使用 ET。

> **关联知识点**：epoll O(1) → Reactor 事件驱动 / mmap → 零拷贝思路异曲同工 / 水平触发 → Spring MVC 事件循环类似的"轮询就绪"

---

#### Netty Reactor 模型三阶段

Netty 是对 Reactor 模式的完整实现，通过 `EventLoopGroup` 的参数配置支持三种形态：

**阶段一：单线程 Reactor**

```java
EventLoopGroup bossGroup = new NioEventLoopGroup(1);
// 单个 EventLoop 同时负责 accept 和 IO 读写
// 适用：吞吐量不高的小型应用
// 问题：单线程处理所有事件，一个 handler 阻塞拖垮所有
```

**阶段二：多线程 Reactor**

```java
EventLoopGroup bossGroup = new NioEventLoopGroup(1);    // accept 线程
EventLoopGroup workerGroup = new NioEventLoopGroup();    // IO 线程池
// accept 线程接收连接 → workerGroup 处理读写
```

**阶段三：主从多线程 Reactor**

```java
EventLoopGroup bossGroup = new NioEventLoopGroup();     // 多个 accept 线程
EventLoopGroup workerGroup = new NioEventLoopGroup();    // IO 线程池
// 多个 accept 线程处理连接建立（避免单 accept 线程成为瓶颈）
// 大规模场景（如百万连接）使用
```

| 模型 | Boss Group | Worker Group | 适用场景 |
|------|-----------|-------------|---------|
| 单线程 | 1 线程 = accept + IO | 无（共用一个线程）| 原型开发、低负载 |
| 多线程 | 1 线程（accept 专用） | 多线程（IO 读写） | 生产环境标准配置 |
| 主从多线程 | 多线程（accept） | 多线程（IO 读写） | 高并发、百万连接 |

---

#### EventLoop 线程绑定与 ioRatio

**线程绑定机制**：
- 每个 `EventLoop` 创建时绑定一个 `Thread`（`SingleThreadEventExecutor`），绑定后永不改变
- 一个 `EventLoop` 可以处理多个 `Channel`（通过 Selector 多路复用）
- `EventLoopGroup` 管理多个 `EventLoop`，`Channel` 注册时通过轮询（`PowerOfTwoEventExecutorChooser`）分配一个 `EventLoop`

**ioRatio 控制**：

EventLoop 的工作循环：
```text
loop {
    select();           // 轮询 IO 事件
    processSelectedKeys();  // 处理 IO 事件
    runAllTasks();      // 处理 TaskQueue 中的异步任务
}
```

`ioRatio` 控制 IO 处理与任务执行的时间比例，**默认值 50**：
- `ioRatio = 50`（默认）：IO 处理时间和任务执行时间大致各占一半
- `ioRatio = 100`：不限制，任务队列清空后再进入下一次 select
- **不要阻塞 EventLoop**：EventLoop 是单线程执行，如果在 EventLoop 中执行耗时操作（数据库查询、远程调用），会导致该 EventLoop 上的所有 Channel 无法处理 IO 事件

```java
// 正确的做法：将耗时操作提交到业务线程池
ChannelHandler handler = new ChannelInboundHandlerAdapter() {
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        // 不要在执行 EventLoop 中阻塞
        businessExecutor.submit(() -> {
            String result = jdbcTemplate.query(...);
            ctx.writeAndFlush(result);
        });
    }
};
```

**零拷贝实现**（Netty）：

Netty 零拷贝不同于 OS 级别的零拷贝（如 `sendfile`），是指用户态的数据拷贝优化：

| 机制 | 说明 | 避免的拷贝 |
|------|------|-----------|
| `FileRegion.transferTo()` | 底层调用 `FileChannel.transferTo()` → OS sendfile | 内核态 → 用户态拷贝 |
| `CompositeByteBuf` | 组合多个 ByteBuf 为逻辑视图，不合并物理内存 | 多缓冲区合并时的拷贝 |
| `Unpooled.wrappedBuffer()` | 包装 byte[] 为 ByteBuf，不复制数据 | byte[] → ByteBuf 拷贝 |
| `Direct Buffer`（堆外内存）| 避免 IO 读写时的堆内 → 堆外拷贝 | 堆内 ↔ 堆外拷贝 |

```java
// 零拷贝文件传输
RandomAccessFile file = new RandomAccessFile("large.zip", "r");
FileRegion region = new DefaultFileRegion(file.getChannel(), 0, file.length());
ctx.writeAndFlush(region);  // 直接通过 sendfile 发送，无需拷贝到用户空间
```

> **常见陷阱**：
> - EventLoop 中不要执行阻塞任务，会饿死该 EventLoop 上所有 Channel 的 IO
> - ioRatio 控制的是相对比例，非精确时间片
> - Netty 的零拷贝不等于 OS 零拷贝，两者概念层次不同

> **关联知识点**：Reactor → 事件驱动设计模式 / Selector → Spring MVC DispatcherServlet 同是事件驱动 / ByteBuf 零拷贝 → CompositeByteBuf 组合模式 / EventLoop → 线程模型设计

---

**追问链**：`BIO 与 NIO 区别 → Selector 多路复用原理 → select/poll/epoll 区别 → epoll 为什么 O(1) → mmap 共享内存优化 → 水平触发 vs 边缘触发 → Netty Reactor 模型三种形态 → 单线程瓶颈 → 多线程分离 IO → 主从分离连接建立 → EventLoop 线程绑定机制 → ioRatio 默认值 50 → 为什么不要阻塞 EventLoop → Netty 零拷贝四种实现 → FileRegion transferTo → 和 OS sendfile 的关系`

---

## 1.6 设计模式

设计模式在面试中的考察方式有两类：一是手写模式代码（单例、代理），二是识别 Spring 框架中应用的模式。重点掌握 JDK 动态代理和 CGLIB 的底层区别，这是后续 [Spring AOP](java知识规划——spring.md#22-spring-aop)、[MyBatis MapperProxy](java知识规划——mybatis.md#32-mapper-接口代理原理jdk-动态代理) 和 [AiServices](java知识规划——ai开发.md#51-核心架构与-aiservices) 代理机制共同的理论基础。

---

#### JDK 动态代理 vs CGLIB

| 对比维度 | JDK 动态代理 | CGLIB 代理 |
|---------|-------------|-----------|
| 原理 | 反射 + InvocationHandler | ASM 字节码增强生成子类 |
| 前提 | 目标对象必须实现接口 | 目标类不能是 final |
| 代理对象 | 实现目标接口的代理类实例 | 目标类的子类实例 |
| 限制 | 只能代理接口中的方法 | final 类 / final 方法不可代理 |
| 性能（JDK 8+）| 优于 CGLIB（反射优化） | 略低于 JDK 代理 |
| Spring AOP 策略 | 目标有接口 → 默认 JDK 代理 | 无接口 / `proxyTargetClass=true` |

```java
// JDK 动态代理
public class JdkProxyHandler implements InvocationHandler {
    private final Object target;

    public JdkProxyHandler(Object target) {
        this.target = target;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        System.out.println("JDK Proxy before: " + method.getName());
        Object result = method.invoke(target, args);  // 反射调用
        System.out.println("JDK Proxy after");
        return result;
    }

    @SuppressWarnings("unchecked")
    public static <T> T createProxy(T target) {
        return (T) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces(),
            new JdkProxyHandler(target)
        );
    }
}

// 使用前提：UserService 必须是接口
public interface UserService {
    void createUser(String name);
}
UserService proxy = JdkProxyHandler.createProxy(new UserServiceImpl());
proxy.createUser("Alice");
```

```java
// CGLIB 动态代理
public class CglibInterceptor implements MethodInterceptor {
    private final Object target;

    public CglibInterceptor(Object target) {
        this.target = target;
    }

    @Override
    public Object intercept(Object obj, Method method, Object[] args,
                            MethodProxy proxy) throws Throwable {
        System.out.println("CGLIB before: " + method.getName());
        Object result = proxy.invoke(target, args);  // 通过 MethodProxy 调用（非反射）
        System.out.println("CGLIB after");
        return result;
    }

    @SuppressWarnings("unchecked")
    public static <T> T createProxy(T target) {
        return (T) Enhancer.create(
            target.getClass(),
            new CglibInterceptor(target)
        );
    }
}

// 不要求接口（直接用类）
UserServiceImpl proxy = CglibInterceptor.createProxy(new UserServiceImpl());
proxy.createUser("Alice");
```

**Spring AOP 代理选择策略**：
```java
@EnableAspectJAutoProxy
  → AnnotationAwareAspectJAutoProxyCreator
  → 检查目标类是否实现接口？
      ├─ 是 → JDK 动态代理（默认）
      └─ 否 → CGLIB 代理
  → 若 proxyTargetClass=true → 强制 CGLIB
```

> **常见陷阱**：
> - JDK 8+ JDK 动态代理性能已超越 CGLIB，面试中不要背"CGLIB 性能更好"的旧结论
> - CGLIB 通过 `MethodProxy.invoke()` 调用（FastClass 机制），非反射调用，这是其性能优势点
> - 自调用带来的 AOP 失效：代理对象.方法A() → 方法A 内部调用 this.方法B() → 走的不是代理对象 → AOP 失效

> **关联知识点**：JDK Proxy → [Spring AOP](java知识规划——spring.md#22-spring-aop) → [MyBatis MapperProxy](java知识规划——mybatis.md#32-mapper-接口代理原理jdk-动态代理) → [AiServices](java知识规划——ai开发.md#51-核心架构与-aiservices) 构成"四代代理"面试高频链

---

#### 单例模式：DCL vs 静态内部类 vs 枚举

| 实现方式 | 线程安全 | 懒加载 | 序列化安全 | 反射攻击 |
|---------|---------|--------|-----------|---------|
| DCL + volatile | 是（volatile 禁止重排）| 是 | 否（需重写 readResolve）| 可反射破坏 |
| 静态内部类 | 是（类加载机制）| 是 | 否 | 可反射破坏 |
| 枚举 | 是（JVM 保证）| 否（类加载即实例化） | 是（JVM 保证）| 否（反射无法创建枚举）|

**DCL + volatile**：

```java
public class Singleton {
    private static volatile Singleton instance;  // volatile 禁止指令重排

    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {                  // 第一次检查（无锁）
            synchronized (Singleton.class) {
                if (instance == null) {          // 第二次检查（有锁）
                    instance = new Singleton();  // ①分配内存 ②初始化对象 ③赋值引用
                }
            }
        }
        return instance;
    }
}
```

为什么需要 volatile：`instance = new Singleton()` 在 JIT 编译后可能被重排为 `① → ③ → ②`，线程 B 在第 ③ 步执行后读到非 null 的 instance 但对象尚未初始化。

**静态内部类**（推荐的方式）：

```java
public class Singleton {
    private Singleton() {}

    private static class Holder {
        static final Singleton INSTANCE = new Singleton();
        // JVM 类加载机制保证：类加载阶段静态变量初始化是线程安全的
        // 类加载是延迟的，只有调用 getInstance() 时 Holder 才被加载
    }

    public static Singleton getInstance() {
        return Holder.INSTANCE;
    }
}
```

**枚举**（最安全的单例）：

```java
public enum Singleton {
    INSTANCE;
    // JVM 保证枚举实例化只发生一次
    // 反射 Constructor.newInstance() 对枚举类型直接抛异常
    // 序列化机制自动处理枚举单例（反序列化不会创建新实例）
}
```

> **常见陷阱**：
> - DCL 中不加 volatile 可能导致拿到未初始化完成的半成品对象
> - 静态内部类虽然不用 volatile，但构造函数中不应依赖其他 Bean 的复杂初始化逻辑（类加载时执行）
> - 枚举单例无法懒加载，类加载时就初始化

> **关联知识点**：DCL volatile → volatile 内存屏障 / 静态内部类 → 类加载机制 / 枚举单例 → 反射安全 / [Spring Bean 默认单例](java知识规划——spring.md#21-spring-ioc-容器) → Spring IoC

---

#### 设计模式在 Spring 中的具体应用

| 模式 | Spring 中的实现 | 核心场景 |
|------|---------------|---------|
| **工厂模式** | `BeanFactory.getBean()`、`FactoryBean<T>` | IoC 容器管理对象创建，屏蔽创建逻辑的复杂性 |
| **策略模式** | `ResourceLoader`（多种 Resource 解析策略）、`AuthenticationProvider`（多种认证方式）| 同一行为的不同实现算法可互相替换 |
| **模板方法** | `JdbcTemplate`、`RestTemplate`、`TransactionTemplate` | 固定步骤骨架 + 子类/回调实现可变部分 |
| **观察者模式** | `ApplicationListener` + `ApplicationEvent`、`@EventListener` | 容器事件发布与监听（解耦事件产生与消费）|
| **责任链模式** | `HandlerInterceptor`（preHandle/postHandle/afterCompletion）、`FilterChain`（Servlet Filter） | 多个处理器依次处理请求，每个处理器决定是否继续 |

**模板方法的典型应用 —— JdbcTemplate**：

```java
// JdbcTemplate.query() 的骨架逻辑
// ① 获取连接
// ② 创建 Statement
// ③ 执行 SQL
// ④ 遍历 ResultSet ← 回调（RowMapper 由调用者提供）
// ⑤ 关闭资源

jdbcTemplate.query("SELECT * FROM user WHERE age > ?",
    new Object[]{18},
    (rs, rowNum) -> new User(rs.getLong("id"), rs.getString("name"))
);
```

**观察者模式 —— Spring 事件**：

```java
// 事件
public class OrderCreatedEvent extends ApplicationEvent {
    public OrderCreatedEvent(Long orderId) { super(orderId); }
}

// 监听器（观察者）
@Component
public class EmailNotificationListener {
    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        // 发送邮件通知 —— 与下单逻辑解耦
    }
}

// 发布事件
applicationEventPublisher.publishEvent(new OrderCreatedEvent(orderId));
```

**责任链模式 —— 拦截器**：

```java
@Component
public class AuthInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                             Object handler) {
        // 鉴权逻辑，返回 false 终止链路
        String token = request.getHeader("Authorization");
        if (token == null) {
            response.setStatus(401);
            return false;
        }
        return true;  // 继续下一拦截器
    }
}
```

> **常见陷阱**：
> - 策略模式与状态模式的区别：策略模式客户端选择算法，状态模式状态自动切换行为
> - 模板方法 vs 回调：模板方法通过继承重写抽象方法，回调通过 Lambda/匿名类提供实现
> - 观察者模式中事件监听器的执行默认是同步的（publishEvent 调用线程阻塞），需要异步监听需加 `@Async`

> **关联知识点**：JDK Proxy → [Spring AOP](java知识规划——spring.md#22-spring-aop) / 策略模式 → [AiServices 多模型切换](java知识规划——ai开发.md#52-模型集成与-embedding) / 观察者模式 → [TokenStream 流式回调](java知识规划——ai开发.md#56-streaming-流式响应) / 工厂模式 → BeanFactory

---

**追问链**：`JDK Proxy 和 CGLIB 区别 → JDK Proxy 的原理（InvocationHandler + 反射）→ CGLIB 的原理（ASM + MethodProxy）→ 为什么 Spring AOP 默认用 JDK Proxy → 什么时候回退到 CGLIB → 强制 CGLIB 怎么配置（proxyTargetClass=true）→ JDK 8+ 两者性能对比 → DCL 为什么需要 volatile → 静态内部类为什么线程安全 → 枚举单例为什么防反射 → Spring 中用了哪些设计模式 → 工厂（BeanFactory）→ 策略（ResourceLoader）→ 模板方法（JdbcTemplate）→ 观察者（ApplicationEvent）→ 责任链（Interceptor）→ MyBatis MapperProxy 代理原理 → 和 AiServices 动态代理的同源关系`
