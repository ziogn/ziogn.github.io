---
title: "go语言知识规划——核心"
date: "2026-07-23 12:00"
tags: [go, interview, guide, go面试, research]
description: "Go 语言核心技术面试知识规划，覆盖语法概览、接口、错误处理、goroutine 与 channel、sync 包并发原语、Context 包、泛型、标准库概览八大模块，附追问链与跨域知识关联。"
version: 0.0.1
author: ziogn
aliases: [Go核心技术, Go面试核心, Golang核心]
---


# go语言知识规划——核心

> 本文档覆盖面试权重 25% 的 Go 核心知识，按"语法基础 → 接口设计 → 错误处理 → 并发模型 → 同步原语 → 上下文传播 → 泛型 → 标准库"的逻辑递进。与 Redis 缓存、分布式系统、Java 并发模型等方向的知识关联见 [总览文档](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%80%BB%E8%A7%88/) 的跨域链路。

## 1.1 Go 语法概览

Go 语言语法简洁但设计独到，包管理、变量声明、数据类型和控制流均有不同于 C/Java 的语法特性。

---

#### 包管理机制

Go 从 1.11 起引入 Go Modules，1.16 起默认启用，替代了早期的 GOPATH 模式：

- `go.mod` 定义模块路径和依赖，`go.sum` 记录依赖的校验和
- 导入路径使用完整模块路径：`import "github.com/gin-gonic/gin"`
- 未使用的导入会在编译时报错（不允许死代码）
- 包级可见性：**大写字母开头 = 导出（public），小写字母开头 = 包内私有（private）**

```go
// go.mod 示例
module example.com/myapp

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    go.uber.org/zap v1.27.0
)
```

```go
// 导入与可见性
package service

import (
    "fmt"                    // 标准库
    "example.com/myapp/util" // 内部包
)

func PublicFunc() {          // 导出（大写开头）
    fmt.Println(util.Helper())
}

func privateFunc() {         // 私有（小写开头）
    // 仅在当前包内可见
}
```

---

#### 变量声明：var / := / const / iota

Go 的变量声明有四种形式，每种适用不同场景：

```go
// 1. var 声明（显式类型）
var name string = "Alice"
var age int                 // 零值初始化：age = 0

// 2. := 短变量声明（类型推断，仅在函数内使用）
count := 42                 // 推断为 int
msg := "hello"              // 推断为 string

// 3. 多变量声明
var x, y int = 1, 2
a, b := "foo", 42

// 4. const + iota（枚举常量）
type Status int
const (
    Pending Status = iota // 0
    Running               // 1
    Done                  // 2
    Failed                // 3
)

// iota 高级用法：跳过 + 位运算
const (
    Read   = 1 << iota // 1
    Write              // 2
    Execute            // 4
)
```

**零值机制**：Go 中任何变量声明后自动初始化为零值，不存在"未初始化变量"：

| 类型 | 零值 |
|------|------|
| 数值（int/float） | `0` |
| 布尔 | `false` |
| 字符串 | `""` |
| 指针 / slice / map / channel / interface | `nil` |

> **常见陷阱**：
> - `:=` 左侧必须至少有一个新变量，否则编译错误（`no new variables on left side of :=`）
> - `:=` 只能在函数内使用，包级变量只能用 `var`
> - `const` 不能通过运行时计算赋值，iota 只在 const 块中有效
> - 变量声明后未使用 → 编译错误（Go 不允许死代码）

---

#### 数据类型：array / slice / map / struct

**数组**：固定长度，值类型（赋值或传参时复制完整数组）：

```go
var arr [3]int = [3]int{1, 2, 3}
arr2 := [...]int{4, 5, 6} // 编译器推导长度
// arr = arr2  → 复制整个数组（值类型）
```

**Slice**：动态长度，引用类型（底层指向数组的视图）：

```go
// 创建方式
s1 := make([]int, 5)         // len=5, cap=5
s2 := make([]int, 3, 10)     // len=3, cap=10
s3 := []int{1, 2, 3}         // 字面量

// 扩容机制：当 append 超过 cap 时自动扩容
// 容量 < 1024：翻倍；容量 >= 1024：增长 25%
s := make([]int, 0, 2)
s = append(s, 1, 2)          // len=2, cap=2
s = append(s, 3)             // 触发扩容 → len=3, cap=4（翻倍）

// 切片的切片共享底层数组
a := []int{1, 2, 3, 4, 5}
b := a[1:3]                  // [2, 3], len=2, cap=4
b[0] = 99                    // 修改也影响 a → a = [1, 99, 3, 4, 5]

// 陷阱：append 超过 cap 时生成新底层数组，与原切片解耦
c := append(b, 100)          // b cap=4, 未超 cap → 修改 a[3] = 100
```

**Map**：无序键值对，引用类型，必须初始化后才能使用：

```go
// 创建方式
m1 := make(map[string]int)
m2 := map[string]int{"a": 1, "b": 2}

// 读取安全三件套
value, ok := m1["key"]
if !ok {
    // key 不存在
}

// delete 删除
delete(m1, "key")

// 遍历（无序）
for k, v := range m2 {
    fmt.Println(k, v)
}
```

**Struct**：值类型，类似于 Java 的 POJO 但天然没有继承：

```go
type User struct {
    ID    int64
    Name  string
    Email string
}

// 初始化
u1 := User{ID: 1, Name: "Alice"}      // 推荐：命名字段
u2 := User{1, "Alice", ""}            // 不推荐：位置参数，极易出错
u3 := new(User)                        // 返回指针：&User{}

// 方法（Go 没有类，方法依附于类型）
func (u *User) DisplayName() string {
    return fmt.Sprintf("%s (%d)", u.Name, u.ID)
}
```

> **常见陷阱**：
> - slice 的 append 超过 cap 时重新分配底层数组，原 slice 不会感知到新数组（切片共享陷阱）
> - map 的零值是 nil，向 nil map 写入会 panic；读取 nil map 返回零值不会 panic
> - struct 比较：包含 slice/map/function 字段的 struct 不能直接用 `==` 比较
> - slice 没有 `len(s) == 0` 和 `s == nil` 的区别：nil slice 和 empty slice 在 `len` 和 `append` 行为上一致

---

#### 控制流：if / for / switch / defer

Go 的控制流简化了 C 风格的语法，去掉了括号但保留了分号：

