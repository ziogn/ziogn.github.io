---
title: docker-compose 使用教程
created: 2026-06-19 05:15
updated: 2026-06-19 10:30
version: 0.0.1
author: ziogn
source: https://docs.docker.com/compose/
tags: [docker, docker-compose, 容器编排, devops]
aliases: [Compose, Docker Compose]
description: Docker Compose v2/v5 完整使用指南：从安装、compose.yaml 全语法、全部子命令到网络/卷/多环境/生产/CI/排错
---

# docker-compose 使用教程

> 本教程以 Docker 官方文档与 compose-spec 为唯一依据，全程使用 v2/v5 语法（`docker compose` 子命令），覆盖从安装到生产、CI、排错的完整链路。贯穿示例为 be-star 类栈：一个 Spring Boot 后端 + MySQL 8 + Redis 7。

## 1. 开篇与 Compose 概览

### 1.1 多容器编排的痛点与 Compose 的定位

假设你要部署 be-star：一个 Spring Boot 后端 + MySQL 数据库 + Redis 缓存，至少三个容器。用原生 `docker run`，你需要这样的命令链：

```bash
# 手动方式：三条冗长命令，且顺序、网络、卷都要手动管
docker run -d --name mysql -e MYSQL_ROOT_PASSWORD=root -v mysql-data:/var/lib/mysql mysql:8
docker run -d --name redis redis:7
docker run -d --name app --link mysql --link redis -p 8080:8080 be-star:latest
```

痛点很明显：命令冗长难记、启动顺序靠人工保证、容器间网络与数据卷要手动创建、整套配置无法版本化分享给团队。Compose 的价值就是用一份 `compose.yaml` 声明整个应用栈，一条命令拉起、一条命令销毁：

```bash
# Compose 方式：一条命令，声明式管理
docker compose up -d
```

### 1.2 三层模型：Project / Service / Container

Compose 用三层抽象组织资源：

- **Project（项目）**：资源隔离单位，默认以 compose 文件所在目录名命名，所有容器/网络/卷都带 `{project}_` 前缀（如 `bestar_mysql_1`）。可用 `-p` 或环境变量 `COMPOSE_PROJECT_NAME` 覆盖。
- **Service（服务）**：compose 文件中 `services:` 下的一份容器定义。
- **Container（容器）**：service 的一个运行实例。

理解 project 是关键：两个不同目录跑同一份 compose，互不干扰，因为 project 名不同。

### 1.3 版本体系彻底澄清：v1 / v2 / v5

中文社区资料普遍过时，仍用 `docker-compose` 与 `version: "3"`。务必认清三者关系：

| 版本 | 命令写法 | 实现语言 | 分发方式 | 状态 |
|------|---------|---------|---------|------|
| v1 | `docker-compose`（连字符） | Python | 独立二进制 | **2023 年 EOL，已退役**，不再分发 |
| v2 | `docker compose`（空格，子命令） | Go | Docker CLI 插件，随 Engine/Desktop | 当前主流 |
| v5 | `docker compose`（空格，子命令） | Go | Docker Desktop 默认集成，新增官方 Go SDK | 2025 发布，与 v2 功能等价 |

v5 跳过 v3/v4 是刻意为之——避免与旧的 compose 文件格式 `version: "3"` 混淆。本教程全程以 v2/v5 为准：

> **关于 v1 EOL 日期**：具体 EOL 日期官方未在 retired 页明确披露，社区普遍引用 2023-06。官方 retired 页只表述 "no longer maintained, users should migrate to Compose v2"。

```text
# v2/v5（正确，本教程全程使用）
$ docker compose version
Docker Compose version v2.29.1   # 或 v5.x.x，功能等价

# v1（废弃，不要再学）
$ docker-compose --version
docker-compose version 1.29.2
```

### 1.4 `version:` 字段已废弃——别再写了

Compose v2/v5 完全忽略顶层 `version` 字段，始终用最新 schema 校验文件。新文件不要再写它：

```yaml
# ❌ 旧写法（废弃，会被忽略并可能报警告）
version: "3.8"
services:
  app:
    image: be-star:latest
```

```yaml
# ✅ 新写法（正确，直接以 services 开头）
services:
  app:
    image: be-star:latest
```

## 2. 安装与环境准备

### 2.1 Compose v2 与 Docker Engine 的关系

常见误解："要不要单独安装 docker-compose 二进制？"——**不需要**。Compose v2 作为 Go 插件，随 Docker Engine（Linux）或 Docker Desktop（macOS/Windows）一起分发。装好 Docker 即已具备 Compose。Linux 上的 `docker-compose-plugin` 包就是提供这个插件。

