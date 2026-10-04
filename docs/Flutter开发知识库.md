---
title: Flutter 开发知识库
created: 2025-11-26 00:00
updated: 2026-05-24 19:20
source:
tags: [flutter, dart, mobile]
aliases: [Flutter, Flutter开发指南]
version: 1.0.0
description: Flutter 移动应用开发综合知识库，包含状态管理、路由、组件、Web开发等核心内容
---

# Flutter 开发知识库

本文档整合了 Flutter 开发的核心知识点，涵盖状态管理、路由配置、组件开发、Web 技术等方面。

---

## 目录

1. [组件基础](#1-组件基础)
2. [BLoC 状态管理](#2-bloc-状态管理)
3. [路由管理](#3-路由管理)
4. [表单与输入](#4-表单与输入)
5. [Flutter Web 开发](#5-flutter-web-开发)
6. [Dart 与 Flutter 包管理](#6-dart-与-flutter-包管理)

---

## 1. 组件基础

### StatefulWidget vs StatelessWidget

| 特性 | StatelessWidget | StatefulWidget |
|------|----------------|---------------|
| 可变性 | 不可变 | 可变 |
| 状态管理 | 无内部状态 | 有内部状态 |
| 性能 | 高性能 | 相对较低 |
| 使用场景 | 静态展示 | 动态交互 |
| 生命周期 | 简单 | 完整 |
| 重建触发 | 父组件重建 | setState()调用 |

#### StatelessWidget（无状态组件）

```dart
class MyStatelessWidget extends StatelessWidget {
  final String title;

  const MyStatelessWidget({Key? key, required this.title}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Text(title);
  }
}
```

#### StatefulWidget（有状态组件）

```dart
class MyStatefulWidget extends StatefulWidget {
  const MyStatefulWidget({Key? key}) : super(key: key);

  @override
  _MyStatefulWidgetState createState() => _MyStatefulWidgetState();
}

class _MyStatefulWidgetState extends State<MyStatefulWidget> {
  int _counter = 0;

  @override
  void initState() {
    super.initState();
    // 初始化逻辑
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Counter: $_counter'),
        ElevatedButton(
          onPressed: () {
            setState(() {
              _counter++;
            });
          },
          child: const Text('Increment'),
        ),
      ],
    );
  }

  @override
  void dispose() {
    // 清理资源
    super.dispose();
  }
}
```

### 使用场景

**适合使用 StatelessWidget 的场景**：
- 静态文本展示
- 图标显示
- 简单的布局容器
- 纯展示型组件

**适合使用 StatefulWidget 的场景**：
- 表单输入控件
- 动画组件
- 计时器/倒计时
- 需要网络请求的组件

### 状态提升（Lifting State Up）

当多个组件需要共享状态时，将状态提升到共同的父组件：

```dart
class ParentWidget extends StatefulWidget {
  const ParentWidget({super.key});

  @override
  State<ParentWidget> createState() => _ParentWidgetState();
}

class _ParentWidgetState extends State<ParentWidget> {
  String _selectedValue = 'Option 1';

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ChildWidget(
          selectedValue: _selectedValue,
          onValueChanged: (newValue) => setState(() => _selectedValue = newValue),
        ),
        Text('Selected: $_selectedValue'),
      ],
    );
  }
}

class ChildWidget extends StatelessWidget {
  final String selectedValue;
  final ValueChanged<String> onValueChanged;

  const ChildWidget({super.key, required this.selectedValue, required this.onValueChanged});

  @override
  Widget build(BuildContext context) {
    return DropdownButton<String>(
      value: selectedValue,
      onChanged: onValueChanged,
      items: const [
        DropdownMenuItem(value: 'Option 1', child: Text('Option 1')),
        DropdownMenuItem(value: 'Option 2', child: Text('Option 2')),
      ],
    );
  }
}
```

### 性能优化建议

1. **尽量使用 const 构造函数**
2. **避免在 build 方法中创建新对象**
3. **合理使用 Key**

```dart
// 推荐：使用 ValueKey 保持列表项状态
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ListTile(
      key: ValueKey(items[index].id),
      title: Text(items[index].name),
    );
  },
)
```

---

## 2. BLoC 状态管理

### BLoC 概述

BLoC（Business Logic Component）是 Flutter 中一种重要的**状态管理模式**，主要用于将业务逻辑与 UI 层分离。

**核心特性**：
- 基于 Streams 实现**单向数据流**
- 输入：Sinks（接收用户操作）→ 输出：Streams（输出状态变化）

```
用户操作 → Sink输入 → BLoC处理 → Stream输出 → UI更新
```

**适用场景**：
- 复杂状态管理：多页面共享数据
- 实时数据更新：如聊天应用、实时数据展示
- 可测试性要求高：业务逻辑需要单元测试
- 团队协作：统一的状态管理规范

推荐使用 `flutter_bloc` 包来简化 BLoC 的实现。

```dart
class CounterBloc {
  final _counterController = StreamController<int>();

  Stream<int> get counter => _counterController.stream;

  void increment() {
    _counterController.sink.add(_currentCount + 1);
  }

  void dispose() {
    _counterController.close();
  }
}
```

### listenWhen vs buildWhen

| 特性 | listenWhen | buildWhen |
|------|------------|-----------|
| **作用对象** | BlocListener | BlocBuilder |
| **触发时机** | 状态变化时 | 构建 Widget 时 |
| **主要用途** | 执行副作用（导航、弹窗等） | 优化 Widget 重建 |
| **返回值** | bool（是否执行监听回调） | bool（是否重建 Widget） |

#### listenWhen - 用于 BlocListener

控制何时执行副作用操作：

```dart
BlocListener<CounterBloc, CounterState>(
  listenWhen: (previous, current) {
    // 只有当计数器从偶数变为奇数时才执行监听
    return previous.count % 2 == 0 && current.count % 2 == 1;
  },
  listener: (context, state) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('计数器变为奇数: ${state.count}')),
    );
  },
  child: Container(),
)
```

#### buildWhen - 用于 BlocBuilder

控制何时重建 Widget：

```dart
BlocBuilder<CounterBloc, CounterState>(
  buildWhen: (previous, current) {
    // 只有当计数器值变化超过10时才重建Widget
    return (current.count - previous.count).abs() >= 10;
  },
  builder: (context, state) {
    return Text(
      '计数器: ${state.count}',
      style: const TextStyle(fontSize: 24),
    );
  },
)
```

#### 使用 BlocConsumer 组合使用

```dart
BlocConsumer<Bloc, State>(
  listenWhen: (previous, current) {
    return shouldTriggerSideEffect(previous, current);
  },
  listener: (context, state) {
    handleSideEffect(context, state);
  },
  buildWhen: (previous, current) {
    return shouldRebuildUI(previous, current);
  },
  builder: (context, state) {
    return buildUI(state);
  },
)
```

### 最佳实践

1. **始终考虑性能**：在复杂 UI 中使用 `buildWhen` 避免不必要的重建
2. **副作用隔离**：使用 `listenWhen` 确保副作用只在特定条件下触发
3. **状态比较**：充分利用前后状态的对比逻辑

---

## 3. 路由管理

### go_router 基础配置

go_router 是 Flutter 官方推荐的声明式路由管理库，基于 Navigator 2.0 API 构建。

#### 安装与配置

```yaml
# pubspec.yaml
dependencies:
  go_router: ^14.0.0
```

运行 `flutter pub get` 安装依赖。

#### 基本路由配置

```dart
import 'package:go_router/go_router.dart';

final GoRouter _router = GoRouter(
  routes: <GoRoute>[
    GoRoute(
      path: '/',
      builder: (context, state) => const HomePage(),
    ),
    GoRoute(
      path: '/details/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return DetailsPage(id: id);
      },
    ),
  ],
);
```

#### ShellRoute - 嵌套布局

```dart
ShellRoute(
  builder: (context, state, child) {
    return Scaffold(
      appBar: AppBar(title: const Text('主应用')),
      body: child,
      bottomNavigationBar: const BottomNavBar(),
    );
  },
  routes: [
    GoRoute(path: 'dashboard', builder: (context, state) => const DashboardPage()),
    GoRoute(path: 'profile', builder: (context, state) => const ProfilePage()),
  ],
)
```

#### StatefulShellRoute - 独立导航分支

适合底部导航栏等多标签应用，每个标签保持独立导航历史：

```dart
StatefulShellRoute.indexedStack(
  builder: (context, state, navigationShell) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: navigationShell.currentIndex,
        onTap: (index) => navigationShell.goBranch(
          index,
          initialLocation: index == navigationShell.currentIndex,
        ),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: '首页'),
          BottomNavigationBarItem(icon: Icon(Icons.search), label: '搜索'),
        ],
      ),
    );
  },
  branches: [
    StatefulShellBranch(routes: [
      GoRoute(path: '/home', builder: (context, state) => const HomePage()),
    ]),
    StatefulShellBranch(routes: [
      GoRoute(path: '/search', builder: (context, state) => const SearchPage()),
    ]),
  ],
)
```

#### 路由守卫

```dart
final GoRouter _router = GoRouter(
  redirect: (context, state) {
    final isLoggedIn = AuthService.isLoggedIn();
    if (!isLoggedIn && state.location != '/login') {
      return '/login';
    }
    return null;
  },
  routes: [...],
);
```

#### 路由类型对比

| 特性 | GoRoute | ShellRoute | StatefulShellRoute |
|------|---------|------------|-------------------|
| **用途** | 单页面路由 | 共享布局外壳 | 独立导航分支 |
| **导航栈** | 单一栈 | 单一栈 | 多独立栈 |
| **状态保持** | 无 | 外壳状态 | 分支独立状态 |
| **适用场景** | 简单页面 | 共享布局 | 复杂多标签应用 |

#### 导航方法

| 方法 | 描述 | 使用场景 |
|------|------|----------|
| `context.go(path)` | 跳转到新路由，替换当前路由栈 | 主要导航方式 |
| `context.push(path)` | 推入新路由，保留当前路由栈 | 需要返回的场景 |
| `context.pop()` | 返回上一页 | 返回操作 |
| `context.replace(path)` | 替换当前路由 | 更新当前页面 |

#### 错误页面处理

```dart
final GoRouter _router = GoRouter(
  routes: [...],
  errorBuilder: (context, state) {
    return Scaffold(
      appBar: AppBar(title: const Text('页面未找到')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('404 - 页面不存在'),
            ElevatedButton(
              onPressed: () => context.go('/'),
              child: const Text('返回首页'),
            ),
          ],
        ),
      ),
    );
  },
);
```

#### 参数传递

**查询参数**：

```dart
// 导航时传递
context.go('/search?query=flutter&sort=date');

// 接收查询参数
GoRoute(
  path: '/search',
  builder: (context, state) {
    final query = state.uri.queryParameters['query'];
    final sort = state.uri.queryParameters['sort'];
    return SearchPage(query: query, sort: sort);
  },
);
```

**额外参数**：

```dart
// 导航时传递
context.go('/product/123', extra: Product(id: '123', name: 'Flutter Book'));

// 接收额外参数
GoRoute(
  path: '/product/:id',
  builder: (context, state) {
    final product = state.extra as Product?;
    return ProductPage(product: product);
  },
);
```

#### 路由配置分离

```dart
class AppRoutes {
  static const String home = '/';
  static const String details = '/details/:id';
  static const String login = '/login';

  static GoRouter get router => _router;

  static final _router = GoRouter(
    routes: _routes,
    redirect: _redirect,
    errorBuilder: _errorBuilder,
  );

  static final List<GoRoute> _routes = [
    GoRoute(path: home, builder: (context, state) => const HomePage()),
    // ... 其他路由
  ];

  static String? _redirect(BuildContext context, GoRouterState state) {
    return null;
  }

  static Widget _errorBuilder(BuildContext context, GoRouterState state) {
    return const ErrorPage();
  }
}
```

#### 路由观察者

```dart
final GoRouter _router = GoRouter(
  routes: [...],
  observers: [MyRouteObserver()],
);

class MyRouteObserver extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    print('路由推入: ${route.settings.name}');
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    print('路由弹出: ${route.settings.name}');
  }
}
```

#### 自定义路由动画

```dart
GoRoute(
  path: '/custom',
  pageBuilder: (context, state) {
    return CustomTransitionPage(
      key: state.pageKey,
      child: const CustomPage(),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(opacity: animation, child: child);
      },
    );
  },
);
```

#### 路由状态保持

```dart
class KeepAlivePage extends StatefulWidget {
  const KeepAlivePage({super.key});

  @override
  State<KeepAlivePage> createState() => _KeepAlivePageState();
}

class _KeepAlivePageState extends State<KeepAlivePage>
    with AutomaticKeepAliveClientMixin {

  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return const Scaffold(
      body: Center(child: Text('页面状态会被保持')),
    );
  }
}
```

#### 深度链接配置

```xml
<!-- Android: android/app/src/main/AndroidManifest.xml -->
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="example.com" />
</intent-filter>
```

```xml
<!-- iOS: ios/Runner/Info.plist -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>example</string></array>
  </dict>
</array>
```

#### 性能优化建议

1. 懒加载页面：使用 `pageBuilder` 替代 `builder`
2. 路由预加载：在合适时机预加载常用路由
3. 避免过度嵌套：合理设计路由层级
4. 状态管理分离：将路由状态与业务状态分离

---

## 4. 表单与输入

### TextFormField 基础用法

```dart
TextFormField(
  decoration: InputDecoration(
    labelText: '用户名',
    hintText: '请输入用户名',
    border: const OutlineInputBorder(),
  ),
  validator: (value) {
    if (value == null || value.isEmpty) {
      return '请输入用户名';
    }
    return null;
  },
)
```

### 控制器与表单集成

```dart
class LoginForm extends StatefulWidget {
  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submitForm() {
    if (_formKey.currentState!.validate()) {
      print('邮箱: ${_emailController.text}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          TextFormField(
            controller: _emailController,
            decoration: const InputDecoration(labelText: '邮箱'),
            validator: (value) {
              if (value == null || value.isEmpty) return '请输入邮箱';
              if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                return '请输入有效的邮箱地址';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _passwordController,
            decoration: const InputDecoration(labelText: '密码'),
            obscureText: true,
            validator: (value) {
              if (value == null || value.isEmpty) return '请输入密码';
              if (value.length < 6) return '密码长度至少6位';
              return null;
            },
          ),
          const SizedBox(height: 24),
          ElevatedButton(onPressed: _submitForm, child: const Text('登录')),
        ],
      ),
    );
  }
}
```

### 输入类型与键盘配置

```dart
// 手机号输入
TextFormField(
  decoration: const InputDecoration(labelText: '手机号'),
  keyboardType: TextInputType.phone,
  inputFormatters: [
    FilteringTextInputFormatter.digitsOnly,
    LengthLimitingTextInputFormatter(11),
  ],
)

// 金额输入
TextFormField(
  decoration: const InputDecoration(labelText: '金额'),
  keyboardType: const TextInputType.numberWithOptions(decimal: true),
)
```

### 焦点管理

```dart
class FocusExample extends StatefulWidget {
  @override
  State<FocusExample> createState() => _FocusExampleState();
}

class _FocusExampleState extends State<FocusExample> {
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      print('焦点状态: ${_focusNode.hasFocus}');
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      focusNode: _focusNode,
      decoration: const InputDecoration(labelText: '带焦点管理的输入框'),
    );
  }
}
```

### 密码输入框

带显示/隐藏切换的密码输入组件：

```dart
class PasswordTextField extends StatefulWidget {
  final TextEditingController? controller;
  final String? labelText;

  const PasswordTextField({
    super.key,
    this.controller,
    this.labelText = '密码',
  });

  @override
  State<PasswordTextField> createState() => _PasswordTextFieldState();
}

class _PasswordTextFieldState extends State<PasswordTextField> {
  bool _obscureText = true;

  void _togglePasswordVisibility() {
    setState(() {
      _obscureText = !_obscureText;
    });
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: widget.controller,
      obscureText: _obscureText,
      decoration: InputDecoration(
        labelText: widget.labelText,
        prefixIcon: const Icon(Icons.lock),
        suffixIcon: IconButton(
          icon: Icon(_obscureText ? Icons.visibility_off : Icons.visibility),
          onPressed: _togglePasswordVisibility,
        ),
        border: const OutlineInputBorder(),
      ),
    );
  }
}
```

### 密码验证器

```dart
class PasswordValidator {
  static String? validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return '密码不能为空';
    }
    if (value.length < 8) {
      return '密码长度至少8位';
    }
    if (!RegExp(r'[A-Z]').hasMatch(value)) {
      return '密码必须包含至少一个大写字母';
    }
    if (!RegExp(r'[0-9]').hasMatch(value)) {
      return '密码必须包含至少一个数字';
    }
    return null;
  }
}
```

### 密码强度指示器

```dart
class PasswordStrengthIndicator extends StatelessWidget {
  final String password;

  const PasswordStrengthIndicator({super.key, required this.password});

  PasswordStrength _calculateStrength() {
    if (password.isEmpty) return PasswordStrength.none;
    if (password.length < 4) return PasswordStrength.weak;

    int strength = 0;
    if (RegExp(r'[A-Z]').hasMatch(password)) strength++;
    if (RegExp(r'[a-z]').hasMatch(password)) strength++;
    if (RegExp(r'[0-9]').hasMatch(password)) strength++;
    if (RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(password)) strength++;

    if (strength <= 2) return PasswordStrength.weak;
    if (strength == 3) return PasswordStrength.medium;
    return PasswordStrength.strong;
  }

  @override
  Widget build(BuildContext context) {
    final strength = _calculateStrength();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LinearProgressIndicator(
          value: strength.value,
          backgroundColor: Colors.grey[300],
          color: strength.color,
        ),
        const SizedBox(height: 4),
        Text(strength.text, style: TextStyle(fontSize: 12, color: strength.color)),
      ],
    );
  }
}

enum PasswordStrength {
  none(0.0, Colors.grey, ''),
  weak(0.25, Colors.red, '密码强度：弱'),
  medium(0.5, Colors.orange, '密码强度：中'),
  strong(1.0, Colors.green, '密码强度：强');

  final double value;
  final Color color;
  final String text;

  const PasswordStrength(this.value, this.color, this.text);
}
```

### 安全最佳实践

```dart
// dispose 时安全清除密码数据
@override
void dispose() {
  _passwordController.clear();
  _passwordController.dispose();
  super.dispose();
}

// 键盘配置优化
TextFormField(
  obscureText: true,
  keyboardType: TextInputType.visiblePassword,
  enableSuggestions: false,
  autocorrect: false,
  decoration: const InputDecoration(
    labelText: '密码',
    border: OutlineInputBorder(),
  ),
)
```

---

## 5. Flutter Web 开发

### 渲染模式对比

| 特性 | HTML 模式 | CanvasKit 模式 |
|------|-----------|----------------|
| 实现方式 | HTMLElement | Skia + WebAssembly |
| 性能 | 一般 | 更好（滚动流畅度高等） |
| 体积 | 较小 | 较大（wasm 文件） |
| 兼容性 | 较好 | 较差 |
| 默认使用 | Mobile 端 | PC 端 |

### 默认构建产物

| 文件 | 体积 |
|------|------|
| `main.dart.js` | ~2.3 MB |
| `canvaskit.wasm` | ~2.8 MB |
| `MaterialIcons-Regular.otf` | ~1.5 MB |
| `CupertinoIcons.ttf` | ~284 kB |

### 构建优化

#### 选择渲染模式

```bash
flutter build web --release --web-renderer html
# 或
flutter build web --release --web-renderer canvaskit
```

#### 图标优化

- 去除无用图标引用
- 使用 `--tree-shake-icons` 命令
- 从 Android 构建复制优化后的资源

#### 代码分包懒加载

```dart
import 'box.dart' deferred as box;

FutureBuilder<void>(
  future: box.loadLibrary(),
  builder: (context, snapshot) {
    if (snapshot.connectionState == ConnectionState.done) {
      return box.DeferredBox();
    }
    return const CircularProgressIndicator();
  },
)
```

### 渲染机制

HTML 模式下使用 `SurfaceCanvas`，根据 `hasArbitraryPaint` 参数决定渲染方式：

- **DomCanvas**：使用 HTML 标签（`p` + `span`）渲染，适合简单 UI
- **BitmapCanvas**：优先使用 `canvas`，适合文本绘制、图片、复杂图形

文本使用 `p` + `span` 标签的条件：有 TextDecoration、FontFeatures 或 `_childOverdraw`。

### 优化总结

1. 去除无用 icon 引用
2. 使用 `tree-shake-icons` 优化矢量图库
3. 通过 `deferred-components` 实现懒加载分包
4. 开启 gzip/brotli 压缩算法
5. 使用 `source-map-explorer` 分析打包文件
6. 添加 loading 效果改善用户体验

---

## 6. Dart 与 Flutter 包管理

### flutter pub vs dart pub

| 功能 | flutter pub | dart pub |
|------|-------------|----------|
| Flutter 插件支持 | 完全支持 | 不支持 |
| 平台特定代码 | 自动处理 | 不处理 |
| 资源文件处理 | 支持 | 不支持 |
| 原生代码集成 | 支持 | 不支持 |
| 纯 Dart 包 | 支持 | 支持 |

### 使用建议

**Flutter 项目**：
```bash
flutter pub get
flutter pub add package_name
flutter pub run
```

**纯 Dart 项目**：
```bash
dart pub get
dart pub add package_name
dart pub run
```

---

---

最后更新：2026-05-24 19:20
