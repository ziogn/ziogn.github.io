---
title: java知识规划——spring
created: 2026-07-11 15:00
updated: 2026-07-11 15:00
version: 0.0.1
author: ziogn
tags: [java, spring, interview, guide, java面试, research]
aliases: [Spring面试, Spring生态, Spring Boot, Spring Cloud]
description: Spring 生态体系面试知识规划，覆盖 IoC 容器、AOP、Spring Boot 自动配置、MVC/REST、事务管理、Spring Data JPA、Security、微服务八大模块，附知识点追问链与跨域知识关联。
---

# java知识规划——spring

> 本文档覆盖面试权重 30% 的 Spring 知识体系，按"容器基础 → AOP → 自动配置 → MVC → 事务 → JPA → 安全 → 微服务"层层递进。每节末尾标注与 [Java 核心](java知识规划——核心.md) 及 [AI 开发](java知识规划——ai开发.md) 方向的知识关联。

---

## 2.1 Spring IoC 容器

覆盖 Bean 生命周期全流程、三级缓存循环依赖、BeanFactory 与 ApplicationContext 的区别。

---

#### Bean 生命周期全流程

Spring IoC 容器中一个 Bean 从创建到销毁经历以下步骤（最核心的 10 步）：

```text
① 实例化（Instantiation）
   通过反射（Constructor.newInstance）创建原始对象
   ↓
② 属性赋值（Population）
   @Autowired / @Resource / @Value 完成依赖注入
   ↓
③ Aware 接口回调
   BeanNameAware.setBeanName() → BeanFactoryAware.setBeanFactory()
   → ApplicationContextAware.setApplicationContext()（如存在）
   ↓
④ BeanPostProcessor#postProcessBeforeInitialization
   可在此阶段对 Bean 进行包装或替换
   ↓
⑤ @PostConstruct 注解方法（JSR-250）
   先执行
   ↓
⑥ InitializingBean#afterPropertiesSet()
   后执行
   ↓
⑦ 自定义 init-method（@Bean(initMethod="")）
   最后执行
   ↓
⑧ BeanPostProcessor#postProcessAfterInitialization
   ←———— AOP 代理在此阶段创建（AbstractAutoProxyCreator）
   ↓
⑨ Bean 就绪 -> 放入单例池（singletonObjects）
   可供容器中其他 Bean 使用
   ↓
⑩ 容器关闭时销毁
   @PreDestroy → DisposableBean.destroy() → 自定义 destroy-method
```

**AOP 代理创建时机**：在 `BeanPostProcessor#postProcessAfterInitialization` 阶段。Spring AOP 的 `AnnotationAwareAspectJAutoProxyCreator`（本质是一个 BeanPostProcessor）在 `postProcessAfterInitialization` 方法中检查当前 Bean 是否有匹配的切面，如果有则通过 `AbstractAutoProxyCreator.createProxy()` 创建代理对象替代原始 Bean 放入容器。

```java
// AbstractAutoProxyCreator.postProcessAfterInitialization（简化）
@Override
public Object postProcessAfterInitialization(Object bean, String beanName) {
    if (bean instanceof AopInfrastructureBean) return bean;

    // 检查是否有匹配的切面
    Class<?> targetClass = AopProxyUtils.ultimateTargetClass(bean);
    if (!this.advisedBeans.containsKey(targetClass)) {
        // 创建代理
        return wrapIfNecessary(bean, beanName, cacheKey);
    }
    return bean;
}
```

> **常见陷阱**：
> - BeanPostProcessor 本身不经过 BeanPostProcessor 处理（先实例化特殊处理）
> - 多个 BeanPostProcessor 通过 `Ordered` / `@Order` / `PriorityOrdered` 控制执行顺序
> - `@PostConstruct + @PreDestroy` 需要引入 `jakarta.annotation` 包（Spring Boot 3.x / JDK 17+）；旧版使用 `javax.annotation`

> **关联知识点**：BeanPostProcessor → AOP 代理创建 / BeanFactory → 模板方法模式（核心） / 生命周期 → @Transactional 事务代理 / 容器事件 → 观察者模式

---

#### 三级缓存解决循环依赖

Spring 通过三级缓存（三级 Map）解决 **setter 注入** 场景下的循环依赖：

```java
// DefaultSingletonBeanRegistry 中的三级缓存
public class DefaultSingletonBeanRegistry {
    // L1: 一级缓存，存放完全初始化好的单例 Bean（成品）
    private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);

    // L2: 二级缓存，存放提前暴露的早期单例 Bean（半成品，未完成属性注入）
    private final Map<String, Object> earlySingletonObjects = new ConcurrentHashMap<>(16);

    // L3: 三级缓存，存放 ObjectFactory，用于提前创建 AOP 代理对象
    private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);
}
```

**三级缓存各自的职责**：

| 级别 | 名称 | 存放内容 | 用途 |
|------|------|---------|------|
| L1 | `singletonObjects` | 完全初始化好的 Bean | 正常就绪 bean 的存取 |
| L2 | `earlySingletonObjects` | 提前暴露的半成品 Bean | 检测到循环依赖后存放 |
| L3 | `singletonFactories` | ObjectFactory 工厂 | 存放创建半成品的工厂方法 |

**为什么需要 L3 而不直接放 L2？**

三级缓存的设计核心在于 **AOP 代理的延迟创建**：