### 2.2 各平台安装

```bash
# Linux（Debian/Ubuntu，apt 仓库）
sudo apt-get update
sudo apt-get install docker-compose-plugin   # 官方包名（apt 与 rpm 都是此名）

# Linux（CentOS/RHEL，yum 仓库）
sudo yum install docker-compose-plugin

# 注：某些第三方源（如 Dexian）曾提供别名 docker-plugin，但官方包名以 docker-compose-plugin 为准
```

macOS 与 Windows：安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)（Windows 需启用 WSL2 后端），Compose 内置，无需额外操作。

### 2.3 验证安装与理解版本号

```text
# ✅ 成功
$ docker compose version
Docker Compose version v2.29.1

# ❌ 失败：插件未安装或不在 PATH
$ docker compose version
docker: 'compose' is not a docker command.
# 排查：检查 ~/.docker/cli-plugins/ 或 /usr/libexec/docker/cli-plugins/ 是否有 docker-compose
```

看到 `v5.x.x` 不必恐慌，它与 v2.x 功能等价，只是新版本号体系。

## 3. 快速上手：be-star 多容器组合

### 3.1 文件位置与命名规范

compose-spec 推荐的首选文件名是 `compose.yaml`（或 `compose.yml`）。兼容的历史命名 `docker-compose.yaml`/`docker-compose.yml` 仍可用。默认 override 文件 `compose.override.yaml` 会自动与主文件合并。**新项目一律用 `compose.yaml`**。

```text
be-star/                         # 项目根目录（即 project name）
├── Dockerfile                   # 后端镜像构建文件
├── compose.yaml                 # 主 compose 文件
├── .env                         # 环境变量（自动加载）
├── mysql-init/                  # 数据库初始化脚本
│   └── init.sql
└── src/                         # 应用源码
```

### 3.2 一份可直接抄的完整 compose.yaml

下面这份贯穿全教程的文件可直接抄改使用，包含 app（Spring Boot）、mysql、redis 三个 service。后续章节逐字段拆解。

```yaml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/bestar
      SPRING_REDIS_HOST: redis
    restart: unless-stopped

  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root}
      MYSQL_DATABASE: bestar
    volumes:
      - mysql-data:/var/lib/mysql
      - ./mysql-init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped

  redis:
    image: redis:7
    restart: unless-stopped

volumes:
  mysql-data:
```

### 3.3 四步跑通：up → ps → logs → down

```text
# 1. 后台启动整个栈（首次会构建 app 镜像、拉取 mysql/redis）
$ docker compose up -d
[+] Running 4/4
 ✔ Network bestar_default      Created
 ✔ Volume "bestar_mysql-data"  Created
 ✔ Container bestar-mysql-1    Started
 ✔ Container bestar-redis-1    Started
 ✔ Container bestar-app-1      Started

# 2. 查看运行中的容器
$ docker compose ps
NAME                IMAGE        STATUS                    PORTS
bestar-app-1        bestar-app   Up 10 seconds             0.0.0.0:8080->8080/tcp
bestar-mysql-1      mysql:8      Up 20 seconds (healthy)   3306/tcp
bestar-redis-1      redis:7      Up 20 seconds             6379/tcp

# 3. 跟踪 app 日志
$ docker compose logs -f app

# 4. 停止并移除容器（默认保留卷，数据不丢）
$ docker compose down
```

## 4. compose.yaml 全语法详解

### 4.1 顶层元素总览

```yaml
name: bestar                    # 显式 project name（可选，覆盖目录名）
services:                       # 必填：定义所有服务
  app: { ... }
networks:                       # 自定义网络
  backend: {}
volumes:                        # 命名卷
  mysql-data: {}
configs:                        # 非敏感配置文件
  nginx_conf: { file: ./nginx.conf }
secrets:                        # 敏感数据
  db_password: { file: ./db_password.txt }
include:                        # 引用其他 compose 文件（v2.20+）
  - compose.monitoring.yaml
x-custom: { ... }               # 自定义扩展字段（被忽略，供工具读取）
```

| 顶层元素 | 用途 |
|---------|------|
| `services` | 定义容器服务（必填） |
| `networks` | 自定义网络 |
| `volumes` | 命名卷声明 |
| `configs` | 非敏感配置文件 |
| `secrets` | 敏感数据 |
| `name` | 显式 project name |
| `include` | 引用其他 compose 文件 |
| `x-*` | 自定义扩展字段 |

### 4.2 services 字段：镜像与构建

`image` 拉取现成镜像，`build` 本地构建。`build` 长语法可精细控制：