```go
// if：条件不加括号，但必须跟大括号
if err := doSomething(); err != nil {
    return err
}

// for：Go 唯一的循环关键字（没有 while/do-while）
// 经典 for
for i := 0; i < 10; i++ {
}
// 相当于 while
for x < 100 {
    x *= 2
}
// 无限循环
for {
    select {}
}

// switch：默认带 break（不需要手动 break），case 可接多个值
switch os := runtime.GOOS; os {
case "darwin", "linux":
    fmt.Println("Unix-like")
case "windows":
    fmt.Println("Windows")
default:
    fmt.Println("Other:", os)
}

// defer：延迟执行（LIFO 栈），常用于资源释放
func readFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close()  // 函数返回时执行，无论是否异常

    // 多个 defer 按 LIFO 顺序执行
    defer fmt.Println("first")   // 后执行
    defer fmt.Println("second")  // 先执行
    return nil
}
```

> **常见陷阱**：
> - `switch` 中如果想继续执行下一个 case，必须显式使用 `fallthrough`
> - `defer` 的参数在**注册时**求值（非执行时），闭包捕获的变量在执行时求值
> - `for range` 遍历时，key 和 value 是复用同一内存地址的变量（闭包陷阱经典考题）

```go
// 经典面试题：闭包陷阱
func main() {
    var funcs []func()
    for _, v := range []int{1, 2, 3} {
        funcs = append(funcs, func() {
            fmt.Println(v) // 打印 3, 3, 3 — 闭包捕获的是 v 的引用
        })
    }
    for _, f := range funcs {
        f()
    }
}
// 修复方法：循环内创建局部变量
for _, v := range []int{1, 2, 3} {
    v := v // 创建副本
    funcs = append(funcs, func() { fmt.Println(v) })
}
```

> **关联知识点**：包管理 → go.mod 与 Maven pom.xml 对比 / var 与 := → 类型推断 / slice 共享陷阱 → Java ArrayList 深拷贝/浅拷贝 / defer → Java finally / for range 闭包 → Java Lambda effectively final

---

## 1.2 Go 接口与面向接口编程

Go 的接口是 duck typing 的典型实现——类型无需显式声明"implements"，只要实现了接口的所有方法即自动满足该接口。

---

#### 隐式实现（Duck Typing）

```go
// 定义接口
type Writer interface {
    Write([]byte) (int, error)
}

// 实现类型不需要声明 implements
type FileWriter struct {
    path string
}

// 只要实现接口的全部方法，就自动满足 Writer 接口
func (f *FileWriter) Write(data []byte) (int, error) {
    return os.WriteFile(f.path, data, 0644)
}

// 使用：任何满足 Writer 的类型都可以传入
func saveData(w Writer, data []byte) error {
    _, err := w.Write(data)
    return err
}
```

**接口带来的正交性**：Go 不需要在类型定义时规划实现哪些接口——接口是调用方定义的，生产方只需实现方法。

```go
// 同一个类型可以自然满足多个接口
type User struct{ Name string }

// 实现 fmt.Stringer
func (u User) String() string { return u.Name }

// 实现 json.Marshaler
func (u User) MarshalJSON() ([]byte, error) {
    return json.Marshal(map[string]string{"name": u.Name})
}
```

---

#### 类型断言

从接口值中提取具体类型：

```go
var w Writer = &FileWriter{path: "/tmp/out"}

// 安全断言（推荐）
if fw, ok := w.(*FileWriter); ok {
    fmt.Println(fw.path) // 断言成功，使用具体类型
} else {
    fmt.Println("类型不是 FileWriter")
}

// 不安全断言（不匹配则 panic）
fw := w.(*FileWriter) // 如果 w 不是 *FileWriter → panic
```

---

#### 空接口 interface{}

空接口没有定义任何方法，因此**任意类型都满足空接口**：

```go
// 任意值可以赋值给空接口
var any interface{}
any = 42
any = "hello"
any = User{}

// 空接口类型断言
func describe(v interface{}) {
    switch val := v.(type) {
    case int:
        fmt.Println("int:", val)
    case string:
        fmt.Println("string:", val)
    case User:
        fmt.Println("User:", val.Name)
    case nil:
        fmt.Println("nil")
    default:
        fmt.Println("unknown type")
    }
}
```

> **Go 1.18 起**：`interface{}` 可以替换为 `any`（类型别名），两者等价。

---

#### type switch

类型断言的 switch 版本，是处理多类型接口值的标准方式：

```go
func inspect(v any) string {
    switch v := v.(type) {
    case nil:
        return "nil"
    case int:
        return fmt.Sprintf("int: %d", v)
    case float64:
        return fmt.Sprintf("float64: %f", v)
    case string:
        return fmt.Sprintf("string: %q", v)
    case bool:
        if v {
            return "true"
        }
        return "false"
    case []byte:
        return fmt.Sprintf("[]byte(len=%d)", len(v))
    default:
        return fmt.Sprintf("unknown(%T)", v)
    }
}
```

**interface 值底层结构**：一个 interface 值由两个指针组成——类型元数据指针（`type`）和数据指针（`data`）。只有类型和数据都为 nil 时，接口值才等于 nil：

```go
var p *int = nil
var i interface{} = p
fmt.Println(i == nil) // false！因为 i 的 type != nil
// i 的底层：(type=*int, data=nil) — type 不为 nil，所以 i != nil
```

> **常见陷阱**：
> - 接口值为 nil 的判断：`(type=*int, data=nil)` 的接口值不是 nil，这是 Go 面试最经典的陷阱之一
> - 空接口 `interface{}` 的使用不意味着绕过了类型安全，它只是推迟了类型检查到运行时
> - 隐式实现没有编译期错误提示——如果类型签名写错（如参数类型不匹配），不会得到"未实现接口"的错误，而是得到"方法未定义"的错误