1. 如果直接放 L2（earlySingletonObjects），需要在实例化后立即创建 AOP 代理
2. 使用 L3 的 `ObjectFactory`，只有**真正发生循环依赖**时，才通过工厂调用 `getEarlyBeanReference()` 提前创建 AOP 代理
3. 如果没发生循环依赖，AOP 代理在 `BeanPostProcessor#postProcessAfterInitialization` 阶段正常创建，不会触发 `getEarlyBeanReference()`

```java
// AbstractAutowireCapableBeanFactory 中的提前暴露逻辑
protected Object getEarlyBeanReference(String beanName, RootBeanDefinition mbd, Object bean) {
    // 通过 SmartInstantiationAwareBeanPostProcessor 创建提前代理
    // 如果没有 AOP 需求，直接返回原始 bean 引用
    return exposedObject;
}
```

**setter 注入可解、构造器注入不行**：

```text
A 构造器注入 B，B 构造器注入 A：
  ① 实例化 A → 需要 B（但 B 的实例还没创建）
     → A 在构造器阶段就需要 B，而 A 还没实例化完，无法提前暴露
     → 抛出 BeanCurrentlyInCreationException

A setter 注入 B，B setter 注入 A：
  ① 实例化 A（空构造器）→ 将 A 通过 addSingletonFactory 暴露到 L3
  ② 属性赋值 A → 需要 B → 创建 B
  ③ 实例化 B → 将 B 暴露到 L3
  ④ 属性赋值 B → 需要 A → 从 L3 获取 A（通过 ObjectFactory 得到半成品 A）
  ⑤ B 完成初始化 → 放入 L1
  ⑥ A 拿到 B 的引用 → 完成初始化 → 放入 L1
```

> **常见陷阱**：
> - 构造器注入 + 循环依赖直接报错，无法通过三级缓存解决
> - `prototype` 作用域的 Bean 不参与三级缓存，出现循环依赖直接报错
> - `@DependsOn` 指定依赖顺序也会导致循环依赖报错
> - 三级缓存只对**单例** Bean 有效
> - `@Lazy` 可临时绕过构造器循环依赖（创建代理而非真实 Bean，但不是真正的解决方案）

> **关联知识点**：Bean 生命周期 → 循环依赖 / 三级缓存 → AOP 代理创建时机 / setter vs 构造器 → 依赖注入方式对比

---

**追问链**：`Bean 生命周期 10 步 → AOP 代理在哪个阶段创建 → BeanPostProcessor 机制 → 三级缓存各自存什么 → 为什么需要 L3 → setter 注入为什么可以解决循环依赖 → 构造器注入为什么不行 → prototype 为什么无法解决 → @DependsOn 为什么不行 → @Lazy 临时方案`

---

## 2.2 Spring AOP

覆盖 Spring AOP 代理选择策略、@EnableAspectJAutoProxy 底层原理、切面执行顺序、自调用 AOP 失效及 5 种解决方案。

---

#### 代理选择策略

Spring AOP 基于代理模式实现，选择策略如下：

```java
@EnableAspectJAutoProxy
  → AnnotationAwareAspectJAutoProxyCreator（BeanPostProcessor）
  → 目标类是否实现接口？
      ├─ 是 → JDK 动态代理（默认）
      └─ 否 → CGLIB 代理
  → proxyTargetClass=true 强制 CGLIB（无视接口）
```

**JDK Proxy vs CGLIB 在 Spring AOP 中的对比**：

| 维度 | JDK 动态代理 | CGLIB 代理 |
|------|-------------|-----------|
| 底层原理 | `Proxy.newProxyInstance()` + `InvocationHandler` | ASM 字节码增强，生成目标类的子类 |
| 前提条件 | 目标类必须实现接口 | 目标类不能是 final |
| 代理对象 | 实现目标接口的代理类实例 | 目标类的子类实例 |
| 限制 | 只能代理接口中声明的方法 | final 方法 / final 类不可代理 |
| 生效方式 | Spring Framework 默认策略 | `proxyTargetClass=true` 或无接口时 |
| Spring Boot 2.x+ | 默认不再使用 | Spring Boot 2.x+ 默认行为 |

> Spring Boot 2.0+ 中，`spring.aop.proxy-target-class=true` 为默认值，意味着即使目标类实现了接口，默认也使用 CGLIB。这是 Spring Boot 与 Spring Framework 默认行为的一个重要差异。

```java
// Spring Boot 中配置 CGLIB（2.x 之后已是默认）
spring.aop.proxy-target-class=true  // application.yml

// 代码中配置 @EnableAspectJAutoProxy
@Configuration
@EnableAspectJAutoProxy(proxyTargetClass = true)  // 强制 CGLIB
public class AopConfig {
}
```

---

#### @EnableAspectJAutoProxy 底层

`@EnableAspectJAutoProxy` 通过 `@Import(AspectJAutoProxyRegistrar.class)` 向容器注册 `AnnotationAwareAspectJAutoProxyCreator`：

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Import(AspectJAutoProxyRegistrar.class)  // 核心
public @interface EnableAspectJAutoProxy {
    boolean proxyTargetClass() default false;
    boolean exposeProxy() default false;  // 是否暴露代理到 ThreadLocal
}
```

`AnnotationAwareAspectJAutoProxyCreator` 继承链：

```java
AnnotationAwareAspectJAutoProxyCreator
  → AspectJAwareAdvisorAutoProxyCreator
    → AbstractAdvisorAutoProxyCreator
      → AbstractAutoProxyCreator
        implements SmartInstantiationAwareBeanPostProcessor
          // 本质就是 BeanPostProcessor