```yaml
services:
  app:
    image: be-star:latest       # 镜像名（build 时打标签）
    build:
      context: ./app            # 构建上下文目录
      dockerfile: Dockerfile    # 指定 Dockerfile（默认 context/Dockerfile）
      args:                     # 构建参数（对应 ARG）
        JAR_FILE: target/app.jar
      target: production        # 多阶段构建的目标阶段
      cache_from:               # 复用缓存（详见 10.1）
        - type=registry,ref=bestar/app:cache
    container_name: bestar-app  # 固定容器名（否则用 {project}-{service}-N）
    command: ["java", "-jar", "app.jar"]   # 覆盖 CMD
    entrypoint: ["sh", "-c"]    # 覆盖 ENTRYPOINT
    working_dir: /app           # 工作目录
    user: "1000:1000"           # 以指定 UID:GID 运行
```

### 4.3 services 字段：环境变量与配置注入

`environment`（行内）与 `env_file`（引用外部文件）二选一或混用。**敏感数据用 env_file + .env，非敏感用 environment**：

```yaml
services:
  app:
    # 方式一：行内（非敏感，可见于 compose 文件）
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - LOG_LEVEL=info
    # 方式二：引用文件（敏感，文件不入库）
    env_file:
      - .env.production
```

注意：`environment` 是运行时注入容器，与第 7 章的变量插值（构建 compose 文件时替换 YAML 文本）时机不同。

### 4.4 services 字段：端口与网络

`ports` 发布到宿主机（外部可访问），`expose` 仅暴露给同网络容器（不发布到宿主）：

```yaml
services:
  app:
    ports:
      - "8080:8080"            # 短语法：宿主端口:容器端口
      # 长语法
      - target: 8080           # 容器端口
        published: "8080"      # 宿主端口
        protocol: tcp          # tcp/udp
        mode: host             # host/ingress(Swarm)
    expose:
      - "9000"                 # 仅容器间可见，宿主访问不到
    networks:
      - backend
    extra_hosts:               # 等价 --add-host，注入 hosts 记录
      - "host.docker.internal:host-gateway"
    dns:
      - 8.8.8.8
```

### 4.5 services 字段：运行控制

```yaml
services:
  app:
    restart: unless-stopped    # 重启策略（service 级，单机生效）
    init: true                 # 启用 tini，解决 PID 1 僵尸进程问题
    stop_signal: SIGTERM       # 停止信号
    tty: true                  # 分配伪终端
    stdin_open: true           # 保持标准输入打开
```

`restart` 取值（单机 `docker compose up` 生效）：`no`（默认）、`always`、`unless-stopped`、`on-failure`（可带重试次数 `on-failure:3`）。注意 `restart_policy` 属于 deploy 字段，单机行为不同，详见 8.3。

### 4.6 configs 与 secrets

两者都通过顶层声明 + service 引用，挂载为容器内文件。区别：secrets 内容不以明文出现在 `docker inspect`，专管敏感数据。

```yaml
services:
  app:
    configs:
      - nginx_conf             # 挂载到 /nginx.conf（非敏感配置）
    secrets:
      - db_password            # 挂载到 /run/secrets/db_password（敏感）

configs:
  nginx_conf:
    file: ./nginx.conf

secrets:
  db_password:
    file: ./db_password.txt
```

单机模式下，configs 与 secrets 都以普通文件形式挂载到容器内。

## 5. 核心子命令详解

### 5.1 生命周期命令

```bash
# 启动：-d 后台、--build 先构建、--force-recreate 强制重建容器、--wait 等所有服务 healthy
docker compose up -d --build --wait
docker compose up --force-recreate app        # 仅重建指定服务

# 停止并清理：-v 连卷一起删（数据丢失警告）、--rmi all 连镜像删、--remove-orphans 清孤儿容器
docker compose down                # 仅删容器和网络
docker compose down -v             # 连命名卷一起删（慎用，数据丢失）
docker compose down --rmi all      # 连镜像一起删
docker compose down --remove-orphans

# 其他生命周期
docker compose stop                # 停止但不删容器
docker compose start               # 启动已停止的容器
docker compose restart app         # 重启
docker compose pause / unpause     # 暂停/恢复（冻结进程）
docker compose rm -f               # 删除已停止的容器
```

`down` 与 `stop`/`rm` 的区别：`stop` 只停止不删除，容器配置还在；`down` 直接停止并删除容器和网络（默认保留卷）。

### 5.2 观察与调试命令

