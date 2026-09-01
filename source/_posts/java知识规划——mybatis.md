---
title: "java知识规划——mybatis"
date: "2026-07-11 15:00"
updated: "2026-07-23 11:15"
tags: [java, mybatis, interview, guide, java面试, research]
description: "MyBatis 核心机制面试知识规划，覆盖 SQL 参数绑定、Mapper 接口代理原理、SqlSession 生命周期、缓存机制、动态 SQL、插件机制、MyBatis-Plus、分页原理、延迟加载、ResultMap 高级映射十大模块。"
version: 0.1.0
author: ziogn
aliases: [MyBatis面试, MyBatis核心机制, MyBatis-Plus]
---


# java知识规划——mybatis

> 本文档覆盖面试权重 15% 的 MyBatis 知识体系。从 SQL 参数绑定到高级映射逐层递进。每节末尾标注与 [Java 核心](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/)、[Spring 生态](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94spring/) 及 [MySQL](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94mysql/) 方向的知识关联。

---

## 3.1 `#{}` vs `${}` 及 SQL 注入防范

**一句话原理**：`#{}` 走预编译（PreparedStatement + `?` 占位符），参数由 TypeHandler 安全设置，防 SQL 注入；`${}` 直接字符串替换拼接，仅用于表名/列名等动态标识符。

---

#### 预编译机制

`#{}` 在 MyBatis 解析阶段被替换为 `?`，由 JDBC 的 `PreparedStatement.setXxx(index, value)` 安全设置：

```xml
<!-- XML 映射 -->
<select id="findByUsername" resultType="User">
    SELECT * FROM user WHERE username = #{username}
</select>
```

MyBatis 解析后的 SQL 日志：

```text
==> Preparing: SELECT * FROM user WHERE username = ?
==> Parameters: alice(String)
```

`${}` 直接拼接到 SQL 字符串中：

```xml
<select id="findByField" resultType="User">
    SELECT * FROM user ORDER BY ${sortField} ${sortDir}
</select>
```

**核心区别对比**：

| 维度 | `#{}` | `${}` |
|------|-------|-------|
| 底层机制 | PreparedStatement `?` 占位符 | 字符串直接替换 |
| SQL 注入风险 | 无 | 有 |
| 适用场景 | 所有参数值 | 表名、列名、ORDER BY、LIKE 部分片段 |
| 类型转换 | TypeHandler 自动处理 | 需手动转换 |
| 性能 | 预编译一次可复用执行计划 | 每次重新编译 |

> **常见陷阱**：`ORDER BY ${sortField}` 必须用 `${}`，但需要对 `sortField` 做白名单校验（只允许预定义的列名集合）。`${}` 出现在任何用户输入驱动的场景都是安全隐患。

> **关联知识点**：PreparedStatement → JDBC 基础 / SQL 注入 → 预编译安全设计

---

**追问链**：`#{} 预编译原理 → PreparedStatement 占位符 → SQL 注入攻击原理 → TypeHandler 类型转换 → ${} 适用场景 → 表名列名白名单校验 → LIKE 查询正确写法`

---

## 3.2 Mapper 接口代理原理（JDK 动态代理）

**一句话原理**：MyBatis 通过 JDK 动态代理为 Mapper 接口生成代理对象（`$Proxy`），`MapperProxy.invoke()` 拦截方法调用，缓存 `MapperMethod`，转发到 `SqlSession` 执行 SQL。

---

#### 核心源码链路

```text
Mapper interface.method()
  → MapperProxy.invoke()                    [JDK 动态代理入口]
  → MapperMethod.execute()                  [SQL 类型分发]
  → SqlSession.selectOne/insert/update      [执行器入口]
  → Executor → StatementHandler             [参数绑定 + SQL 执行]
  → TypeHandler → ResultSetHandler          [结果映射]
```

**MapperProxyFactory 工厂模式**：

```java
public class MapperProxyFactory<T> {
    private final Class<T> mapperInterface;

    @SuppressWarnings("unchecked")
    protected T newInstance(MapperProxy<T> mapperProxy) {
        return (T) Proxy.newProxyInstance(
            mapperInterface.getClassLoader(),
            new Class[] { mapperInterface },
            mapperProxy
        );
    }
}
```

#### 与 Spring AOP 代理的同源对比

| 对比维度 | MyBatis Mapper 代理 | Spring AOP JDK 代理 |
|---------|-------------------|-------------------|
| 目标 | Mapper 接口 → SQL 执行 | 业务接口 → AOP 增强 |
| InvocationHandler | `MapperProxy` | `JdkDynamicAopProxy` |
| 工厂 | `MapperProxyFactory` | `ProxyFactory` |
| 缓存 | `methodCache` 缓存 `MapperMethod` | `MethodInterceptor` 链 |
| 创建时机 | `sqlSession.getMapper()` | `BeanPostProcessor.postProcessAfterInitialization` |