```

**切面执行顺序**：

- 通过 `@Order` 注解或实现 `Ordered` 接口控制
- 数字越小优先级越高（执行顺序越前）
- `@Aspect` 类上的 `@Order` 控制多个切面间的相对顺序

```java
@Aspect
@Order(1)  // 优先级最高，最先执行 @Before，最后执行 @After
public class LoggingAspect { ... }

@Aspect
@Order(2)
public class SecurityAspect { ... }

// 执行顺序（多个 @Before）：
// LoggingAspect @Before → SecurityAspect @Before → 目标方法
//   → SecurityAspect @After → LoggingAspect @After

// 执行顺序（多个 @Around）：
// LoggingAspect @Around proceed → SecurityAspect @Around proceed → 目标方法
```

---

#### 同一类方法调用导致 AOP 失效

**根本原因**：AOP 代理机制中，代理对象持有目标对象的引用。当通过代理对象调用方法时，AOP 拦截器生效。但如果目标方法内部调用同一类的另一个方法（`this.method()`），实际调用的是**原始对象的方法**，不经过代理，AOP 拦截器不会执行。

```java
@Service
public class UserServiceImpl implements UserService {

    @Override
    @Transactional
    public void createUser(User user) {
        // ① 事务生效：通过代理对象调用
        saveUser(user);
        sendNotification(user);  // ② AOP 失效！this.sendNotification() 不经过代理
    }

    @Async
    public void sendNotification(User user) {
        // @Async 在此处不会生效
        notificationService.send(user.getEmail(), "欢迎注册");
    }
}
```

**五种解决方案**（按推荐度排序）：

| # | 方案 | 实现方式 | 优点 | 缺点 |
|---|------|---------|------|------|
| 1 | **注入自身代理** | `@Autowired UserService self` 替代 `this` 调用 | 最简洁，语义清晰 | 循环依赖警告 |
| 2 | **ApplicationContext.getBean** | `applicationContext.getBean(UserService.class)` | 通用方案 | 侵入性强 |
| 3 | **AopContext.currentProxy()** | `((UserService) AopContext.currentProxy()).sendNotification()` | 原生 AOP 支持 | 需配置 `exposeProxy=true` |
| 4 | **注入另一个 Bean** | 将被调用方法提取到另一个 Service | 职责分离 | 增加类数量 |
| 5 | **重构避免自调用** | 将自调用链提取到 Controller 层 | 最干净 | 门槛高 |

```java
// 方案1：注入自身代理（推荐）
@Service
public class UserServiceImpl implements UserService {
    @Autowired
    private UserService self;  // 注入代理对象自身

    @Transactional
    public void createUser(User user) {
        saveUser(user);
        self.sendNotification(user);  // 通过代理调用 → AOP 生效
    }

    @Async
    public void sendNotification(User user) {
        // @Async 现在生效了
    }
}

// 方案3：AopContext.currentProxy()
@Configuration
@EnableAspectJAutoProxy(exposeProxy = true)  // 必须开启
public class AopConfig { }

@Service
public class UserServiceImpl implements UserService {
    @Transactional
    public void createUser(User user) {
        saveUser(user);
        ((UserService) AopContext.currentProxy()).sendNotification(user);
    }
}
```

> **常见陷阱**：
> - 自调用失效影响所有 AOP 注解：`@Transactional`、`@Async`、`@Cacheable`、自定义切面
> - `AopContext.currentProxy()` 必须在 `@EnableAspectJAutoProxy(exposeProxy=true)` 开启下使用，否则抛 `IllegalStateException`
> - 自调用失效在 JDK Proxy 和 CGLIB 中都会发生，不是选择哪种代理的问题

> **关联知识点**：[JDK Proxy vs CGLIB](java知识规划——核心.md#16-设计模式) / @Transactional 自调用失效 / [AiServices 动态代理](java知识规划——ai开发.md#51-核心架构与-aiservices) 的代理原理同源

---

**追问链**：`AOP 代理选择策略 → @EnableAspectJAutoProxy 底层 AnnotationAwareAspectJAutoProxyCreator → 继承自 BeanPostProcessor → 切面执行顺序 @Order → 数字越小优先级越高 → 自调用 AOP 失效的根本原因 → 5 种解决方案对比 → Spring Boot 默认 CGLIB 设计决策 → 自调用对 @Transactional 的影响`

---

## 2.3 Spring Boot 核心机制

覆盖自动配置核心链路、@Conditional 条件注解体系、配置加载优先级、@ConfigurationProperties 类型安全绑定、自定义 Starter 规范。

---

#### 自动配置核心链路

`@SpringBootApplication` 是一个复合注解，包含三个核心注解：

```java
@SpringBootConfiguration  // 等同于 @Configuration
@EnableAutoConfiguration  // 自动配置入口
@ComponentScan            // 组件扫描
public @interface SpringBootApplication {}
```

**自动配置执行链路**：

```java
@SpringBootApplication
  ↓
@EnableAutoConfiguration
  ↓
@Import(AutoConfigurationImportSelector.class)
  ↓
AutoConfigurationImportSelector.selectImports()
  ↓
加载 META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
  ↓
（Spring Boot 2.7 之前使用 spring.factories，3.0+ 统一为 AutoConfiguration.imports）
  ↓
遍历所有 AutoConfiguration 类
  ↓
逐类检查 @Conditional 系列注解条件
  ↓