```bash
docker compose ps                                # 查看运行容器
docker compose ps --format "table {{.Name}}\t{{.Status}}"
docker compose logs -f --tail=100 app            # 跟踪最后 100 行日志（排错首选）
docker compose logs --since 10m app              # 最近 10 分钟日志
docker compose logs --timestamps app             # 带时间戳
docker compose top app                           # 查看容器内进程
docker compose events                            # 实时事件流
docker compose port app 8080                     # 查看端口映射
docker compose images                            # 列出镜像
```

### 5.3 执行与构建命令

`exec` 在已运行容器内执行（常用于进容器调试），`run` 启动新容器跑一次性任务：

```bash
# exec：进入运行中的 app 容器
docker compose exec app sh

# run：跑一次性任务，--rm 用完即删、--no-deps 不启动依赖
docker compose run --rm app java -jar migrate.jar
docker compose run --rm --no-deps app ls /app

# 构建与镜像
docker compose build --no-cache app     # 禁缓存强制重建
docker compose pull                     # 拉取所有服务镜像
docker compose push                     # 推送镜像
```

### 5.4 配置维护命令与全局 flag

```bash
# config：校验 + 打印合并后最终配置（排错 override/插值首选）
docker compose config                  # 打印最终配置
docker compose config --services       # 列出所有服务名

# 容器与宿主互拷文件
docker compose cp app:/app/logs/app.log ./

# 列出所有 project
docker compose ls
```

全局 flag（放在子命令前）：

```bash
docker compose -f compose.yaml -f compose.prod.yaml up -d   # 指定多文件
docker compose -p myproject up -d                           # 指定 project name
docker compose --profile debug up -d                        # 启用 profile
docker compose --env-file .env.production up -d             # 指定 env 文件
docker compose --ansi never up -d                           # 关闭彩色输出
```

## 6. 网络与数据卷

### 6.1 默认网络行为

每个 project 自动创建一个名为 `{project}_default` 的 bridge 网络。同 project 内的服务可用服务名互相访问（Docker 内置 DNS 解析）。这就是为什么 compose.yaml 里写 `jdbc:mysql://mysql:3306/...` 能连通——`mysql` 就是服务名，自动解析为该容器 IP。

```yaml
services:
  app:
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/bestar   # mysql 即服务名
      SPRING_REDIS_HOST: redis                                # redis 即服务名
  mysql: { ... }
  redis: { ... }
```

### 6.2 自定义网络

多网络划分可实现隔离（如只让 app 能访问数据库，nginx 不能直连）：

```yaml
services:
  app:
    networks: [frontend, backend]    # 同时接入两网
  mysql:
    networks: [backend]              # 仅后端网，前端访问不到
  nginx:
    networks: [frontend]             # 仅前端网

networks:
  frontend:
    driver: bridge                   # 默认 bridge；还有 overlay(Swarm)/host/none
  backend:
    driver: bridge
    enable_ipv6: false
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

还可给服务在网络内起别名（`aliases: [db, database]`），其他服务可用任一别名访问。

### 6.3 volumes 持久化

命名卷由 Docker 管理存储位置，`down` 默认保留，`down -v` 才删除：

```yaml
services:
  mysql:
    volumes:
      - mysql-data:/var/lib/mysql    # 命名卷（推荐，数据持久）

volumes:
  mysql-data:
    driver: local                    # 可换 NFS 等驱动
    # driver_opts:                   # 高级选项
    #   type: none
    #   o: bind
    #   device: /data/mysql
```

匿名卷（直接写容器路径 `-/var/lib/mysql`）不推荐——`down` 后易丢失且难管理。

### 6.4 bind mount 与挂载模式选型

bind mount 挂载宿主路径，适合开发期代码热重载、挂配置文件：

```yaml
services:
  app:
    volumes:
      # 开发期：bind mount 挂源码热重载
      - ./src:/app/src
      # 只读挂载配置文件
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
  mysql:
    volumes:
      # 生产期：命名卷存数据（由 Docker 管理，性能与可移植性更好）
      - mysql-data:/var/lib/mysql
```

| 场景 | 推荐挂载 | 说明 |
|------|---------|------|
| 开发期源码热重载 | bind mount | `./src:/app/src` |
| 配置文件（只读） | bind mount `:ro` | nginx.conf 等 |
| 生产数据库数据 | 命名卷 | Docker 管理，跨主机可迁移 |
| 临时数据 | tmpfs | 内存中，容器停即消失 |

长语法 `type: bind/volume/tmpfs` 可精细控制挂载类型。

## 7. 多环境配置

### 7.1 多文件 override 合并规则

`-f a.yaml -f b.yaml` 合并时遵循官方 merge 规则：

| 字段类型 | 合并规则 | 示例字段 |
|---------|---------|---------|
| 单值字段 | 后者覆盖前者 | `image`、`command`、`mem_limit` |
| 多值字段 | 拼接累加 | `ports`、`expose`、`dns`、`tmpfs` |
| 键值字段 | 按 key 合并，后者优先 | `environment`、`labels`、`volumes`、`devices` |

路径一律相对于**第一个 `-f` 指定的 base 文件**解析。默认 `compose.override.yaml` 会自动与主文件合并。

```yaml
# compose.yaml（base）
services:
  app:
    image: be-star:latest
    ports:
      - "8080:8080"