> **常见陷阱**：Mapper 接口方法不能重载（方法名 + namespace 必须唯一）。namespace 必须与 Mapper 接口的全限定名一致。

> **关联知识点**：JDK 动态代理 → [核心 设计模式](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#16-设计模式) → [Spring AOP](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94spring/#22-spring-aop) → [AiServices](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94ai%E5%BC%80%E5%8F%91/#51-核心架构与-aiservices) 构成"四代代理"面试高频链

---

**追问链**：`Mapper 接口无实现类 → JDK 动态代理原理 → MapperProxyFactory 创建代理 → MapperProxy 缓存 MapperMethod → MapperMethod SQL 类型分发 → namespace 匹配规则 → 与 Spring AOP 同源对比`

---

## 3.3 SqlSessionFactory / SqlSession 生命周期

**一句话原理**：`SqlSessionFactoryBuilder`（方法级别）→ `SqlSessionFactory`（应用单例）→ `SqlSession`（线程私有，请求/方法级别，必须 close）。

---

| 组件 | 作用域 | 线程安全 | 说明 |
|------|-------|---------|------|
| `SqlSessionFactoryBuilder` | 方法级别 | 是 | 解析 XML 构建工厂，用完即弃 |
| `SqlSessionFactory` | 应用级别 | 是 | 代表数据库连接池，整个应用一个实例 |
| `SqlSession` | 请求/方法级别 | **否** | 每个线程独立实例，finally 中必须关闭 |

**正确用法**：

```java
try (SqlSession session = sqlSessionFactory.openSession()) {
    UserMapper mapper = session.getMapper(UserMapper.class);
    User user = mapper.findById(1L);
    session.commit();
}
```

**Spring 整合的 SqlSessionTemplate**：MyBatis-Spring 通过 `SqlSessionTemplate` 管理 SqlSession，核心思路是 ThreadLocal。`SqlSessionUtils.getSqlSession()` 从 ThreadLocal 获取或创建当前线程的 SqlSession，方法结束时归还而非直接关闭。

> **常见陷阱**：SqlSession 非线程安全 → 多线程共享导致数据错乱；未在 finally 关闭导致数据库连接泄露；Spring 整合后 SqlSessionTemplate 通过 ThreadLocal 保证线程安全。

> **关联知识点**：线程安全 → [核心 并发编程 ThreadLocal](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#13-并发编程) / Spring 整合 → [Spring IoC 容器](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94spring/#21-spring-ioc-容器)

---

**追问链**：`三组件生命周期 → SqlSessionFactory 单例原因 → SqlSession 线程不安全 → finally 关闭必要性 → Spring 整合 SqlSessionTemplate 线程安全实现 → ThreadLocal 原理`

---

## 3.4 一级缓存和二级缓存机制及问题

**一句话原理**：一级缓存（SqlSession 级别）默认开启不可关闭，底层 `PerpetualCache` = `HashMap`；二级缓存（namespace 级别）需手动开启，commit 后写入，跨 Session 共享。

---

| 维度 | 一级缓存 | 二级缓存 |
|------|---------|---------|
| 范围 | SqlSession 级别 | Mapper namespace 级别 |
| 默认状态 | 开启（不可关闭） | 关闭 |
| 写入时机 | 每次查询后 | commit/close 后 |
| 序列化 | 不需要 | 需要 Serializable |

**脏读问题**：不同 namespace 操作同一张表（如 UserMapper 和 UserRoleMapper 都操作 user 表），一个 namespace 的更新不会清空另一个 namespace 的二级缓存 → 读到旧数据。

> **常见陷阱**：二级缓存脏读是 MyBatis 面试高频陷阱。解决方案是使用 `@CacheNamespaceRef` 引用关联 namespace 的缓存，或直接用一级缓存 + Redis 外部缓存。

> **关联知识点**：MyBatis 缓存 → [MySQL 两阶段提交](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94mysql/#410-innodb-内存结构buffer-pool--redo-log--undo-log--binlog) 数据一致性对比 / 脏读 → [MySQL 隔离级别](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94mysql/#44-事务-acid-与隔离级别)

---

**追问链**：`一级缓存 PerpetualCache HashMap → SqlSession 级别 → 二级缓存 namespace 级别 → commit 写入机制 → 脏读问题产生原因 → @CacheNamespaceRef 解决方案 → 与 MySQL 两阶段提交(4.10) 数据一致性对比`

---

## 3.5 动态 SQL（if/choose/when/foreach/where/set/trim）

**一句话原理**：MyBatis 通过 SqlNode 组合模式解析动态标签，OGNL 评估表达式。每个标签对应一个 SqlNode 实现类，组合成树状结构。

---

| 标签 | SqlNode 实现 | 说明 |
|------|-------------|------|
| `<if test="...">` | `IfSqlNode` | 条件判断 |
| `<choose>/<when>/<otherwise>` | `ChooseSqlNode` + `WhenSqlNode` + `OtherwiseSqlNode` | 多分支选择 |
| `<where>` | `WhereSqlNode` | 自动处理 AND/OR 前缀 |
| `<set>` | `SetSqlNode` | 自动处理逗号后缀 |
| `<trim>` | `TrimSqlNode` | 自定义前缀/后缀/覆盖 |
| `<foreach>` | `ForeachSqlNode` | 集合遍历（IN 查询、批量插入）|

**DynamicSqlSource vs RawSqlSource**：
- **DynamicSqlSource**：包含 `${}` 或动态标签，每次执行重新解析 SqlNode 树
- **RawSqlSource**：纯静态 SQL，初始化时一次解析，执行时直接拼接

**常见陷阱**：`foreach` 的 `collection` 取值规则——`List` 默认 `list`、数组默认 `array`、`Map` 取 key；大批量 foreach 导致 SQL 过长（建议分批插入，每批 500-1000 条）。

> **关联知识点**：组合模式 → [核心 设计模式](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#16-设计模式)

---

**追问链**：`SqlNode 组合模式 → 六大标签对应 SqlNode 实现 → OGNL 表达式解析 → DynamicSqlSource 构建流程 → RawSqlSource 优化对比 → foreach 批量插入性能`

---

## 3.6 插件 Interceptor 机制

**一句话原理**：MyBatis 允许通过 `Interceptor` 接口拦截四大核心对象（Executor / StatementHandler / ParameterHandler / ResultSetHandler），底层通过 JDK 动态代理生成包装代理。

---

| 拦截点 | 可拦截方法 | 用途 |
|-------|-----------|------|
| `Executor` | update/query/commit/rollback | 拦截 SQL 执行（分页、缓存） |
| `StatementHandler` | prepare/parameterize/batch | 拦截 SQL 语句构建 |
| `ParameterHandler` | getParameterObject/setParameters | 拦截参数处理 |
| `ResultSetHandler` | handleResultSets/handleOutputParameters | 拦截结果映射 |

**PageHelper 分页原理**：

```text
PageHelper.startPage(p, s) → ThreadLocal 存分页参数
  → 拦截 Executor.query() → 从 ThreadLocal 取分页参数
  → 改写 SQL（追加 LIMIT）→ 执行 COUNT → 返回 Page 对象
```

> **常见陷阱**：`@Intercepts/@Signature` 方法签名必须精确匹配；多个插件按配置顺序组成责任链。

> **关联知识点**：JDK 动态代理 → [核心 设计模式](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#16-设计模式) / ThreadLocal → [核心 并发编程](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#13-并发编程)

---

#### PageHelper 完整源码链路

**完整执行流程**：

```text
PageHelper.startPage(pageNum, pageSize)
  → ThreadLocal 存储 Page 对象（含 pageNum/pageSize/orderBy/count）
  → 执行 Mapper 查询方法
  → PageInterceptor.intercept() 拦截 Executor.query()
    → 从 ThreadLocal 获取分页参数（ThreadLocal.get()）
    → beforeCount → Count 查询（自动拼接 COUNT(0)）
      → 查找手写 COUNT MappedStatement（原ID + _COUNT），不存在则自动创建
    → afterCount → pageQuery（Dialect 方言适配 → SQL 追加 LIMIT）
    → afterPage → 结果封装（Page 对象）
    → finally 清除 ThreadLocal（防止内存泄漏）
```

**Dialect 方言适配**：PageHelper 根据 `dialectClass` 参数选择对应数据库的分页 SQL 生成器：
- MySQL → `LIMIT ?, ?`
- Oracle → `WHERE ROWNUM <= ?` 子查询包裹
- PostgreSQL → `LIMIT ? OFFSET ?`
- SQL Server → `TOP ?` + 子查询

**Page vs PageInfo**：
- `Page` 继承 `ArrayList`，是直接的分页结果容器，包含 `total`/`pages`/`pageNum`/`pageSize` 等基础字段
- `PageInfo` 是对 Page 的额外包装，增加 `navigatepageNums`（分页导航条）、`isFirstPage`/`isLastPage`等前端友好的导航属性

**使用注意事项**：
- `PageHelper.startPage()` 之后必须紧跟 MyBatis 查询方法，中间不能穿插其他查询
- 分页参数对后续所有 MyBatis 查询生效，仅对第一个匹配的查询拦截消费
- 深分页 `LIMIT 1000000, 20` 仍需优化（参考 [MySQL 游标分页](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94mysql/#47-sql-优化策略)）

---

#### MyBatis-Plus 分页插件对比

| 维度 | PageHelper | MyBatis-Plus 分页插件 |
|------|-----------|---------------------|
| 架构 | 独立拦截器 | `PaginationInnerInterceptor`（InnerInterceptor 链） |
| 使用方式 | `PageHelper.startPage()` + Mapper 查询 | Mapper 参数传入 `Page<T>` 对象 |
| ThreadLocal | 显式存储分页参数 | 隐式处理（Page 参数传递） |
| 分页结果 | `Page` 或 `PageInfo` | `IPage<T>`（Page 是其实现）|

**混用冲突**：同时引入 PageHelper 和 MP 分页插件可能导致拦截器冲突（SQL 被双重改写、`total=0`）。建议统一使用一种方案。如果必须混用，调整拦截器顺序确保一个先执行并清除分页参数。

> **常见陷阱补充**：PageHelper 的 ThreadLocal 虽在 finally 中清理，但如果业务代码在拦截器执行前 throw 异常，需确保 finally 块能正确清理。

**追问链**（更新）：`Interceptor 接口 → @Intercepts/@Signature 声明 → 四大拦截点选择 → JDK 代理包装 → PageHelper 完整源码链路 → ThreadLocal 存储/消费/清理 → Dialect 方言适配 → Count 查询自动创建 → Page vs PageInfo → MP 分页插件对比 → 混用冲突 → 与 RowBounds 对比`

---

## 3.7 MyBatis-Plus 增强功能

**一句话原理**：MyBatis-Plus 在 MyBatis 基础上提供 BaseMapper 通用 CRUD + 条件构造器 + 分页插件 + 自动填充 + 乐观锁，**不是替换而是增强**。

---

```java
public interface UserMapper extends BaseMapper<User> {
    // 继承方法：insert/deleteById/updateById/selectById/selectList/selectPage
}

// LambdaQueryWrapper（类型安全）
LambdaQueryWrapper<User> lqw = new LambdaQueryWrapper<>();
lqw.eq(User::getName, "张三").ge(User::getAge, 18);
```

**分页插件配置**：

```java
@Configuration
public class MybatisPlusConfig {
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }
}
```

> **常见陷阱**：BaseMapper 不能替代复杂 JOIN 查询（仍需自定义 XML）；LambdaQueryWrapper 需要实体字段有 getter。

> **关联知识点**：自动配置 → [Spring Boot Starter](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94spring/#23-spring-boot-核心机制) / 条件构造器 → 策略模式

---

**追问链**：`MyBatis-Plus 增强 vs 替换 → BaseMapper 通用 CRUD → LambdaQueryWrapper 类型安全 → 分页插件自动 LIMIT → MetaObjectHandler 自动填充 → @Version 乐观锁`

---

## 3.8 分页实现原理（RowBounds / PageHelper）

**一句话原理**：RowBounds 内存分页（假分页，全量查出后 Java 层面截取）；PageHelper 物理分页（真分页，SQL 执行前动态追加 LIMIT）。

---

| 维度 | RowBounds | PageHelper |
|------|----------|-----------|
| 分页类型 | 内存分页（假分页）| 物理分页（真分页）|
| SQL 生成 | 不修改 SQL | 动态追加 LIMIT |
| 数据量 | 全表查询到内存 | 只查当前页数据 |
| 大表风险 | OOM | 无（但深分页有性能问题）|

> **常见陷阱**：RowBounds 在大数据量下全表查询导致 OOM；PageHelper 深分页 `LIMIT 1000000, 20` 仍需优化（参考 [MySQL 游标分页](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94mysql/#47-sql-优化策略)）。

> **关联知识点**：深分页优化 → [MySQL SQL 优化策略](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94mysql/#47-sql-优化策略) / ThreadLocal → [核心 并发编程](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#13-并发编程)

---

**追问链**：`RowBounds 内存分页原理 → 全表查询风险 → PageHelper 物理分页拦截 → ThreadLocal 存储 → SQL 动态追加 LIMIT → MySQL 深分页优化`

---

## 3.9 延迟加载原理及问题

**一句话原理**：MyBatis 通过 CGLIB/Javassist 为 association/collection 创建代理对象，调用 getter 时触发额外 SQL 加载关联数据。

---

**N+1 问题**：每查一个主对象，额外发 N 条查询。与 [JPA N+1](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94spring/#26-spring-data-jpa) 原理相同。

**LazyInitializationException**：SqlSession 关闭后访问懒加载属性。解决方案：`@Transactional` 维持 Session。

> **常见陷阱**：延迟加载的 N+1 问题与 JPA N+1 同源，解决方案（预加载/JOIN FETCH）也相通。

> **关联知识点**：N+1 问题 → [Spring Data JPA](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94spring/#26-spring-data-jpa) / CGLIB 代理 → [核心 设计模式](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#16-设计模式)

---

**追问链**：`延迟加载 → 代理对象创建(CGLIB) → getter 触发子查询 → N+1 问题 → LazyInitializationException → @Transactional 维持 Session → 与 JPA N+1 对比`

---

## 3.10 ResultMap 高级映射（association / collection）

**一句话原理**：`<association>`（一对一）和 `<collection>`（一对多）实现关联对象映射。可嵌套 Select（配合延迟加载）或嵌套 ResultMap（复用）。

---

| 方式 | 原理 | SQL 条数 | 延迟加载支持 | 适用场景 |
|------|------|---------|------------|---------|
| 嵌套 Select | 每关联字段一条子查询 | 1+N（N+1 问题）| 支持 | 关联数据不总是需要 |
| 嵌套 ResultMap | JOIN 一次查询全部 | 1 | 不支持 | 关联数据总是需要 |

> **常见陷阱**：嵌套 Select 的 N+1 问题；ResultMap 中不定义 `<id>` 标签导致缓存效率下降；多级嵌套时 XML 配置复杂。

> **关联知识点**：延迟加载 → 3.9 / N+1 → [Spring Data JPA](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94spring/#26-spring-data-jpa)

---

**追问链**：`association 一对一 → collection 一对多 → 嵌套 Select 延迟加载 → 嵌套 ResultMap JOIN 查询 → N+1 vs JOIN 选型 → id 标签性能优化`

---

## 3.11 MyBatis Executor 三种实现

**一句话原理**：MyBatis 中 `SqlSession` 将数据库操作委托给 `Executor` 执行。Executor 有三种实现（SIMPLE/REUSE/BATCH），通过 `Configuration.newExecutor()` 工厂方法创建，CachingExecutor 作为装饰器包裹实际执行器。

---

#### Executor 接口与执行链路

`Executor` 是 MyBatis 的核心执行器接口，定义 `update/query/commit/rollback/batch` 等方法。DefaultSqlSession 持有 Executor 实例，所有数据库操作都通过 Executor 执行：

```text
SqlSession.selectList()
  → Executor.query()                          [执行器入口]
  → BaseExecutor.query()（一级缓存检查）                              [模板方法]
  → doQuery()                                 [子类实现的钩子方法]
  → StatementHandler（SQL 参数绑定+执行）
  → ParameterHandler（参数处理）
  → ResultSetHandler（结果映射）
```

**ExecutorType 枚举**：

| 类型 | 说明 | 配置方式 |
|------|------|---------|
| `ExecutorType.SIMPLE` | 默认实现，每次执行创建新 Statement，用完关闭 | mybatis-config.xml 中 `<setting name="defaultExecutorType" value="SIMPLE" />` |
| `ExecutorType.REUSE` | 缓存 PreparedStatement，相同 SQL 文本复用 | 同上，value="REUSE" |
| `ExecutorType.BATCH` | 批量提交，update 操作通过 addBatch 累积 | 同上，value="BATCH" |

---

#### BaseExecutor 模板方法模式

`BaseExecutor` 抽象类使用**模板方法模式**，固定 query/update 的骨架流程：

```text
BaseExecutor.query():
  ① 检查一级缓存（localCache PerpetualCache）
  ② 缓存命中 → 直接返回
  ③ 缓存未命中 → 调用 doQuery()（子类实现）
  ④ 存入一级缓存

BaseExecutor.update():
  ① 清空一级缓存（防止脏读）
  ② 调用 doUpdate()（子类实现）
  ③ 清空二级缓存（CachingExecutor 在装饰器层处理）
```

子类只需实现 `doQuery()` / `doUpdate()` / `doFlushStatements()` 三个钩子方法。BaseExecutor 还管理一级缓存（`localCache = PerpetualCache`，本质是一个 `HashMap`），update/commit/rollback/close 时自动清空。

---

#### 三种 Executor 实现详解

**SimpleExecutor**（默认）：
- 每次执行 `doQuery/doUpdate` 都通过 `getConnection()` 创建新 `Statement`，执行完毕后立即关闭
- 简单无状态，但频繁创建 PreparedStatement 有性能开销
- 适合高频短查询场景

```java
// SimpleExecutor.doQuery 简化流程
public Statement doQuery(...) {
    Configuration configuration = ms.getConfiguration();
    StatementHandler handler = configuration.newStatementHandler(this, ms, ...);
    Statement stmt = prepareStatement(handler);
    return handler.query(stmt, resultHandler);
}

private Statement prepareStatement(StatementHandler handler) {
    Connection connection = getConnection();
    Statement stmt = handler.prepare(connection);  // 每次都创建新的
    handler.parameterize(stmt);
    return stmt;
}
```

**ReuseExecutor**：
- 内部维护 `Map<String, Statement>`（`statementMap`），以 SQL 文本为 key 缓存 PreparedStatement
- 相同 SQL 文本直接复用预编译的 Statement，减少 SQL 解析和编译开销
- 适合重复执行相同 SQL 模板的场景（如循环内多次查询）

```java
// ReuseExecutor 核心 — Statement 复用
private final Map<String, Statement> statementMap = new HashMap<>();

private Statement prepareStatement(StatementHandler handler, ...) {
    Statement stmt = statementMap.get(sql);  // 按 SQL 文本查找
    if (stmt != null) {
        // 复用已有的 Statement
        handler.parameterize(stmt);
        return stmt;
    }
    // 创建新的 Statement 并缓存
    stmt = handler.prepare(connection);
    statementMap.put(sql, stmt);
    return stmt;
}
```

**BatchExecutor**：
- 通过 `statementList + batchResultList + currentSql` 管理批量操作
- 调用 `doUpdate()` 时，判断 `currentSql` 是否变化：如果 SQL 与上一次相同，追加 batch 列表；如果 SQL 变更，先 `executeBatch()` 提交上一批，再开始新的批次
- `executeBatch()` 调用 `Statement.executeBatch()` 一次性提交到数据库
- **仅对 update/insert/delete 生效**，query 操作仍然立即执行
- 性能优势明显：`BatchExecutor` 插入 1 万条比 `SimpleExecutor` 快 8-10 倍

```java
// BatchExecutor 批量提交逻辑
public int doUpdate(...) {
    Statement stmt = statementList.get(last);
    String sql = ms.getSqlSource().getBoundSql(...).getSql();
    if (!sql.equals(currentSql)) {
        executeBatch();           // SQL 变更 → 先提交上一批
        currentSql = sql;
        stmt = statementHandler.prepare(connection);
        statementList.add(stmt);
    }
    stmt.addBatch(sql);           // 追加到批处理列表
    // 手动 flush：BatchExecutor.flushStatements()
    // 或 Spring SqlSessionTemplate 事务提交时自动 flush
}
```

---

#### CachingExecutor 装饰器

`CachingExecutor` 是二级缓存的核心实现，使用**装饰器模式**包裹真实 Executor：

```text
CachingExecutor.query() → 检查二级缓存 → 缓存命中返回 → 未命中委托给真实Executor
CachingExecutor.update() → 清空二级缓存 → 委托给真实Executor
```

**装饰链结构**：

```text
CachingExecutor → Plugin 代理链（拦截器包装）→ 实际 Executor（Simple/Reuse/Batch）
```

**Configuration.newExecutor() 工厂方法**：

```java
public Executor newExecutor(Transaction transaction, ExecutorType executorType) {
    executorType = executorType == null ? defaultExecutorType : executorType;
    executorType = executorType == null ? ExecutorType.SIMPLE : executorType;
    
    Executor executor;
    // 根据类型创建对应实现
    if (ExecutorType.BATCH == executorType) {
        executor = new BatchExecutor(this, transaction);
    } else if (ExecutorType.REUSE == executorType) {
        executor = new ReuseExecutor(this, transaction);
    } else {
        executor = new SimpleExecutor(this, transaction);
    }
    // 缓存开启 → CachingExecutor 装饰
    if (cacheEnabled) {
        executor = new CachingExecutor(executor);
    }
    // Plugin 链包装（拦截器）
    executor = (Executor) interceptorChain.pluginAll(executor);
    return executor;
}
```

---

#### Spring 整合后的 Executor

Spring 整合 MyBatis 后，`SqlSessionTemplate` 在构造时指定 `ExecutorType`（默认 `SIMPLE`）。通过 JDK 动态代理 + `SqlSessionInterceptor` + ThreadLocal 管理线程安全的 SqlSession：

```java
// SqlSessionTemplate 构造
public SqlSessionTemplate(SqlSessionFactory sqlSessionFactory, ExecutorType executorType) {
    this.sqlSessionFactory = sqlSessionFactory;
    this.executorType = executorType;
    // 通过 JDK 动态代理创建 SqlSession 代理
    this.sqlSessionProxy = (SqlSession) Proxy.newProxyInstance(
        SqlSessionFactory.class.getClassLoader(),
        new Class[] { SqlSession.class },
        new SqlSessionInterceptor()
    );
}
```

**执行器选型建议**：

| 场景 | 推荐 Executor | 理由 |
|------|-------------|------|
| OLTP 高频查询（CRUD） | SimpleExecutor（默认） | 无状态，每次独立，适合短查询 |
| 重复相同 SQL（循环内查询模板）| ReuseExecutor | 复用预编译 Statement，减少解析开销 |
| 批量数据导入（insert 大量数据） | BatchExecutor | addBatch 批量提交，性能提升明显 |
| 分布式环境 | 注意 CachingExecutor 脏读 | 二级缓存需要序列化 + 一致性策略 |

> **常见陷阱**：BatchExecutor 仅对 update 操作批处理有效，query 操作立即执行；多表混合操作时 BatchExecutor 的 SQL 变更判断逻辑可能导致部分 batch 未预期提交；分布式环境下 CachingExecutor 的二级缓存会导致不同应用节点的脏读。

> **关联知识点**：设计模式（模板方法/工厂方法/装饰器）→ [核心 设计模式](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#16-设计模式) / CachingExecutor → 3.4 二级缓存 / Plugin 链 → 3.6 Interceptor / Spring 整合 → SqlSessionTemplate → 3.3 SqlSessionFactory

---

**追问链**：`Executor 接口定义(update/query/commit/rollback/batch) → ExecutorType 三种枚举 → BaseExecutor 模板方法模式 → SimpleExecutor 每次新建 Statement → ReuseExecutor statementMap 缓存 → BatchExecutor addBatch 批量提交 → 性能对比(Simple 1x / Reuse 1.35-1.5x / Batch 8-10x) → CachingExecutor 装饰器 → Configuration.newExecutor() 工厂方法 → 完整装饰链 CachingExecutor→Plugin→实际Executor → Spring 整合后默认 ExecutorType.SIMPLE → 选型建议(高频/复用/批量/分布式)`

---

## 3.12 MyBatis Generator / 代码生成

**一句话原理**：MyBatis Generator (MBG) 是官方代码生成工具，根据数据库表结构自动生成 Model/Mapper/XML 映射文件。MyBatis-Plus 的 AutoGenerator 提供纯 Java 链式配置的增强版本。

---

#### MyBatis Generator (MBG)

**三种运行方式**：

| 方式 | 命令 | 适用场景 |
|------|------|---------|
| 命令行 | `java -jar mybatis-generator-core-x.x.x.jar -configfile generatorConfig.xml` | 一次运行 |
| Maven Plugin | `mvn mybatis-generator:generate` | 项目构建集成 |
| Ant Task | Ant 构建脚本调用 | 遗留项目 |

**generatorConfig.xml 核心配置**：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE generatorConfiguration
    PUBLIC "-//mybatis.org//DTD MyBatis Generator Configuration 1.0//EN"
    "http://mybatis.org/dtd/mybatis-generator-config_1_0.dtd">
<generatorConfiguration>
    <!-- 数据库连接配置 -->
    <jdbcConnection driverClass="com.mysql.cj.jdbc.Driver"
        connectionURL="jdbc:mysql://localhost:3306/db"
        userId="root" password="pass" />

    <!-- 实体类生成配置（pojo） -->
    <javaModelGenerator targetPackage="com.example.model"
        targetProject="src/main/java">
        <property name="trimStrings" value="true" />
    </javaModelGenerator>

    <!-- XML 映射文件生成配置 -->
    <sqlMapGenerator targetPackage="mapper"
        targetProject="src/main/resources" />

    <!-- Mapper 接口生成配置 -->
    <javaClientGenerator type="XMLMAPPER"
        targetPackage="com.example.mapper"
        targetProject="src/main/java" />

    <!-- 表配置 -->
    <table tableName="user" domainObjectName="User"
        enableCountByExample="false"
        enableDeleteByExample="false"
        enableSelectByExample="false"
        enableUpdateByExample="false" />
</generatorConfiguration>
```

**targetRuntime 策略**：

| 策略 | 生成内容 | 适用场景 |
|------|---------|---------|
| `MyBatis3`（默认）| 完整版，带 Example 查询（动态条件组合）| 需要复杂查询条件 |
| `MyBatis3Simple` | 简化版，仅基础 CRUD（insert/update/delete/selectByPrimaryKey）| 简单 CRUD 场景 |

---

#### MyBatis-Plus AutoGenerator

MP 代码生成器使用纯 Java 配置，通过链式 API 替代 XML：

**AutoGenerator 6 大配置项**：

| 配置类 | 用途 | 关键方法 |
|--------|------|---------|
| `GlobalConfig` | 全局配置 | `outputDir`/`author`/`open`/`swagger2`/`dateType` |
| `DataSourceConfig` | 数据源 | `url`/`username`/`password`/`driverName`/`dbType` |
| `PackageConfig` | 包名配置 | `parent`/`entity`/`mapper`/`service`/`controller` |
| `StrategyConfig` | 策略配置 | `include`/`tablePrefix`/`naming`/`columnNaming`/`entityLombokModel`/`restControllerStyle` |
| `TemplateConfig` | 模板配置 | `entity`/`mapper`/`service`/`controller` 自定义模板路径 |
| `InjectionConfig` | 自定义注入 | `customMap`/`customFile` 自定义输出 |

**FastAutoGenerator（3.5+ 推荐）**：三步链式调用：

```java
FastAutoGenerator.create("jdbc:mysql://localhost:3306/db", "root", "pass")
    .globalConfig(builder -> builder
        .author("ziogn")
        .outputDir(System.getProperty("user.dir") + "/src/main/java")
        .enableSwagger()
    )
    .packageConfig(builder -> builder
        .parent("com.example")
        .entity("entity")
        .mapper("mapper")
        .service("service")
        .controller("controller")
    )
    .strategyConfig(builder -> builder
        .addInclude("user", "order", "product")
        .addTablePrefix("t_")
        .entityBuilder().enableLombok()
        .controllerBuilder().enableRestStyle()
    )
    .execute();
```

---

#### 代码生成最佳实践

1. **生成代码与手写代码分离**：MBG 生成的代码放入 `src/main/java`，手写扩展代码放入 `src/main/java/custom`（不同包路径），避免重新生成时覆盖手写代码
2. **XML 增量生成**：MBG 的 `<sqlMapGenerator>` 支持增量模式，已有 XML 不会覆盖（仅新增或更新对应表的映射）
3. **自定义注释**：继承 `DefaultCommentGenerator` 重写 `addFieldComment`/`addModelClassComment`，加 Swagger 注解或业务注释
4. **结合 Lombok**：启用 `entityLombokModel=true`（MP）或在 generatorConfig.xml 中配置 `immutable` + `lombok`（MBG 需自定模板）
5. **Example 类控制**：生产环境通常禁用 Example（`enableXxxByExample=false`），过度使用 Example 会导致 SQL 难以维护

> **常见陷阱**：MBG 重新生成时不会删除已删除表对应的旧文件，需要手动清理；generatorConfig.xml 中的 targetProject 路径必须存在。

> **关联知识点**：代码生成 → [Spring Boot Starter 规范](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94spring/#23-spring-boot-核心机制)（自动配置 / @ConditionalOnClass）/ MyBatis-Plus → 3.7 / Maven Plugin → maven 构建生命周期

---

**追问链**：`MBG 三种运行方式(命令行/Maven/Ant) → generatorConfig.xml 核心元素(jdbcConnection/javaModelGenerator/sqlMapGenerator/clientGenerator/table) → targetRuntime(MyBatis3 vs MyBatis3Simple) → MyBatis-Plus AutoGenerator 6 大配置 → FastAutoGenerator 三步链式 → 代码生成最佳实践(生成/手写分离、自定义注释、Lombok 结合) → Example 类禁用策略`

---

**整体追问链（方向三 更新）**：`#{} vs ${} 区别 → SQL 注入防范 → Mapper 代理 JDK Proxy 原理 → MapperMethod 缓存 → SqlSessionFactory 三组件生命周期 → 一级缓存 PerpetualCache → 二级缓存 namespace 隔离 → 脏读问题 → 动态 SQL SqlNode 组合模式 → 六大标签 → Interceptor 四大拦截点 → PageHelper 完整源码链路(ThreadLocal→PageInterceptor→Dialect→LIMIT→Count→finally清理) → Page vs PageInfo → MP 分页插件对比 → MyBatis-Plus BaseMapper → LambdaQueryWrapper → RowBounds 内存分页 vs PageHelper 物理分页 → Executor 三种实现(Simple/Reuse/Batch) → BaseExecutor 模板方法 → CachingExecutor 装饰器 → MBG 代码生成 → 延迟加载 N+1 → LazyInitializationException → ResultMap association/collection → 代理链关联 JDK Proxy(1.6)→Spring AOP(2.2)→AiServices(5.1)`