条件满足 → 解析 @Configuration 类 → 注册 Bean 到容器
条件不满足 → 跳过
```

```java
// AutoConfiguration.imports 文件内容示例（位于 jar 包的 META-INF/spring/ 目录）
// META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports

com.mycorp.libx.autoconfigure.LibXAutoConfiguration
com.mycorp.libx.autoconfigure.LibXWebAutoConfiguration
```

---

#### @Conditional 条件注解体系

Spring Boot 提供基于条件的 Bean 注册机制：

| 注解 | 判断条件 | 典型使用场景 |
|------|---------|------------|
| `@ConditionalOnClass` | 类路径存在指定类 | 某个依赖存在时才启用配置 |
| `@ConditionalOnMissingClass` | 类路径不存在指定类 | 回退配置 |
| `@ConditionalOnBean` | 容器中已存在指定 Bean | 用户已配置时不再自动配置 |
| `@ConditionalOnMissingBean` | 容器中不存在指定 Bean | 提供默认 Bean，用户可覆盖 |
| `@ConditionalOnProperty` | 配置文件中存在/匹配特定属性 | 功能开关（`enabled=true`） |
| `@ConditionalOnExpression` | SpEL 表达式结果为 true | 复杂条件逻辑 |
| `@ConditionalOnWebApplication` | 当前是 Web 环境 | Web 特定配置 |
| `@ConditionalOnResource` | 类路径存在指定资源文件 | 资源文件存在时启用 |

**防止重复注册的典型模式**：

```java
@Configuration
@ConditionalOnClass(DataSource.class)                   // 类路径有 DataSource
@ConditionalOnMissingBean(type = "javax.sql.DataSource") // 用户未自定义 DataSource
public class DataSourceAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean  // 确保用户可覆盖
    public DataSource dataSource() {
        return new HikariDataSource();
    }
}
```

---

#### 配置加载优先级

Spring Boot 支持多种配置源，按优先级从高到低排序：

```text
┌─ 高优先级 ─────────────────────────────────────┐
│  1. 命令行参数：--server.port=8081               │
│  2. JVM 系统属性：-Dserver.port=8081              │
│  3. 操作系统环境变量：SERVER_PORT=8081            │
│  4. 外部配置文件：config/application.yml          │
│  5. application-{profile}.yml（profile 特定配置）   │
│  6. application.yml（默认配置文件）                │
│  7. @PropertySource（类上声明）                    │
│  8. SpringApplication.setDefaultProperties()      │
└─ 低优先级 ─────────────────────────────────────┘
```

**@ConfigurationProperties 类型安全绑定**：

```java
@Component
@ConfigurationProperties(prefix = "app.datasource")
@Validated
public class DataSourceProperties {

    @NotEmpty
    private String url;

    @NotEmpty
    private String username;

    private String password;

    private PoolConfig pool = new PoolConfig();

    // getter / setter ...

    public static class PoolConfig {
        private int maxSize = 10;
        private int minIdle = 2;
        // getter / setter ...
    }
}
```

```yaml
# application.yml 中的配置将自动绑定到 DataSourceProperties
app:
  datasource:
    url: jdbc:mysql://localhost:3306/db
    username: root
    password: secret
    pool:
      max-size: 20
      min-idle: 5
```

---

#### 自定义 Starter 规范

一个标准 Spring Boot Starter 包含两个模块：

```text
my-logger-spring-boot-autoconfigure  ← 自动配置模块
  ├── @ConfigurationProperties（属性绑定类）
  ├── @AutoConfiguration（自动配置类）
  └── META-INF/spring/
      └── org.springframework.boot.autoconfigure.AutoConfiguration.imports（声明自动配置类）

my-logger-spring-boot-starter  ← 聚合模块（空 pom）
  └── 依赖 my-logger-spring-boot-autoconfigure + 核心库依赖
```

> **关联知识点**：自动配置 → Spring Boot SPI 机制（[核心→类加载](java知识规划——核心.md#12-jvm-内存模型与垃圾回收)） / @Conditional → 条件注册模式

---

**追问链**：`@SpringBootApplication 复合注解 → @EnableAutoConfiguration → AutoConfigurationImportSelector → 加载 AutoConfiguration.imports → @Conditional 条件注解体系 → @ConditionalOnMissingBean 防止重复注册 → 配置加载优先级 → @ConfigurationProperties 类型安全绑定 → 自定义 Starter 规范`

---

## 2.4 Spring MVC / REST

覆盖 DispatcherServlet 请求处理全流程、HttpMessageConverter 序列化、拦截器 vs 过滤器、@ControllerAdvice 统一异常处理。

---

#### DispatcherServlet 请求处理流程

Spring MVC 的核心是 `DispatcherServlet`，所有请求通过 `doDispatch()` 方法统一调度：

```text
HTTP Request
  ↓
DispatcherServlet.doDispatch()
  ↓
① MultipartContent 解析（如果是 multipart 请求）
  ↓
② HandlerMapping 查找处理器
   └─ RequestMappingHandlerMapping 解析 @RequestMapping 注解 → HandlerExecutionChain（处理器 + 拦截器链）
  ↓
③ HandlerAdapter 执行处理器
   └─ RequestMappingHandlerAdapter:
       ├── HandlerMethodArgumentResolver 链（逐一匹配参数类型）
       │   ├── @RequestParam → RequestParamMethodArgumentResolver
       │   ├── @PathVariable → PathVariableMethodArgumentResolver
       │   ├── @RequestBody → RequestResponseBodyMethodProcessor（依赖 HttpMessageConverter）
       │   └── @ModelAttribute → ModelAttributeMethodProcessor
       ├── 方法反射调用
       └── HandlerMethodReturnValueHandler 链：
           └── @ResponseBody → RequestResponseBodyMethodProcessor（通过 HttpMessageConverter 序列化）
  ↓