```

```yaml
# compose.override.yaml（开发覆盖：加调试端口、挂源码）
services:
  app:
    build: .
    ports:
      - "5005:5005"          # 多值：拼接，结果为 8080 + 5005
    environment:
      DEBUG: "true"          # 键值：新增
    volumes:
      - ./src:/app/src
```

```bash
docker compose up -d                 # 自动合并 compose.yaml + compose.override.yaml
docker compose -f compose.yaml -f compose.prod.yaml up -d   # 显式指定
```

### 7.2 profile 按场景启用服务

给 service 打 `profiles`，默认不启动，需要时用 `--profile` 启用：

```yaml
services:
  app: { ... }
  mysql: { ... }
  adminer:                         # 数据库管理工具，仅调试时启用
    image: adminer
    ports: ["8081:8080"]
    profiles: [debug]
  prometheus:                      # 监控，仅监控环境启用
    image: prom/prometheus
    profiles: [monitoring]
```

```bash
docker compose up -d                        # 不含 adminer、prometheus
docker compose --profile debug up -d        # 拉起 adminer
COMPOSE_PROFILES=debug docker compose up -d # 用环境变量等价
```

### 7.3 .env 文件与环境变量优先级

`.env` 文件与 compose.yaml 同目录时自动加载。优先级从高到低：

1. Shell 环境变量
2. `.env` 文件（未指定 `--env-file` 时）
3. compose 文件中的默认值

```bash
# .env（不要提交到 git）
MYSQL_ROOT_PASSWORD=s3cret
APP_PORT=8080
```

```yaml
# compose.yaml
services:
  mysql:
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
  app:
    ports:
      - "${APP_PORT}:8080"
```

```bash
docker compose --env-file .env.production up -d   # 指定自定义 env 文件
```

`.gitignore` 务必加 `.env`。

### 7.4 变量插值与 include 跨文件复用

插值语法（构建 compose 文件时替换 YAML 文本，与运行时 `environment` 时机不同）：

| 语法 | 语义 |
|------|------|
| `${VAR}` | VAR 的值，未设则为空 |
| `${VAR:-default}` | VAR 已设且非空则取其值，否则取 default |
| `${VAR-default}` | VAR 已设则取其值（含空），否则取 default |
| `${VAR:?error}` | VAR 已设且非空则取其值，否则报错中止 |
| `${VAR:+replacement}` | VAR 已设且非空则取 replacement，否则为空 |

```yaml
services:
  mysql:
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root}   # 未设给默认值 root
      SECRET_KEY: ${SECRET_KEY:?必须提供 SECRET_KEY}      # 未设直接报错中止
```

`include`（v2.20+）跨文件复用，比 `-f` 合并更清晰，被引用文件作为独立片段注入：

```yaml
# compose.yaml
include:
  - compose.monitoring.yaml    # 引用监控相关服务
services:
  app: { ... }
```

## 8. 生产实践与进阶

### 8.1 启动顺序与健康等待

`depends_on` 长语法配合被依赖服务的 `healthcheck`，实现"等数据库就绪再启 app"：

```yaml
services:
  app:
    depends_on:
      mysql:
        condition: service_healthy   # 等 mysql 健康检查通过
        restart: true                # mysql 挂掉时重启 app
      redis:
        condition: service_started   # 等 redis 启动即可
  mysql:
    image: mysql:8
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s          # 检查间隔
      timeout: 5s            # 超时时间
      retries: 5             # 连续失败次数
      start_period: 30s      # 启动宽限期（期间失败不计入 retries）