> **关联知识点**：隐式实现 → 接口隔离原则（ISP）/ 空接口 → 泛型 any / type switch → [泛型类型约束](#17-go-118-泛型) / 接口值 nil 陷阱 → Java 中 Object 引用判空

---

**追问链**：`Go 接口为什么是隐式实现 → 和 Java 显式 implements 的优缺点对比 → 接口值底层结构（type + data 双指针）→ 接口值为 nil 的正确判断方式 → 类型断言的两种写法 → 不安全断言何时 panic → type switch 与 switch v:=v.(type) 语法 → 空接口 interface{} 和 any 的关系 → Go 1.18 泛型后空接口还在用吗 → io.Reader/Writer 接口设计模式`

---

## 1.3 错误处理

Go 没有异常机制（try-catch），错误通过返回值显式传递。这种设计迫使调用者处理每一个错误，但代价是代码中可能出现大量 `if err != nil`。

---

#### error 接口

`error` 是 Go 内置接口：

```go
type error interface {
    Error() string
}
```

任何实现了 `Error() string` 方法的类型都可以作为错误值：

```go
// 自定义错误类型
type ValidationError struct {
    Field string
    Value any
    Msg   string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validate %s(%v): %s", e.Field, e.Value, e.Msg)
}

// 使用
func validateAge(age int) error {
    if age < 0 {
        return &ValidationError{Field: "age", Value: age, Msg: "must be positive"}
    }
    return nil
}
```

---

#### errors.Is / As 错误包装

Go 1.13 引入的 error wrapping 机制：

```go
// 错误包装：使用 %w 创建链式错误
func readConfig() error {
    _, err := os.ReadFile("/etc/app/config.yaml")
    if err != nil {
        return fmt.Errorf("read config: %w", err) // %w 创建包装链
    }
    return nil
}

// errors.Is：检查错误链中是否包含特定目标
func handle() {
    err := readConfig()
    if errors.Is(err, os.ErrNotExist) {
        fmt.Println("配置文件不存在，使用默认值")
    } else if err != nil {
        fmt.Println("读取配置失败:", err)
    }
}

// errors.As：提取错误链中特定类型的错误
func handleAs() {
    err := readConfig()
    var pathErr *os.PathError
    if errors.As(err, &pathErr) {
        fmt.Printf("路径错误: %s (操作: %s)\n", pathErr.Path, pathErr.Op)
    }
}
```

**错误链遍历机制**：

```text
err  ──┐
       ├─ Unwrap() → error（如果实现了 Unwrap 接口）
       └─ errors.Is/As 从外到内递归遍历 Unwrap 链
```

```go
// 自定义错误实现 Unwrap
type WrappedError struct {
    Msg string
    Err error
}

func (e *WrappedError) Error() string {
    return fmt.Sprintf("%s: %v", e.Msg, e.Err)
}

func (e *WrappedError) Unwrap() error {
    return e.Err
}
```

**何时用 Is / As vs ==**：
- 需要匹配 sentinel error（如 `io.EOF`、`os.ErrNotExist`）→ `errors.Is`
- 需要提取错误详细信息 → `errors.As`
- 简单判断非 nil → `err != nil`

---

#### panic / recover

Go 的 panic 类似于 Java 的 RuntimeException——表示不可恢复的异常情况：

```go
// panic：主动触发
func mustParse(input string) int {
    v, err := strconv.Atoi(input)
    if err != nil {
        panic(fmt.Sprintf("非法输入: %s", input))
    }
    return v
}

// recover：在 defer 中捕获 panic（类似 try-catch 的 finally）
func safeCall(fn func()) (err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic recovered: %v", r)
        }
    }()
    fn()
    return nil
}
```

**recover 适用场景**：

| 场景 | 是否应使用 recover | 说明 |
|------|-------------------|------|
| goroutine 入口 | 是 | 防止单个 goroutine panic 导致整个进程崩溃 |
| HTTP handler 顶层 | 是 | 返回 500 而非进程退出 |
| 普通函数中做分支逻辑 | **否** | 这是 Java try-catch 思维，Go 中应返回 error |
| 库代码中 | 否 | 让调用者决定如何处理 |

```go
// goroutine 入口 recover 的典型用法
func safeGo(fn func()) {
    go func() {
        defer func() {
            if r := recover(); r != nil {
                log.Printf("goroutine panic: %v\n%s", r, debug.Stack())
            }
        }()
        fn()
    }()
}
```

---

#### defer 资源管理

defer 将函数调用延迟到当前函数返回前执行，采用 **LIFO（后进先出）** 顺序：

```go
func copyFile(src, dst string) error {
    in, err := os.Open(src)
    if err != nil {
        return err
    }
    defer in.Close()   // 1. 后执行

    out, err := os.Create(dst)
    if err != nil {
        return err
    }
    defer out.Close()  // 2. 先执行

    _, err = io.Copy(out, in)
    return err
}
```

**defer 参数求值时点**（面试高频）：

```go
func deferTrap() {
    x := 1
    defer fmt.Println(x)           // 输出 1（defer 注册时 x=1 已求值）
    defer func() { fmt.Println(x) }() // 输出 2（闭包捕获 x 的引用）
    defer func(v int) { fmt.Println(v) }(x) // 输出 1（参数传值）
    x = 2
}
// 输出顺序（LIFO）：1 → 2 → 1
```

> **常见陷阱**：
> - goroutine 的入口函数若 panic 未被 recover 会导致整个进程崩溃，务必在 goroutine 入口使用 recover
> - `recover()` 必须在 `defer` 的函数中**直接调用**才有效，在 defer 的嵌套函数中调用会失效
> - `fmt.Errorf("...%w...")` 只能包装一个 error；Go 1.20 起可用 `errors.Join` 合并多个 error
> - 自定义错误如实现了 `Error() string`，避免同类型同时用 `Is()`/`As()` 方法覆盖默认的 Unwrap 链逻辑

> **关联知识点**：error 接口 → Java Exception 对比 / errors.Is/As → Java instanceof 检查异常类型 / panic 类似 RuntimeException / defer → Java finally（但不完全等同） / error wrapping → 异常链 pattern

---

**追问链**：`error 是接口还是类型 → 自定义错误如何实现 → %w 和 %v 的区别 → errors.Is 和 errors.As 的区别 → 和直接 == 比较的差异 → Unwrap 链如何遍历 → 什么时候用 panic → recover 为什么必须在 defer 中直接调用 → goroutine panic 进程崩溃场景 → defer LIFO 顺序 → 参数求值时点和闭包捕获的区别 → 和 Java try-catch-finally 异常处理的本质区别（返回值和控制流）`

---

## 1.4 goroutine 与 channel

goroutine 和 channel 是 Go 并发模型的核心，CSP（Communicating Sequential Processes）理论的 Go 实现。**不要通过共享内存来通信，而要通过通信来共享内存。**

---

#### goroutine 轻量级线程

goroutine 是由 Go 运行时管理的用户态线程（协程），远轻于 OS 线程：

```go
// 启动 goroutine
go func() {
    fmt.Println("hello from goroutine")
}()

go processRequest(req) // 直接启动函数
```

**goroutine vs OS 线程**：

| 维度 | goroutine | OS 线程（Java 平台线程） |
|------|-----------|------------------------|
| 创建成本 | 几 KB 栈（初始 2KB，动态伸缩） | 1MB+ 固定栈 |
| 调度者 | Go 运行时（GMP 模型） | OS 内核 |
| 调度成本 | 用户态上下文切换（M → P → G） | 内核态系统调用 |
| 创建数量 | 数十万到百万 | 数千到万 |
| 栈增长 | 动态（2KB 起步，最大 1GB） | 固定大小，事先分配 |

**GMP 调度模型**：

```text
M（Machine）= OS 线程，数量 ≈ GOMAXPROCS（默认 CPU 核数）
P（Processor）= 调度上下文，持有本地 goroutine 队列
G（Goroutine）= 一个 goroutine

            Go 调度循环（用户态）
M1 ── P1 ── [G1 → G2 → G3 ...]  ← 本地队列
       │
       └── 全局队列（G 调度器维护）
              │
M2 ── P2 ── [G4 → G5 ...]

工作窃取：某个 P 的本地队列为空时，尝试从其他 P 或全局队列窃取 G
系统调用：G 进入 syscall → M1 阻塞 → P 绑定新的 M2 → syscall 返回后 G 尝试重绑 P
```

**`goexit`**：`runtime.Goexit()` 终止当前 goroutine，但所有 defer 仍会执行。

---

#### channel 无缓冲 / 有缓冲

Channel 是 goroutine 之间的通信管道，类型安全：

```go
// 无缓冲 channel：同步通信（发送和接收必须同时就绪）
ch := make(chan int)
go func() {
    ch <- 42 // 阻塞直到有人接收
}()
val := <-ch // 阻塞直到有人发送
fmt.Println(val) // 42

// 有缓冲 channel：异步通信（缓冲区满之前不阻塞）
buffered := make(chan string, 3)
buffered <- "a" // 不阻塞
buffered <- "b" // 不阻塞
buffered <- "c" // 不阻塞
// buffered <- "d" // 阻塞：缓冲区已满

fmt.Println(<-buffered) // "a"（FIFO）
fmt.Println(<-buffered) // "b"
```

**channel 是否关闭的判断**：

```go
// 通过 ok 判断 channel 是否关闭
val, ok := <-ch
if !ok {
    fmt.Println("channel 已关闭")
}
```

**关闭 channel 的规则**：

| 操作 | 未关闭 | 已关闭 |
|------|--------|--------|
| 发送 `ch <- v` | 成功或阻塞 | **panic**（向已关闭 channel 发送数据） |
| 接收 `<-ch` | 成功或阻塞 | 返回零值 + ok=false |
| 关闭 `close(ch)` | 成功关闭 | **panic**（重复关闭） |
| range 遍历 | 阻塞等待 | 遍历完缓冲区中剩余数据后结束 |

---

#### for range channel

自动遍历 channel 直到关闭：

```go
func producer(out chan<- int) {
    for i := 0; i < 5; i++ {
        out <- i
    }
    close(out) // 必须关闭，否则 consumer 死锁
}

func consumer(in <-chan int) {
    for v := range in { // 自动检测 channel 关闭
        fmt.Println("收到:", v)
    }
}

func main() {
    ch := make(chan int, 5)
    go producer(ch)
    consumer(ch)
}
```

**单向 channel 约束**：

```go
// 函数参数可以约束 channel 方向
func producer(out chan<- int) {}   // 只写
func consumer(in <-chan int) {}    // 只读

// 双向 channel 可以隐式转换为单向，反之不行
ch := make(chan int)
producer(ch) // 合法：双向 → 只写
consumer(ch) // 合法：双向 → 只读
```

---

#### select 多路复用

select 同时监听多个 channel 操作，任一就绪则执行对应分支（类似 Unix select/epoll）：

```go
func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)

    go func() {
        time.Sleep(100 * time.Millisecond)
        ch1 <- "one"
    }()
    go func() {
        time.Sleep(200 * time.Millisecond)
        ch2 <- "two"
    }()

    select {
    case msg1 := <-ch1:
        fmt.Println("收到 ch1:", msg1)
    case msg2 := <-ch2:
        fmt.Println("收到 ch2:", msg2)
    case <-time.After(50 * time.Millisecond):
        fmt.Println("超时") // 50ms 超时，先触发
    }
}
```

**select 高级模式**：

```go
// 非阻塞收发
select {
case ch <- v:
    // 发送成功
default:
    // 不阻塞，走这里
}

// 定时器 + 循环
ticker := time.NewTicker(1 * time.Second)
defer ticker.Stop()

for {
    select {
    case <-ticker.C:
        fmt.Println("tick")
    case <-ctx.Done():
        fmt.Println("done")
        return
    }
}
```

**select 与 for 配合的典型 worker 模式**：

```go
func worker(id int, jobs <-chan int, results chan<- int) {
    for job := range jobs {
        results <- job * 2
    }
}

func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)

    // 启动 3 个 worker
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }

    // 发送 5 个任务
    for j := 1; j <= 5; j++ {
        jobs <- j
    }
    close(jobs)

    // 收集结果
    for r := 1; r <= 5; r++ {
        <-results
    }
}
```

> **常见陷阱**：
> - 向已关闭的 channel 发送数据 → panic（必须由发送方 close，且只 close 一次）
> - select 中如果多个 case 同时就绪，随机选择一个执行（不是按顺序）
> - nil channel 在 select 中永远不会就绪，可用于动态启用/禁用 case
> - for range channel 的发送方不 close 会导致接收方死锁
> - goroutine 泄漏：goroutine 在 channel 上阻塞等待，但没有其他 goroutine 发送/接收

> **关联知识点**：goroutine → Java 虚拟线程（Project Loom）对比 / channel → BlockingQueue / GMP 模型 → Java 线程调度 / select → NIO Selector 多路复用 / worker 模式 → Java 线程池相似设计

---

## 1.5 sync 包并发原语

sync 包提供基本的同步原语，在处理共享数据的低级并发控制时使用。写 Go 应优先使用 channel 通信，只在必要时用 sync 互斥，但面试中 sync 包是高频考点。

---

#### Mutex / RWMutex

```go
// Mutex：互斥锁
var mu sync.Mutex
var counter int

func increment() {
    mu.Lock()
    counter++ // 临界区
    mu.Unlock()
}
```

**RWMutex：读写锁**（读读不互斥，读写互斥，写写互斥）：

```go
type SafeCache struct {
    mu    sync.RWMutex
    items map[string]any
}

func (c *SafeCache) Get(key string) any {
    c.mu.RLock() // 读锁：可多个 goroutine 同时持有
    defer c.mu.RUnlock()
    return c.items[key]
}

func (c *SafeCache) Set(key string, value any) {
    c.mu.Lock() // 写锁：互斥所有读锁和其他写锁
    defer c.mu.Unlock()
    c.items[key] = value
}
```

| 对比 | Mutex | RWMutex |
|------|-------|---------|
| 模式 | 互斥（同一时间只有一个 goroutine 持有） | 多读单写 |
| 读并发 | 不区分，写时也不可读 | 多个读可同时进行 |
| 适用场景 | 写多读少或写频繁 | 读多写少（如缓存） |
| 性能特点 | 简单、低开销 | 高并发读场景远优于 Mutex |

**Mutex 不可重入**：Go 的 Mutex 不是可重入锁。同一 goroutine 对已锁住的 Mutex 再次 Lock() 会导致**死锁**（与 Java ReentrantLock 的显著区别）：

```go
var mu sync.Mutex

func foo() {
    mu.Lock()
    bar() // bar 中再次 Lock() → 死锁！
    mu.Unlock()
}

func bar() {
    mu.Lock()
    // ...
    mu.Unlock()
}
```

---

#### WaitGroup

等待一组 goroutine 完成归来的计数器：

```go
func main() {
    var wg sync.WaitGroup

    for i := 1; i <= 5; i++ {
        wg.Add(1) // 计数器 +1
        go func(id int) {
            defer wg.Done() // 计数器 -1
            doWork(id)
        }(i)
    }

    wg.Wait() // 阻塞直到计数器归零
    fmt.Println("所有 goroutine 完成")
}
```

**WaitGroup 常见误区**：

```go
// 错误：Add 在 goroutine 内部
go func() {
    wg.Add(1) // 如果主 goroutine 先执行到 wg.Wait()，计数器可能为 0
    defer wg.Done()
    // ...
}()

// 正确：Add 在启动 goroutine 之前（主 goroutine 中）
wg.Add(1)
go func() {
    defer wg.Done()
    // ...
}()
```

---

#### Once

确保某个函数只被执行一次（类似 Java 懒加载的 double-check）：

```go
var once sync.Once
var instance *Singleton

func GetInstance() *Singleton {
    once.Do(func() {
        instance = &Singleton{} // 只执行一次
    })
    return instance
}
```

**底层实现**：内部维护一个 `done uint32` + `Mutex`。通过 atomic 的 `Load`/`CAS` 操作检查，第一次调用时加锁执行，后续直接返回。

---

#### Cond

条件变量——让一组 goroutine 在某个条件满足时被唤醒：

```go
type Queue struct {
    items []int
    cond  *sync.Cond
}

func NewQueue() *Queue {
    return &Queue{
        cond: sync.NewCond(&sync.Mutex{}),
    }
}

func (q *Queue) Put(item int) {
    q.cond.L.Lock()
    defer q.cond.L.Unlock()

    q.items = append(q.items, item)
    q.cond.Signal() // 唤醒一个等待者
}

func (q *Queue) Get() int {
    q.cond.L.Lock()
    defer q.cond.L.Unlock()

    for len(q.items) == 0 {
        q.cond.Wait() // 释放锁并阻塞，被唤醒后重新获取锁
    }
    item := q.items[0]
    q.items = q.items[1:]
    return item
}
```

**Wait 必须用 for 循环检查条件**：`spurious wakeup`（虚假唤醒）可能导致条件未满足时返回，因此需循环判断。

---

#### Sync.Map

Go 1.9 引入的并发安全 map，针对特定场景做了优化：

```go
var m sync.Map

// 写入
m.Store("key", "value")

// 读取
v, ok := m.Load("key")

// 读取或写入（存在则返回，不存在则写入）
v, loaded := m.LoadOrStore("key", "default")

// 删除
m.Delete("key")

// 遍历
m.Range(func(key, value any) bool {
    fmt.Println(key, value)
    return true // 返回 false 停止遍历
})
```

**Sync.Map vs RWMutex + map**：

| 维度 | sync.Map | RWMutex + map |
|------|---------|---------------|
| 读场景 | 适合读多写少 + key 稳定（read-only 缓存命中率高） | 通用场景 |
| 写场景 | 写多时退化为类似 RWMutex，优势不明显 | 写频繁时更直接 |
| 遍历 | `Range()` 带快照语义 | 需要加锁拷贝或持有锁遍历 |
| 类型安全 | 使用 `any`，运行时类型断言 | 通过 map 泛型（Go 1.18+）编译期类型安全 |
| 适用 | 全局配置、计数器、热点缓存 | 大多数场景，使用 `sync.Mutex + map[K]V` 即可 |

**底层结构**（了解即可）：

```text
sync.Map
 ├─ read（atomic.Value，存 amap 只读快照） ← 无锁读取
 ├─ dirty（map[any]*entry）                   ← 写时复制
 ├─ misses（int）                             ← read 未命中计数
 └─ mu（Mutex）                               ← 提升 dirty 时加锁

读流程：
  1. 从 read 中读取（无锁）→ 命中则返回
  2. miss 计数 +1 → 若 miss >= len(dirty) → 将 dirty 提升为 read
  3. 加锁，从 dirty 中读取
```

> **常见陷阱**：
> - Mutex 不可重入：同一 goroutine 二次 Lock 导致死锁（与 Java 不同）
> - Mutex 锁拷贝：sync.Mutex 是值类型，传递时拷贝会导致两个不同的锁实例
> - WaitGroup 的 Add 必须在 goroutine 启动前调用，否则可能过早 Wait 返回
> - Cond 的 Wait 必须在 for 循环中检查条件——关注虚假唤醒
> - sync.Map 的单次删除操作不会回写 read 到 dirty，读命中率逐渐下降
> - 使用 `defer mu.Unlock()` 和显式 `mu.Unlock()` 各有优劣：defer 确保释放但有微小的函数调用开销

> **关联知识点**：Mutex → Java synchronized / RWMutex → Java ReentrantReadWriteLock / WaitGroup → Java CountDownLatch / Once → Java 静态内部类懒加载 / Cond → Condition / Sync.Map → ConcurrentHashMap / 不可重入 → Go 设计哲学（简单明确）

---

## 1.6 Context 包

context 包用于传递请求范围的值、取消信号和截止时间，是 Go 并发编程的核心工具之一，被 HTTP 服务端、数据库驱动、gRPC 等广泛采用。

---

#### Context 接口

```go
type Context interface {
    Deadline() (deadline time.Time, ok bool) // 返回截止时间
    Done() <-chan struct{}                   // 返回关闭的 channel（取消时关闭）
    Err() error                              // 返回取消原因（Canceled / DeadlineExceeded）
    Value(key any) any                       // 返回关联值（线程安全）
}
```

**Context 树**：

```text
context.Background()        ← 根节点（通常用于 main / 入口）
    │
    ├─ context.TODO()       ← 占位符（还不确定用什么 Context）
    │
    ├─ WithCancel(parent)   → ctx, cancel
    ├─ WithDeadline(parent, t) → ctx, cancel
    ├─ WithTimeout(parent, d) → ctx, cancel
    └─ WithValue(parent, k, v) → ctx
```

---

#### WithCancel / WithDeadline / WithTimeout / WithValue

```go
// WithCancel：手动取消
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel() // 务必 defer，防止资源泄漏

    go doWork(ctx)

    time.Sleep(100 * time.Millisecond)
    cancel() // 通知所有监听 ctx.Done() 的 goroutine
    time.Sleep(50 * time.Millisecond)
}

func doWork(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            fmt.Println("工作被取消:", ctx.Err())
            return
        default:
            fmt.Println("工作中...")
            time.Sleep(30 * time.Millisecond)
        }
    }
}
```

```go
// WithTimeout：超时自动取消
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()

// WithDeadline：指定截止时间
deadline := time.Now().Add(2 * time.Second)
ctx, cancel = context.WithDeadline(context.Background(), deadline)
defer cancel()
```

```go
// WithValue：传递请求范围的值（线程安全，不依赖 goroutine 隔离）
type traceIDKey struct{}

func WithTraceID(ctx context.Context, traceID string) context.Context {
    return context.WithValue(ctx, traceIDKey{}, traceID)
}

func GetTraceID(ctx context.Context) string {
    if id, ok := ctx.Value(traceIDKey{}).(string); ok {
        return id
    }
    return "unknown"
}

// 使用
ctx := WithTraceID(context.Background(), "abc-123")
fmt.Println(GetTraceID(ctx)) // abc-123
```

---

#### 取消传播链

Context 形成父子树，父 Context 取消会传播给所有派生 Context：

```go
func main() {
    ctx := context.Background()

    // 一级节点
    ctxA, cancelA := context.WithCancel(ctx)
    defer cancelA()

    // 二级节点（从 ctxA 派生）
    ctxB, cancelB := context.WithTimeout(ctxA, 10*time.Second)
    defer cancelB()

    // 三级节点（从 ctxB 派生）
    ctxC, _ := context.WithCancel(ctxB)

    // 取消 ctxA → ctxB 和 ctxC 全部取消（传播链向下传递）
    cancelA()

    fmt.Println(ctxA.Err()) // Canceled
    fmt.Println(ctxB.Err()) // Canceled（父取消，子跟随）
    fmt.Println(ctxC.Err()) // Canceled

    select {
    case <-ctxB.Done():
        fmt.Println("ctxB 也被取消了")
    default:
    }
}
```

**取消传播机制**：每个派生 Context 内部持有指向父 Context 的引用。父 Context 被取消时，通过 channel 通知所有子 Context（遍历 children 链表，关闭 done channel）。

**使用 Context 的最佳实践**：

```go
// 正确：函数签名第一个参数为 Context
func HandleRequest(ctx context.Context, req *Request) (*Response, error) {
    // 使用 WithTimeout 添加超时控制
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    result, err := queryDB(ctx, req.Query)
    if err != nil {
        return nil, err
    }
    return &Response{Data: result}, nil
}

// 正确：传递给调用链
func queryDB(ctx context.Context, query string) ([]Result, error) {
    // 数据库驱动自身监听 ctx.Done()
    rows, err := db.QueryContext(ctx, query)
    // ...
}
```

> **常见陷阱**：
> - 不要将 Context 存储在结构体中，应作为函数的第一个参数显式传递
> - 任何创建派生 Context 的函数必须确保 `cancel()` 被调用（defer cancel()），否则造成 goroutine 泄漏
> - WithValue 的 key 应使用自定义类型而非 string，避免不同包之间的 key 冲突
> - 不要传递 nil Context，不确定时用 `context.TODO()`
> - Context 的 Value 不应用于传递可选参数——那是函数参数的责任

> **关联知识点**：Context 取消传播 → Java 虚拟线程中断机制 / WithTimeout → [CompletableFuture orTimeout](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%A0%B8%E5%BF%83/#completablefuture-异步编排) / WithValue → ThreadLocal（但 Context 是显式传递而非隐式线程隔离）/ Done channel → select 多路复用

---

## 1.7 Go 1.18+ 泛型

Go 1.18 正式引入泛型，是 Go 语言发布以来最大的语法变更。泛型在标准库（slices、maps、constraints 包）中得到广泛应用。

---

#### 类型参数

```go
// 泛型函数
func Print[T any](v T) {
    fmt.Println(v)
}

// 使用
Print[int](42)    // 显式指定类型参数
Print("hello")    // 类型推断，省略类型参数

// 泛型类型
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(v T) {
    s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T // 获取零值的技巧
        return zero, false
    }
    v := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return v, true
}

// 使用
s := Stack[int]{}
s.Push(1)
s.Push(2)
v, _ := s.Pop()
fmt.Println(v) // 2
```

---

#### 类型约束（any / comparable / 自定义 constraint）

```go
// any：所有类型都满足（等价于 interface{}）
func Identity[T any](v T) T { return v }

// comparable：可比较类型（支持 == 和 !=）
func Contains[T comparable](slice []T, target T) bool {
    for _, v := range slice {
        if v == target {
            return true
        }
    }
    return false
}

// 自定义约束：使用 interface 定义类型集
type Number interface {
    ~int | ~int64 | ~float64 // ~ 表示底层类型匹配
}

func Sum[T Number](values []T) T {
    var sum T
    for _, v := range values {
        sum += v
    }
    return sum
}

// 多约束组合
type Ordered interface {
    ~int | ~int64 | ~float64 | ~string
}

func Max[T Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}
```

---

#### 泛型函数与泛型类型的实际应用

```go
// 泛型 Map/Filter（类似 Java Stream）
func Map[T, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = fn(v)
    }
    return result
}

func Filter[T any](slice []T, fn func(T) bool) []T {
    var result []T
    for _, v := range slice {
        if fn(v) {
            result = append(result, v)
        }
    }
    return result
}

// 使用
nums := []int{1, 2, 3, 4, 5}
doubled := Map(nums, func(v int) int { return v * 2 })
evens := Filter(nums, func(v int) bool { return v%2 == 0 })
```

**泛型之前的替代方案**：泛型引入前，Go 通过 `interface{}` + 类型断言实现类似功能，但丢失了类型安全且性能更差：

```go
// 老方式：interface{} + 类型断言
func OldMax(a, b interface{}) interface{} {
    // 需要手动处理每种类型的比较
    switch a := a.(type) {
    case int:
        return maxInt(a, b.(int))
    case float64:
        return maxFloat(a, b.(float64))
    }
    return nil
}

// 泛型方式：编译期类型安全，无运行时开销
func MaxGeneric[T Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}
```

| 对比 | interface{} + 断言 | 泛型 |
|------|------------------|------|
| 类型安全 | 运行时检查，错误延迟 | 编译期检查，即时发现 |
| 性能 | 装箱/拆箱 + 反射开销 | 编译期单态化（monomorphization），无运行时开销 |
| 代码量 | 每种类型需重复实现或反射 | 一份代码适用所有类型 |
| 可读性 | 需要类型断言和零值处理 | 直观，类型参数一目了然 |

> **常见陷阱**：
> - 泛型方法：Go 的泛型目前只支持泛型函数和泛型类型，不支持泛型方法（带额外类型参数的 Receiver 方法）
> - `~` 前缀的约束：`~int` 底层类型为 int 的类型也满足（如 `type MyInt int`），不加 `~` 则只匹配字面类型
> - 泛型无法用于所有场景：Go 泛型不支持变长类型参数、协变/逆变
> - 编译器性能：泛型通过单态化（monomorphization）实现，大量使用泛型可能增加二进制体积

> **关联知识点**：泛型 → Java 泛型对比（类型擦除 vs 单态化）/ 类型约束 → Go 接口作为类型集 / comparable → map key 必须可比较 / 泛型函数 → 标准库的 slices / maps 包

---

## 1.8 标准库概览

Go 的标准库设计精良，涵盖网络、IO、序列化、时间处理等常见需求，不需要第三方框架即可构建生产级应用。

---

#### fmt — 格式化输入输出

```go
// Printf 家族
fmt.Printf("name=%s, age=%d\n", "Alice", 30)
fmt.Sprintf("hello %s", "world") // 返回字符串

// 动词
// %v  默认格式
// %+v 结构体打印字段名
// %#v 带有包名的完整语法表示
// %T  类型
// %d  十进制整数
// %s  字符串
// %q  带引号的字符串
// %b / %x / %o  二进制、十六进制、八进制

type User struct{ Name string }
u := User{"Alice"}
fmt.Printf("%v\n", u)   // {Alice}
fmt.Printf("%+v\n", u)  // {Name:Alice}
fmt.Printf("%#v\n", u)  // main.User{Name:"Alice"}
fmt.Printf("%T\n", u)   // main.User
```

---

#### net/http — HTTP 客户端与服务端

**服务端**：

```go
// 最简单的 HTTP 服务
http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, %s!", r.URL.Query().Get("name"))
})
log.Fatal(http.ListenAndServe(":8080", nil))

// 高级：自定义 Handler
type GreetHandler struct{}

func (h *GreetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "message": "hello",
    })
}

mux := http.NewServeMux()
mux.Handle("/api/greet", &GreetHandler{})

server := &http.Server{
    Addr:         ":8080",
    Handler:      mux,
    ReadTimeout:  10 * time.Second,
    WriteTimeout: 10 * time.Second,
}
log.Fatal(server.ListenAndServe())
```

**客户端**：

```go
// 基础 GET 请求
resp, err := http.Get("https://api.example.com/users")
if err != nil {
    return err
}
defer resp.Body.Close()

body, err := io.ReadAll(resp.Body)

// POST JSON
data := map[string]any{"name": "Alice"}
jsonData, _ := json.Marshal(data)
resp, err = http.Post("https://api.example.com/users",
    "application/json", bytes.NewReader(jsonData))

// 自定义客户端（推荐生产使用）
client := &http.Client{
    Timeout: 10 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns:        100,
        IdleConnTimeout:     90 * time.Second,
        DisableCompression:  false,
    },
}
```

| 方法 | 说明 |
|------|------|
| `http.Get(url)` | 简单 GET，不推荐生产（无超时控制） |
| `http.Post(url, contentType, body)` | 简单 POST |
| `http.NewRequest(method, url, body)` | 构建完整请求（自定义 header/cookie） |
| `client.Do(req)` | 执行请求（支持超时、重定向控制） |

---

#### sync — 已在 §1.5 详述

#### io — IO 接口与组合

io 包的核心是一组精巧的接口，体现了 Go 接口设计的最小正交原则：

```go
// 核心接口
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type Closer interface {
    Close() error
}

type Seeker interface {
    Seek(offset int64, whence int) (int64, error)
}
```

**流式处理**：

```go
// 文件读取（实现了 Reader + Writer）
f, _ := os.Open("input.txt")
defer f.Close()

// 用 io.Copy 实现流式传输
io.Copy(os.Stdout, f) // 文件内容直接写入 stdout（零拷贝）

// 组合接口
type ReadWriter interface {
    Reader
    Writer
}

// 常用组合工具
bufio.NewReader(reader)        // 带缓冲读取
bufio.NewScanner(reader)       // 按行扫描
ioutil.ReadAll(reader)         // 已废弃，改用 io.ReadAll
io.MultiReader(r1, r2)         // 顺序读取多个 Reader
io.TeeReader(reader, writer)   // 读取的同时写入（类似 Unix tee）
```

---

#### os — 操作系统交互

```go
// 文件操作
f, err := os.Create("output.txt") // 创建文件
f, err := os.OpenFile("log.txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)

// 目录操作
entries, _ := os.ReadDir(".")      // 读取目录（Go 1.16+）
info, _ := os.Stat("file.txt")     // 文件信息
os.MkdirAll("a/b/c", 0755)         // 递归创建目录

// 环境变量
os.Getenv("HOME")
os.Setenv("DEBUG", "true")
os.LookupEnv("PATH") // 带是否存在判断

// 进程
os.Exit(1)           // 退出（不会执行 defer）
os.Getpid()
os.Hostname()
```

---

#### encoding/json — JSON 序列化

```go
type User struct {
    ID    int64  `json:"id,string"`         // 自定义字段名 + 字符串编码
    Name  string `json:"name"`
    Email string `json:"email,omitempty"`    // 为空时省略
    Role  string `json:"-"`                  // 忽略该字段
}

// 序列化
u := User{ID: 1, Name: "Alice", Email: ""}
data, err := json.Marshal(u)
fmt.Println(string(data)) // {"id":"1","name":"Alice"}

data, err = json.MarshalIndent(u, "", "  ") // 格式化输出

// 反序列化
var u2 User
err = json.Unmarshal([]byte(`{"id":"2","name":"Bob"}`), &u2)

// 流式 JSON
decoder := json.NewDecoder(resp.Body)
for decoder.More() {
    var item User
    decoder.Decode(&item)
}
```

---

#### time — 时间处理

```go
// 时间常量与操作
now := time.Now()
later := now.Add(2 * time.Hour)
diff := later.Sub(now) // 2h0m0s

// 格式化和解析（Go 的参考时间是 Mon Jan 2 15:04:05 MST 2006 = 01/02 03:04:05PM '06 -0700）
fmt.Println(now.Format("2006-01-02 15:04:05")) // 2026-07-23 12:00:00

parsed, _ := time.Parse("2006-01-02", "2026-07-23")

// 定时器
timer := time.NewTimer(1 * time.Second)
<-timer.C // 阻塞 1 秒

ticker := time.NewTicker(1 * time.Second)
for range ticker.C {
    // 每秒执行一次
}

// 超时
select {
case <-time.After(100 * time.Millisecond):
    fmt.Println("超时")
case result := <-ch:
    fmt.Println(result)
}
```

---

#### strings / strconv — 字符串操作

```go
// strings 包
s := "hello, world"
strings.Contains(s, "world")         // true
strings.HasPrefix(s, "hello")        // true
strings.Split(s, ",")                // ["hello", " world"]
strings.Join([]string{"a", "b"}, "-") // "a-b"
strings.TrimSpace("  hi  ")          // "hi"
strings.ReplaceAll("a-b-c", "-", ".") // "a.b.c"
stringBuilder := strings.Builder{}    // 高效字符串拼接

// strconv 包
n, _ := strconv.Atoi("42")           // string → int
s := strconv.Itoa(42)                // int → string
f, _ := strconv.ParseFloat("3.14", 64)
b, _ := strconv.ParseBool("true")
quoted := strconv.Quote("hello")     // "hello"（带引号）
```

> **常见陷阱**：
> - `http.Get()` 的 response body 必须 close（`defer resp.Body.Close()`），否则连接泄漏
> - `time.Parse` 的格式字符串必须使用 Go 的参考时间（2006-01-02 15:04:05），不能用其他格式
> - `json.Unmarshal` 要求目标必须是指针，且结构体字段必须导出（大写开头）
> - `os.Exit()` 不会执行 defer，需要在退出前手动清理
> - `json.Encoder` 的 `SetEscapeHTML(false)` 可在输出中避免 `<`/`>`/`&` 转义

> **关联知识点**：net/http → Java Spring MVC / io.Reader → Java InputStream / encoding/json → Jackson / time.Time → Java Instant/LocalDateTime / strings → Java StringUtils / 标准库最小接口设计 → io.Reader/Writer 的 interface 组合哲学

---

**追问链**：`fmt.Printf 常用动词（%v %+v %#v %T 区别）→ net/http 如何创建服务端和客户端 → ServeMux 路由原理 → 如何优雅关闭 HTTP 服务（Shutdown）→ io 包核心接口（Reader/Writer）→ 流式处理 io.Copy → os.File / os.ReadDir → json.Marshal 的 struct tag（json:"name,omitempty"）→ time.Format 为什么用 2006-01-02 → 和 Java SimpleDateFormat 的区别 → strings.Builder 为什么比 + 拼接高效 → strconv vs fmt.Sprintf 性能对比`

---

## 面试高频追问链

按照从易到难、逐层深入的追问路径，串联八大知识点：

**语法基础**：`包管理 go.mod 结构 → var vs := 区别 → iota 枚举机制 → slice 底层结构（ptr/len/cap）→ 扩容策略（<1024 翻倍，>=1024 25%）→ slice 共享底层数组陷阱 → map 遍历顺序随机性 → struct 值类型特点 → defer LIFO 顺序 → defer 参数求值时点 → for range 闭包陷阱`

**接口 → 错误处理**：`接口隐式实现和 Java 显式 implements 对比 → 接口值底层（type+data 双指针）→ 接口判空陷阱 → errors.Is vs errors.As 区别 → %w 错误包装 → 自定义 error 实现 Unwrap → panic/recover 适用场景 → recover 必须 defer 直接调用 → goroutine panic 进程崩溃`

**goroutine → channel**：`goroutine 和 OS 线程区别（2KB 栈 vs 1MB）→ GMP 调度模型 → work stealing → goroutine 泄漏场景 → channel 无缓冲 vs 有缓冲区别 → 关闭 channel 的 panic 场景 → select 多路复用 → for range channel 必须 close → nil channel 在 select 中的行为`

**sync → Context → 泛型**：`Mutex 不可重入（和 Java 区别）→ RWMutex 适用场景 → WaitGroup Add 位置 → Once 底层实现 → Cond Wait 必须在 for 循环 → sync.Map 与 RWMutex+map 对比 → Context 接口四个方法 → 取消传播链 → WithTimeout vs WithDeadline → Context 不要在 struct 中存储 → 泛型类型约束 any/comparable → 自定义 constraint ~ 前缀含义 → interface{} 断言 vs 泛型编译期安全的性能差异`

---

## 跨域知识关联

1. **goroutine + channel → Java 虚拟线程与 BlockingQueue**：goroutine 与 Java 21 虚拟线程的思路异曲同工（用户态线程、轻量级栈），但 Go 的 channel 提供了 CSP 通信模型，而 Java 偏向于锁和共享内存。了解两者的设计差异有助于在分布式系统中选择合适的并发模型。

2. **Context 取消传播 → 分布式系统链路追踪**：Context 的 WithValue 隐式传递 TraceID，是分布式链路追踪（如 OpenTelemetry）的基础机制。与 [Spring Cloud Sleuth](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94spring/) 的 MDC TraceId 传播、Redis 分布式锁中的上下文传递有相通的设计哲学。

3. **sync.Mutex 不可重入 → Redis 分布式锁重入问题**：Go Mutex 不可重入（同一 goroutine 二次 Lock 死锁）与 Redis 分布式锁中不可重入导致死锁的场景高度吻合，与 [Redisson](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94%E6%80%BB%E8%A7%88/#redis) 的可重入锁实现形成对比。理解"锁是否可重入"的设计选择（简单明确 vs 灵活方便）。

4. **Go 接口隐式实现 → 面向接口编程与依赖注入**：Go 的 Duck Typing 使接口定义与实现解耦——调用方定义接口，提供方只需实现方法。这与 Spring DI 的 IoC 思想、[MyBatis Mapper 代理](/java%E7%9F%A5%E8%AF%86%E8%A7%84%E5%88%92%E2%80%94%E2%80%94mybatis/) 的接口增强有本质区别但目标一致：降低耦合。对比两种"接口驱动"的设计哲学。

5. **泛型单态化 vs Java 类型擦除**：Go 泛型通过单态化（为每个类型参数生成独立实现）实现，二进制体积增大但运行时零开销；Java 泛型通过擦除实现，编译后所有泛型信息消失，运行时需类型转换。这一差异决定了 Go 适合嵌入式/系统编程而 Java 适合大型企业应用。