④ 视图解析或直接响应
   ├── @ResponseBody → HttpMessageConverter 直接写入 Response
   └── 返回 ModelAndView → ViewResolver 解析 → 渲染视图
  ↓
⑤ 拦截器 postHandle / afterCompletion
  ↓
HTTP Response
```

**关键组件职责**：

| 组件 | 职责 | 默认实现 |
|------|------|---------|
| `DispatcherServlet` | 前端控制器，统一请求调度 | `doDispatch()` |
| `HandlerMapping` | 将请求 URL 映射到处理器 | `RequestMappingHandlerMapping` |
| `HandlerAdapter` | 适配不同处理器类型 | `RequestMappingHandlerAdapter` |
| `HandlerMethodArgumentResolver` | 参数解析器链 | 30+ 个内置实现 |
| `HttpMessageConverter` | 请求体/响应体序列化 | `MappingJackson2HttpMessageConverter` |
| `HandlerExceptionResolver` | 异常处理 | `ExceptionHandlerExceptionResolver` |

---

#### HttpMessageConverter

`@RequestBody` 和 `@ResponseBody` 通过 `HttpMessageConverter` 实现序列化/反序列化：

```java
// 典型的 HttpMessageConverter 实现
// MappingJackson2HttpMessageConverter（JSON，默认）
// StringHttpMessageConverter（字符串）
// ByteArrayHttpMessageConverter（字节数组）
// FormHttpMessageConverter（表单数据）
// SourceHttpMessageConverter（XML Source）

// 自定义 HttpMessageConverter
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        MappingJackson2HttpMessageConverter jsonConverter =
            new MappingJackson2HttpMessageConverter();
        jsonConverter.setObjectMapper(new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            .setSerializationInclusion(JsonInclude.Include.NON_NULL));
        converters.add(jsonConverter);
    }
}
```

---

#### 拦截器 vs 过滤器

| 维度 | Filter | Interceptor |
|------|--------|-------------|
| 所属层次 | Servlet 容器层 | Spring MVC 层 |
| 可获取上下文 | Servlet 标准 API | Spring 容器中的 Bean + Servlet 标准 API |
| 使用 Spring Bean | 通过 Spring 注册时可以注入 Bean | 可以（Interceptor 由 Spring 管理） |
| 执行阶段 | `doFilter()` 单回调 | `preHandle` / `postHandle` / `afterCompletion` 三阶段 |
| 拦截粒度 | URL 路径匹配 | URL 路径 + 处理器类型 |
| 终止请求 | 不执行 `chain.doFilter()` | `preHandle` 返回 `false` |
| 配置方式 | `@WebFilter` + `@ServletComponentScan` | `WebMvcConfigurer.addInterceptors` |

**拦截器三阶段执行顺序**：

```text
请求到达
  ↓
Filter.doFilter()
  ↓
Interceptor.preHandle()       ← 返回 false 则终止，不执行处理器
  ↓
HandlerAdapter 执行处理器
  ↓
Interceptor.postHandle()      ← 处理器执行完、视图渲染前
  ↓
视图渲染（或 @ResponseBody 写入响应）
  ↓
Interceptor.afterCompletion() ← 任何情况都执行（类似 finally）
  ↓
Filter.doFilter() 返回
```

> **关联知识点**：拦截器 → [Spring Security Filter 链](java知识规划——spring.md#27-spring-security) / DispatcherServlet → 前端控制器模式（[核心→设计模式](java知识规划——核心.md#16-设计模式)）

---

#### @ControllerAdvice 统一异常处理

```java
@RestControllerAdvice  // @ControllerAdvice + @ResponseBody
public class GlobalExceptionHandler {