```

`condition` 取值：`service_started`（等启动，不等就绪）、`service_healthy`（等健康检查通过）、`service_completed_successfully`（等任务成功完成，用于迁移脚本）。短语法 `depends_on: [mysql]` 仅等启动，不等就绪，生产环境不够用。

### 8.2 deploy.resources 资源限制（范围风险点）

这是文档中最易误解的地方。**`deploy` 字段在 Compose v2 单机 `docker compose up` 下是部分生效**——`deploy.resources`（`limits` / `reservations`，含 cpus / memory / pids / devices）与 `deploy.restart_policy` 在单机 `up` 下**正常生效**（compose 源码 `pkg/compose/create.go` 的 `getDeployResources` 显式将 `deploy.Resources.Limits` / `deploy.Resources.Reservations` 写入 `container.Resources` / `HostConfig`）。但 `deploy.replicas` / `update_config` / `rollback_config` / `placement` / `mode` / `endpoint_mode` 仅在 Swarm（`docker stack deploy`）下生效，单机 `up` 下会被忽略。Compose 早期版本（v1、v2 早期）曾整体忽略 `deploy` 段，**该警告在现代 v2/v5 已不适用**。

| deploy 子字段 | 单机 `docker compose up` 行为 | Swarm `docker stack deploy` 行为 | 备注 |
|--------------|-------------------------------|----------------------------------|------|
| `resources.limits` (cpus/memory/pids) | **生效**（Compose v2 直接处理） | 生效 | 两种部署方式行为一致 |
| `resources.reservations` | **生效** | 生效 | 同上 |
| `restart_policy` (condition/delay/max_attempts/window) | **生效** | 生效 | 精细重试控制 |
| `replicas` | 忽略 | 生效 | 单机用 `--scale <svc>=N` |
| `update_config` | 忽略 | 生效 | 仅 Swarm 滚动更新 |
| `rollback_config` | 忽略 | 生效 | 仅 Swarm 回滚 |
| `placement` | 忽略 | 生效 | Swarm 节点约束 |
| `mode` (global/replicated) | 忽略 | 生效 | Swarm 服务模式 |
| `endpoint_mode` | 忽略 | 生效 | Swarm endpoint 配置 |

**配置建议**：单机直接使用 `deploy.resources` / `deploy.restart_policy` 即可生效，无需拆字段；如已习惯 service 级字段或需兼容早期 Compose 版本（v1 / v2 早期可能忽略 deploy.resources），可用 `mem_limit` / `cpus` / `pids_limit` / `mem_reservation` / `restart` 作为兼容回退。`--compatibility` 标志的作用是让 `replicas` / `update_config` / `placement` 等 Swarm-only 字段在单机不报警告，对 `resources` 无额外意义。

```yaml
services:
  app:
    deploy:
      resources:
        limits:           # 单机 docker compose up 也生效
          cpus: "2.0"
          memory: 2G
          pids: 1000
        reservations:     # 软预留，单机生效
          cpus: "0.5"
          memory: 512M
      restart_policy:     # 精细重启策略，单机生效
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
```

> **兼容性提示**：v2 之前的早期 Compose 版本（v1 / v2 早期）可能忽略 `deploy.resources`，此时可用 service 级 `mem_limit` / `cpus` / `pids_limit` 字段作为兼容回退。

### 8.3 重启策略：restart vs restart_policy

两个容易混淆的字段：

- **service 级 `restart`**（单机 `docker compose up` 生效）：取值 `no`/`always`/`unless-stopped`/`on-failure:N`，简单场景够用，配置直观。
- **deploy 级 `restart_policy`**（单机 `docker compose up` 下也生效，Compose v2 直接处理）：condition/delay/max_attempts/window 可配指数退避，精细控制推荐用这个。

```yaml
services:
  app-simple:
    restart: unless-stopped          # 单机简单部署：配置直观

  app-fine:
    deploy:                          # 精细退避策略：单机 up 下也生效
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
```

选型建议：单机推荐 `deploy.restart_policy`（精细控制，单机生效），简单场景或需兼容旧版 Compose 时可用 service 级 `restart: unless-stopped`。

### 8.4 编排定位：Swarm 专属字段与 K8s 的关系

Compose 不是 K8s 的替代品，它是单机与小规模编排工具。**`deploy.resources`（limits/reservations）与 `deploy.restart_policy` 在单机 `docker compose up` 下生效**，与 Swarm 行为一致；但 `deploy.replicas` / `update_config` / `rollback_config` / `placement` / `mode` / `endpoint_mode` 等 Swarm 编排字段在单机 `up` 下被忽略——你写了 `replicas: 3`，单机 `up` 仍只起一个容器。要真正的集群编排与滚动更新，用 Swarm（`docker stack deploy`）或 K8s；Compose 适合单机、开发与 CI。

如需迁移，`kompose` 等工具可将 compose.yaml 转为 K8s 资源清单。

## 9. CI/CD 集成

### 9.1 GitHub Actions 中使用 Compose

```yaml
# .github/workflows/integration-test.yml
name: Integration Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-compose-action@v2     # 安装指定版本 Compose（v2 为当前主推，锁版本保证可复现）
      - name: Start stack
        run: docker compose up -d --wait         # --wait 等所有服务 healthy
      - name: Run tests
        run: ./mvnw test                          # 跑集成测试
      - name: Cleanup
        if: always()
        run: docker compose down -v               # 测完清理卷与网络
