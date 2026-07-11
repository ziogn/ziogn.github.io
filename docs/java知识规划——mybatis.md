---
title: java知识规划——mybatis
created: 2026-07-11 15:00
updated: 2026-07-11 15:00
version: 0.0.1
author: ziogn
tags: [java, mybatis, interview, guide, java面试, research]
aliases: [MyBatis面试, MyBatis核心机制, MyBatis-Plus]
description: MyBatis 核心机制面试知识规划，覆盖 SQL 参数绑定、Mapper 接口代理原理、SqlSession 生命周期、缓存机制、动态 SQL、插件机制、MyBatis-Plus、分页原理、延迟加载、ResultMap 高级映射十大模块。
---

# java知识规划——mybatis

> 本文档覆盖面试权重 15% 的 MyBatis 知识体系。从 SQL 参数绑定到高级映射逐层递进。每节末尾标注与 [Java 核心](java知识规划——核心.md)、[Spring 生态](java知识规划——spring.md) 及 [MySQL](java知识规划——mysql.md) 方向的知识关联。

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

> **关联知识点**：JDK 动态代理 → [核心 设计模式](java知识规划——核心.md#16-设计模式) → [Spring AOP](java知识规划——spring.md#22-spring-aop) → [AiServices](java知识规划——ai开发.md#51-核心架构与-aiservices) 构成"四代代理"面试高频链

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

> **关联知识点**：线程安全 → [核心 并发编程 ThreadLocal](java知识规划——核心.md#13-并发编程) / Spring 整合 → [Spring IoC 容器](java知识规划——spring.md#21-spring-ioc-容器)

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

> **关联知识点**：MyBatis 缓存 → [MySQL 两阶段提交](java知识规划——mysql.md#410-innodb-内存结构buffer-pool--redo-log--undo-log--binlog) 数据一致性对比 / 脏读 → [MySQL 隔离级别](java知识规划——mysql.md#44-事务-acid-与隔离级别)

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

> **关联知识点**：组合模式 → [核心 设计模式](java知识规划——核心.md#16-设计模式)

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

> **关联知识点**：JDK 动态代理 → [核心 设计模式](java知识规划——核心.md#16-设计模式) / ThreadLocal → [核心 并发编程](java知识规划——核心.md#13-并发编程)

---

**追问链**：`Interceptor 接口 → @Intercepts/@Signature 声明 → 四大拦截点选择 → JDK 代理包装 → PageHelper 分页原理 → ThreadLocal 分页参数`

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

> **关联知识点**：自动配置 → [Spring Boot Starter](java知识规划——spring.md#23-spring-boot-核心机制) / 条件构造器 → 策略模式

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

> **常见陷阱**：RowBounds 在大数据量下全表查询导致 OOM；PageHelper 深分页 `LIMIT 1000000, 20` 仍需优化（参考 [MySQL 游标分页](java知识规划——mysql.md#47-sql-优化策略)）。

> **关联知识点**：深分页优化 → [MySQL SQL 优化策略](java知识规划——mysql.md#47-sql-优化策略) / ThreadLocal → [核心 并发编程](java知识规划——核心.md#13-并发编程)

---

**追问链**：`RowBounds 内存分页原理 → 全表查询风险 → PageHelper 物理分页拦截 → ThreadLocal 存储 → SQL 动态追加 LIMIT → MySQL 深分页优化`

---

## 3.9 延迟加载原理及问题

**一句话原理**：MyBatis 通过 CGLIB/Javassist 为 association/collection 创建代理对象，调用 getter 时触发额外 SQL 加载关联数据。

---

**N+1 问题**：每查一个主对象，额外发 N 条查询。与 [JPA N+1](java知识规划——spring.md#26-spring-data-jpa) 原理相同。

**LazyInitializationException**：SqlSession 关闭后访问懒加载属性。解决方案：`@Transactional` 维持 Session。

> **常见陷阱**：延迟加载的 N+1 问题与 JPA N+1 同源，解决方案（预加载/JOIN FETCH）也相通。

> **关联知识点**：N+1 问题 → [Spring Data JPA](java知识规划——spring.md#26-spring-data-jpa) / CGLIB 代理 → [核心 设计模式](java知识规划——核心.md#16-设计模式)

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

> **关联知识点**：延迟加载 → 3.9 / N+1 → [Spring Data JPA](java知识规划——spring.md#26-spring-data-jpa)

---

**追问链**：`association 一对一 → collection 一对多 → 嵌套 Select 延迟加载 → 嵌套 ResultMap JOIN 查询 → N+1 vs JOIN 选型 → id 标签性能优化`

---

**整体追问链（方向三）**：`#{} vs ${} 区别 → SQL 注入防范 → Mapper 代理 JDK Proxy 原理 → MapperMethod 缓存 → SqlSessionFactory 三组件生命周期 → 一级缓存 PerpetualCache → 二级缓存 namespace 隔离 → 脏读问题 → 动态 SQL SqlNode 组合模式 → 六大标签 → Interceptor 四大拦截点 → PageHelper 分页原理 → MyBatis-Plus BaseMapper → LambdaQueryWrapper → RowBounds 内存分页 vs PageHelper 物理分页 → 延迟加载 N+1 → LazyInitializationException → ResultMap association/collection → 代理链关联 JDK Proxy(1.6)→Spring AOP(2.2)→AiServices(5.1)`