    // 处理业务异常
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException e) {
        return ResponseEntity
            .status(e.getHttpStatus())
            .body(new ErrorResponse(e.getCode(), e.getMessage()));
    }

    // 处理参数校验异常
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity
            .badRequest()
            .body(new ErrorResponse(400, msg));
    }

    // 兜底异常处理
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnknown(Exception e) {
        log.error("未预期的异常", e);
        return ResponseEntity
            .status(500)
            .body(new ErrorResponse(500, "服务器内部错误"));
    }
}
```

> **关联知识点**：@ControllerAdvice → AOP 环绕增强思想（2.2）/ 统一响应 → 接口设计规范

---

**追问链**：`DispatcherServlet doDispatch 流程 → HandlerMapping 查找 → HandlerAdapter 参数解析链 → HttpMessageConverter 序列化 → 拦截器三阶段(preHandle/postHandle/afterCompletion) → Filter vs Interceptor 区别 → @ControllerAdvice 异常处理 → 统一响应体设计`

---

## 2.5 Spring 事务管理

Spring 声明式事务是 AOP 最经典的应用场景之一，核心理解 `@Transactional` 原理、七大传播行为、隔离级别与并发问题的对应关系。面试中常将事务与 AOP 代理失效联合考察。

---

#### @Transactional 声明式事务原理

`@Transactional` 的本质是通过 AOP 代理实现的声明式事务管理，核心处理链路在 `TransactionInterceptor` 中完成：

```java
// 简化后的 TransactionInterceptor 工作流程
protected Object invokeWithinTransaction(Method method, @Nullable Class<?> targetClass,
                                          final InvocationCallback invocation) {
    // 1. 获取事务属性
    TransactionAttributeSource tas = getTransactionAttributeSource();
    TransactionAttribute ta = tas.getTransactionAttribute(method, targetClass);

    // 2. 获取 PlatformTransactionManager
    PlatformTransactionManager ptm = determineTransactionManager(ta);

    // 3. 开启事务（根据传播行为决定创建新事务还是加入现有事务）
    TransactionInfo txInfo = createTransactionIfNecessary(ptm, ta, joinpointIdentification);

    Object retVal;
    try {
        // 4. 执行目标方法
        retVal = invocation.proceedWithInvocation();
    } catch (Throwable ex) {
        // 5. 异常时回滚（默认只回滚 RuntimeException 和 Error）
        completeTransactionAfterThrowing(txInfo, ex);
        throw ex;
    } finally {
        // 6. 清理事务资源
        cleanupTransactionInfo(txInfo);
    }
    // 7. 正常时提交事务
    commitTransactionAfterReturning(txInfo);
    return retVal;
}
```

**执行流程**：

```text
@Transactional 方法调用
  → AOP 代理拦截（TransactionInterceptor）
  → 获取 @Transactional 属性（propagation/isolation/timeout/rollbackFor/readOnly）
  → PlatformTransactionManager.getTransaction() 开启事务
    → 从 DataSource 获取连接
    → 设置 autoCommit=false
    → 设置隔离级别
  → 目标方法执行（JDBC 操作在此连接上执行）
  → 正常 → commit()（提交事务）
  → 异常 → rollback()（回滚事务）
  → 归还连接到连接池
```

---

#### 传播行为七种

Spring 定义了七种事务传播行为，核心理解 REQUIRED、REQUIRES_NEW、NESTED 三者的区别：

| 传播行为 | 含义 | 适用场景 |
|---------|------|---------|
| `REQUIRED`（默认） | 有事务则加入，无则新建 | 绝大多数业务方法 |
| `SUPPORTS` | 有事务则加入，无则非事务执行 | 查询方法 |
| `MANDATORY` | 必须有事务，否则抛异常 | 强制在事务内调用的方法 |
| `REQUIRES_NEW` | 挂起当前事务，新建独立事务 | 日志记录、操作审计 |
| `NOT_SUPPORTED` | 挂起当前事务，以非事务方式执行 | 发送短信、邮件等 |
| `NEVER` | 不能在事务中执行，否则抛异常 | 禁止事务环境的测试方法 |
| `NESTED` | 嵌套事务（JDBC savepoint） | 批量处理中单条失败不影响整体 |

**REQUIRED vs REQUIRES_NEW vs NESTED 对比**：

| 特性 | REQUIRED | REQUIRES_NEW | NESTED |
|------|----------|-------------|--------|
| 是否共享事务 | 是（加入同一事务） | 否（完全独立） | 否（嵌套子事务）|
| 内层回滚影响外层 | 内层标记 rollback-only | 不影响外层 | 不影响外层 |
| 实现机制 | 同一 Connection | 两个独立 Connection | 同一 Connection，JDBC savepoint |
| 性能开销 | 低 | 高（需挂起/恢复事务上下文） | 中 |

---

#### 隔离级别与并发问题

```text
脏 读  ← READ_UNCOMMITTED（读未提交）
不可重复读 ← READ_COMMITTED（读已提交，Oracle 默认）
幻 读  ← REPEATABLE_READ（可重复读，MySQL InnoDB 默认）
串行化 ← SERIALIZABLE（完全串行）
```

| 并发问题 | 定义 | 哪个级别避免 |
|---------|------|------------|
| 脏读 | 读到另一个事务未提交的数据 | READ_COMMITTED 及以上 |
| 不可重复读 | 同一事务内两次读取同一行数据结果不同 | REPEATABLE_READ 及以上 |
| 幻读 | 同一事务内两次读取同一范围数据条数不同 | SERIALIZABLE |

> **常见陷阱**：隔离级别由数据库层面保证，Spring 只是将隔离级别设置传递给 JDBC Connection。隔离级别设置越高，数据库锁竞争越激烈。

> **关联知识点**：隔离级别 → [MySQL MVCC](java知识规划——mysql.md#45-mvcc-实现原理undo-log--readview) / 传播行为 → AOP 代理

---

#### 自调用事务失效

与 AOP 方法自调用失效原理完全一致（参考 2.2 AOP 失效解决方案）：

```java
@Service
public class OrderService {
    // @Transactional 在此处生效（通过代理调用）
    public void createOrder(Order order) {
        saveOrder(order);
        deductStock(order);  // this.deductStock() 不经过代理 → @Transactional 失效
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deductStock(Order order) {
        stockMapper.decrease(order.getProductId(), order.getQuantity());
    }
}
```

**解决方案**（同 AOP 自调用）：

```java
// 注入自身代理
@Service
public class OrderService {
    @Autowired
    private OrderService self;  // 注入代理对象