```

### 9.2 GitLab CI 中使用 Compose

```yaml
# .gitlab-ci.yml
integration-test:
  image: docker:24
  services:
    - docker:24-dind                              # docker-in-docker
  variables:
    DOCKER_TLS_CERTDIR: ""
  script:
    - docker compose up -d --wait
    - docker compose run --rm app ./mvnw test
    - docker compose down -v
```

### 9.3 CI 中的最佳实践

CI 专用 flag 组合：

```bash
# 任一容器退出则整体中止，并以 test 服务退出码作为整体退出码
docker compose up --abort-on-container-exit --exit-code-from test

# --wait：等所有服务 healthy 再返回，替代手动 sleep
docker compose up -d --wait

# 测试后清理卷与网络，避免 CI 环境污染
docker compose down -v --remove-orphans
```

- `--exit-code-from <service>`：指定哪个服务的退出码作为整体退出码（通常是测试服务）。
- `--abort-on-container-exit`：任一容器退出则整体中止。
- `--wait`：等所有服务 healthy 再返回，替代不可靠的 `sleep 10`。
- 测试后 `down -v` 清理卷与网络。

## 10. 性能调优与排错

### 10.1 构建缓存优化

```bash
docker compose up -d --build          # 有缓存地重建（增量，推荐）
docker compose build --no-cache app   # 禁缓存全重建（排查缓存问题时用）
```

进阶：BuildKit（默认启用）多阶段构建配合 `target` 只构建所需阶段，`cache_from`/`cache_to` 跨构建复用缓存（CI 场景关键）：

```yaml
services:
  app:
    build:
      context: .
      target: production              # 多阶段：只构建 production 阶段
      cache_from:                     # CI 中复用上次构建缓存
        - type=registry,ref=bestar/app:cache
      cache_to:
        - type=registry,ref=bestar/app:cache,mode=max
```

### 10.2 常见报错 FAQ

| 报错关键词 | 可能原因 | 解决 |
|-----------|---------|------|
| `port is already allocated` | 宿主端口被占用 | `lsof -i :8080` 查占用进程并停掉，或改 compose 端口 |
| `permission denied` / mysql 启动即崩 | 容器内 UID 与挂载目录权限不匹配 | `chown` 调整宿主目录权限，或用 `user:` 指定匹配 UID |
| `version` 字段警告 | 仍写 `version: "3"` | 删掉 version 字段（已废弃） |
| `orphan container` 警告 | 存在 compose 文件未定义的旧容器 | `docker compose down --remove-orphans` |
| `failed to solve` 构建失败 | Dockerfile 指令错误或拉镜像失败 | 检查 Dockerfile，确认网络可拉基础镜像 |
| `network not found` / `already exists` | `not found` 多因手动 `docker network rm` 删除；`already exists` 多为同名 project name 复用残留 | 先 `docker network ls` 检查，`docker network rm <name>` 清理，或换 `-p` 指定新 project name |

```bash
# 排查示例：端口占用
$ docker compose up -d
ERROR: Bind for 0.0.0.0:8080 failed: port is already allocated
$ lsof -i :8080                  # 找到占用进程
$ kill <PID>                      # 停掉，或改 compose 端口
```

### 10.3 排错工具链

```bash
# config：up 前预检，打印合并后最终配置（查 override/插值问题首选）
docker compose config

# 带时间戳日志，定位时序问题
docker compose logs --timestamps app

# 查容器运行时详情（网络、挂载、环境变量、重启策略实际值）
docker inspect bestar-app-1

# 查磁盘占用与清理 dangling 镜像/卷（prune 谨慎，会删未使用的资源）
docker system df
docker compose down && docker system prune -f   # 清理流程
```

## 附录 A. 命令速查表

| 命令 | 用途 | 常用 flag |
|------|------|----------|
| `up` | 创建并启动服务 | `-d` `--build` `--force-recreate` `--wait` `--no-deps` |
| `down` | 停止并删除容器/网络 | `-v` `--rmi all` `--remove-orphans` `-t` |
| `stop` / `start` | 停止/启动（不删除） | `-t` |
| `restart` | 重启服务 | 服务名 |
| `pause` / `unpause` | 暂停/恢复进程 | 服务名 |
| `rm` | 删除已停止容器 | `-f` `-v` |
| `ps` | 查看运行容器 | `--format` `-a` |
| `logs` | 查看日志 | `-f` `--tail N` `--since` `--timestamps` |
| `top` | 查看容器内进程 | 服务名 |
| `events` | 实时事件流 | |
| `port` | 查看端口映射 | 服务名 端口 |
| `images` | 列出镜像 | |
| `exec` | 在运行容器内执行 | 服务名 命令 |
| `run` | 新容器跑一次性任务 | `--rm` `--no-deps` |
| `build` | 构建镜像 | `--no-cache` |
| `pull` / `push` | 拉取/推送镜像 | |
| `config` | 校验并打印最终配置 | `--services` `--volumes` |
| `cp` | 容器与宿主互拷文件 | |
| `ls` | 列出所有 project | `-a` |

## 附录 B. 常见报错 FAQ 汇总

| 报错关键词 | 可能原因 | 解决步骤 |
|-----------|---------|---------|
| `port is already allocated` | 宿主端口被其他进程占用 | 1. `lsof -i :端口` 查占用；2. 停掉占用进程或改 compose 端口 |
| `permission denied`（卷） | 容器 UID 与宿主目录权限不匹配 | 1. `chown -R` 调整宿主目录属主；2. compose 用 `user:` 指定匹配 UID |
| `version is obsolete` 警告 | 仍写 `version: "3.x"` | 删除顶层 `version` 字段 |
| `orphan container` 警告 | compose 文件外的残留容器 | `docker compose down --remove-orphans` |
| `failed to solve` | Dockerfile 指令错误或基础镜像拉取失败 | 1. 检查 Dockerfile 指令；2. 确认网络与镜像源 |
| `network not found` / `already exists` | `not found` 多因手动 `docker network rm` 删除；`already exists` 多为同名 project name 复用残留 | 1. `docker network ls` 检查；2. `docker network rm <name>` 清理；3. 或换 `-p` 指定新 project name |
| `no such service` | 服务名拼写错误 | `docker compose config --services` 核对 |
| 容器立即退出（exit 0/1） | 启动命令错误或依赖未就绪 | `docker compose logs` 看日志；加 `depends_on` + healthcheck |
| 插值变量为空 | 变量未设且未提供默认值 | 用 `${VAR:-default}` 或检查 `.env` |

## 附录 C. 完整 compose.yaml 模板参考

一份整合全书要点的生产级模板，可作为抄改起点：

```yaml
name: bestar                            # 显式 project name

services:
  app:                                  # Spring Boot 后端
    build:
      context: .
      dockerfile: Dockerfile
      target: production                # 多阶段构建，只构建生产镜像
      args:
        JAR_FILE: target/app.jar
    image: be-star:latest
    container_name: bestar-app
    ports:
      - "${APP_PORT:-8080}:8080"        # 插值 + 默认值
    environment:                        # 非敏感配置
      SPRING_PROFILES_ACTIVE: prod
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/bestar
      SPRING_REDIS_HOST: redis
    env_file:                           # 敏感配置走外部文件
      - .env.production
    depends_on:                         # 启动顺序 + 健康等待
      mysql:
        condition: service_healthy
        restart: true
      redis:
        condition: service_started
    networks: [frontend, backend]        # 多网络隔离
    restart: unless-stopped             # service 级重启（单机生效）
    init: true                          # 解决 PID 1 僵尸进程
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2g
        reservations:
          memory: 1g
    profiles: []                        # 默认启用

  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?必须提供}
      MYSQL_DATABASE: bestar
    volumes:
      - mysql-data:/var/lib/mysql       # 命名卷持久化
      - ./mysql-init:/docker-entrypoint-initdb.d:ro   # 只读挂初始化脚本
    networks: [backend]                  # 仅后端网，前端访问不到
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped

  redis:
    image: redis:7
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis-data:/data
    networks: [backend]
    restart: unless-stopped

  adminer:                              # 调试工具，profile 控制
    image: adminer
    ports: ["8081:8080"]
    networks: [backend]
    profiles: [debug]

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge

volumes:
  mysql-data:
  redis-data:

# secrets:                              # 敏感数据（按需启用）
#   tls_cert:
#     file: ./certs/server.pem
```

---

> 参考来源：[Docker Compose 官方文档](https://docs.docker.com/compose/)、[compose-spec 规范](https://github.com/compose-spec/compose-spec)、[deploy 字段参考](https://docs.docker.com/reference/compose-file/deploy/)、[多文件合并规则](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)、[变量插值](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)。