    public void createOrder(Order order) {
        saveOrder(order);
        self.deductStock(order);  // 通过代理调用，事务生效
    }
}
```

---

#### 默认回滚规则

Spring 的默认回滚策略：**只回滚 `RuntimeException` 和 `Error`**，所有 checked exception 默认不回滚。

```java
// 事务不回滚：IOException 是 checked exception
@Transactional
public void uploadFile() throws IOException {
    Files.write(...);
}

// 解决方案：显式指定回滚异常
@Transactional(rollbackFor = IOException.class)
public void uploadFile() throws IOException {
    Files.write(...);
}
```

> **为什么默认不回滚 checked exception**：Spring 的设计哲学认为 checked exception 是业务可预见的、可恢复的异常，业务代码应该通过 catch 进行补偿处理，而不是简单地回滚事务。

---

**追问链**：`@Transactional 原理 → TransactionInterceptor 工作流程 → PlatformTransactionManager 如何获取连接 → 传播行为七种区别 → REQUIRED vs REQUIRES_NEW vs NESTED → 隔离级别与并发问题对应 → 脏读/不可重复读/幻读 → MySQL 默认 REPEATABLE_READ → 自调用导致事务失效 → 解决方案对比 → 默认只回滚 RuntimeException 和 Error 原因 → rollbackFor 用法`

---

## 2.6 Spring Data JPA

JPA（Java Persistence API）是 ORM 规范标准，Spring Data JPA 是其实现框架。面试中的核心议题围绕关联查询性能（N+1 问题）和实体映射设计展开。

---

#### N+1 问题与解决方案

**N+1 问题**：查询 N 条主记录后，每条记录的关联字段触发 1 条额外查询，最终产生 1 + N 条 SQL。

```java
@Entity
public class User {
    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<Order> orders;
}

// N+1 问题代码
List<User> users = userRepository.findAll();
for (User user : users) {
    System.out.println(user.getOrders().size());  // 触发 N 条额外查询
}
```

**解决方案对比**：

| 方案 | 实现方式 | 优点 | 缺点 |
|------|---------|------|------|
| **JOIN FETCH** | `@Query("SELECT u FROM User u JOIN FETCH u.orders")` | 一条 SQL 完成 | 集合关联可能产生笛卡尔积 |
| **@EntityGraph** | `@EntityGraph(attributePaths = "orders")` | 声明式，比 JOIN FETCH 灵活 | 复杂场景不够 |
| **Batch Size** | `@BatchSize(size = 10)` | 批量加载，将 N+1 降为 N/10+1 | 仍有多次查询 |

---

#### 实体状态与级联

**四种实体状态**：

| 状态 | 说明 | 转换操作 |
|------|------|---------|
| Transient（瞬态）| 新创建，未与 EntityManager 关联 | `persist()` → Managed |
| Managed（托管）| 与 EntityManager 关联，变更自动同步 | `merge()` / `find()` |
| Detached（游离）| 有关联 ID 但不在 EntityManager 管理范围 | `merge()` → Managed |
| Removed（删除）| 标记为删除，flush 时删除记录 | `remove()` |

> **常见陷阱**：
> - `fetch = FetchType.EAGER` 可能导致不必要的 JOIN 查询，甚至 Cartesian Product
> - 级联操作 `CascadeType.REMOVE` 可能导致意外删除
> - 事务外访问懒加载属性会抛 `LazyInitializationException`

> **关联知识点**：N+1 问题 → [MyBatis 延迟加载 N+1](java知识规划——mybatis.md#39-延迟加载原理及问题) 同源

---

**追问链**：`JPA 实体状态(Transient/Managed/Detached/Removed) → N+1 问题产生原因 → JOIN FETCH 解决方案 → @EntityGraph → @BatchSize → 级联类型 CascdeType → LazyInitializationException → 与 MyBatis 延迟加载(3.9)对比`

---

## 2.7 Spring Security

Spring Security 的核心架构是 Filter 链式认证授权，面试重点在于 JWT 无状态认证流程、OAuth2 授权码模式以及 RBAC 权限模型的设计。

---

#### SecurityFilterChain 架构

`SecurityFilterChain` 替代了旧版的 `WebSecurityConfigurerAdapter`，是 Spring Security 5.7+ 的核心接口。

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/user/**").authenticated()
                .anyRequest().authenticated()
            )
            .addFilterBefore(new JwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class)
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        return http.build();
    }
}
```

**默认过滤器顺序（部分关键）**：

```text
SecurityContextPersistenceFilter        → 从 Session 恢复 SecurityContext
  ↓
UsernamePasswordAuthenticationFilter    → 处理登录请求
  ↓
SecurityContextHolderFilter             → 写入 SecurityContext
  ↓
AnonymousAuthenticationFilter           → 未认证用户赋予匿名身份
  ↓
ExceptionTranslationFilter              → 捕获认证/授权异常，触发 401/403 响应
  ↓
FilterSecurityInterceptor               → 最后一道 Filter，执行授权决策
```

**SecurityContextHolder 存储策略**：

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| `MODE_THREADLOCAL`（默认） | 每个线程独立存储 | 标准的同步请求处理 |
| `MODE_INHERITABLETHREADLOCAL` | 子线程继承父线程认证信息 | 异步处理（@Async）|
| `MODE_GLOBAL` | 全局共享 | 桌面应用 |

> **关联知识点**：Filter 链 → [拦截器 vs Filter](java知识规划——spring.md#24-spring-mvc--rest) / SecurityContextHolder → [ThreadLocal](java知识规划——核心.md#13-并发编程)

---

#### JWT 认证流程

JWT（JSON Web Token）是一种无状态认证方案，核心结构由 Header、Payload、Signature 三部分组成。

**完整认证流程**：

```text
客户端                         服务器
  │                            │
  │  ① POST /api/login         │
  │  {username, password}      │
  │ ─────────────────────────> │
  │                            │  ② 验证用户名密码
  │                            │  ③ 生成 JWT
  │  ④ 返回 JWT Token         │
  │ <───────────────────────── │
  │                            │
  │  ⑤ GET /api/resource      │
  │  Authorization: Bearer xxx │
  │ ─────────────────────────> │
  │                            │  ⑥ JwtAuthenticationFilter 拦截
  │                            │  ⑦ 解析 Token → 验证签名 + 过期时间
  │                            │  ⑧ 构建 UsernamePasswordAuthenticationToken
  │                            │  ⑨ 设置 SecurityContextHolder
  │  ⑩ 返回资源               │
  │ <───────────────────────── │
```

**JWT vs Session 对比**：

| 维度 | JWT 无状态 | Session 有状态 |
|------|-----------|---------------|
| 存储位置 | 客户端（请求头携带） | 服务端内存/Redis |
| 扩展性 | 天然支持水平扩展 | 需要共享 Session |
| 主动失效 | 不能主动失效 | 可随时销毁 Session |
| 退出登录 | 需要黑名单机制 | 直接清除 Session |
| 适用场景 | 微服务、移动端、跨域认证 | 传统单体应用 |

> **常见陷阱**：JWT Token 无法主动失效导致"退出登录"需要黑名单机制。密码编码器推荐 BCryptPasswordEncoder（自适应哈希、内置盐值）。

---

#### OAuth2 四种授权模式

**授权码模式（Authorization Code）** — 最安全、最常用：

```text
① 用户访问客户端 → 客户端引导用户跳转授权服务器
② 用户登录并授权 → 授权服务器返回授权码
③ 客户端用授权码 + client_secret 交换 Token
④ 授权服务器返回 Access Token + Refresh Token
⑤ 客户端携带 Access Token 访问资源服务器
```

**四种模式对比**：

| 模式 | 适用场景 | 安全等级 |
|------|---------|:-------:|
| 授权码 | Web 应用、需刷新 Token | 最高 |
| 简化（已淘汰）| 纯前端 SPA | 低 |
| 密码（已淘汰）| 第一方信任应用 | 低 |
| 客户端凭证 | 服务间调用 | 中 |

**PKCE 增强**：在授权码基础上增加 `code_verifier` 和 `code_challenge`，即使授权码被截获也无法换取 Token。

> **关联知识点**：SecurityContextHolder → [ThreadLocal 线程隔离](java知识规划——核心.md#13-并发编程) / JWT 认证 → Gateway 鉴权整合

---

**追问链**：`SecurityFilterChain 配置 → 默认 Filter 链顺序 → SecurityContextHolder 存储策略 → JWT 三段结构 → 完整认证流程 → JWT vs Session 对比 → 退出登录黑名单方案 → BCryptPasswordEncoder → OAuth2 授权码模式(最安全) → 四种模式对比 → PKCE 增强`

---

## 2.8 Spring Cloud 微服务

Spring Cloud 构建了完整的微服务治理体系，面试重点在 Nacos（注册+配置）、Gateway（路由）、Sentinel（限流熔断）和 OpenFeign（声明式调用）四大组件的原理与整合。

---

#### Nacos：注册中心 + 配置中心

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

---

#### Gateway 路由网关

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

---

#### Sentinel 限流与熔断

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

---

#### OpenFeign 声明式调用

OpenFeign 通过接口注解定义 HTTP 客户端，动态代理生成实现类。

```java
@FeignClient(
    name = "user-service",
    path = "/api/users",
    fallbackFactory = UserClientFallbackFactory.class
)
public interface UserClient {

    @GetMapping("/{id}")
    Result<User> getUser(@PathVariable Long id);
}
```

**Feign 调用链路**：`@FeignClient 接口调用 → 动态代理发起 HTTP 请求 → RequestInterceptor 拦截 → 负载均衡 → 发送 HTTP 请求 → ErrorDecoder 处理响应`

> **常见陷阱**：Feign 超时不设置或设置过长会导致线程池耗尽；重试机制需要幂等性保证。

---

#### Bootstrap 上下文与配置加载

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

**追问链**：`Nacos 注册中心原理 → 心跳机制 → CAP 权衡(AP/CP) → 配置中心 Namespace/Group/DataId → @RefreshScope 动态刷新 → Gateway 路由三要素 → Predicate 匹配 → Filter 链 → Sentinel 流量控制 → 熔断状态机(Closed/Open/Half-Open) → 滑动窗口/令牌桶/漏桶对比 → OpenFeign 声明式调用 → Feign 调用链路 → 超时重试配置 → Bootstrap 上下文 → 与 @Conditional(2.3) 及线程池拒绝策略(核心1.3) 关联`

---

**整体追问链（方向二）**：`Bean 生命周期 10 步 → 三级缓存解决循环依赖 → AOP 代理选择策略 → @EnableAspectJAutoProxy 底层 → 自调用失效解决方案 → 自动配置加载链路 → @Conditional 条件体系 → 配置加载优先级 → DispatcherServlet doDispatch 流程 → 拦截器 vs 过滤器 → @Transactional 声明式事务原理 → 传播行为七种 → 隔离级别并发问题 → 自调用事务失效 → 默认回滚规则 → JPA N+1 问题 → JOIN FETCH 解决 → SecurityFilterChain → JWT 认证流程 → OAuth2 授权码模式 → Nacos 注册配置 → Gateway 路由 → Sentinel 限流熔断 → OpenFeign 声明式调用 → Bootstrap 上下文`
