---
title: Nginx 配置实战指南
created: 2026-05-26 10:00
updated: 2026-05-26 11:30
version: 1.0.1
author: ziogn
tags: [nginx, devops, 运维]
description: Nginx 配置实战教程，覆盖静态站点部署、反向代理、SSL 证书、安全加固与常见问题排查
---

# Nginx 配置实战指南

本教程以实际项目配置为基础，覆盖 Nginx 的两大核心场景：**静态站点部署**与**反向代理配置**。所有配置示例均来自生产环境实践，可直接复用。

## 1. Nginx 基础概念

### 1.1 配置文件结构

Nginx 的配置体系由主配置文件和站点配置目录组成：

| 路径 | 用途 |
|------|------|
| `/etc/nginx/nginx.conf` | 主配置文件，定义全局设置（user、worker_processes、events、http 块） |
| `/etc/nginx/sites-available/` | 站点配置文件存放目录 |
| `/etc/nginx/sites-enabled/` | 已启用站点的符号链接目录 |
| `/var/log/nginx/` | 默认日志目录 |

主配置文件中通过 `include` 指令加载站点配置：

```nginx
# nginx.conf 中的关键 include 行
http {
    # ...
    include /etc/nginx/sites-enabled/*;
}
```

站点启用机制：将配置文件放在 `sites-available/`，然后创建符号链接到 `sites-enabled/`：

```bash
sudo ln -s /etc/nginx/sites-available/example.conf /etc/nginx/sites-enabled/
```

### 1.2 核心指令速查

| 指令 | 作用 | 示例 |
|------|------|------|
| `listen` | 监听端口和协议 | `listen 443 ssl;` |
| `http2` | 启用 HTTP/2 协议 | `http2 on;` |
| `server_name` | 绑定域名 | `server_name x.xluo.xin;` |
| `root` | 网站根目录 | `root /home/ubuntu/data/build/prod/fe_star/build;` |
| `index` | 默认索引文件 | `index index.html index.htm;` |
| `charset` | 字符编码 | `charset utf-8;` |
| `access_log` | 访问日志路径 | `access_log /var/log/nginx/x.xluo.xin.access.log;` |
| `error_log` | 错误日志路径 | `error_log /var/log/nginx/x.xluo.xin.error.log;` |
| `proxy_pass` | 反向代理目标 | `proxy_pass http://172.26.19.206:8090;` |
| `try_files` | 文件查找规则 | `try_files $uri $uri/ /index.html;` |
| `return` | 返回状态码或重定向 | `return 301 https://$server_name$request_uri;` |
| `add_header` | 添加响应头 | `add_header X-Frame-Options DENY;` |
| `expires` | 缓存过期时间 | `expires 1y;` |
| `deny` | 禁止访问 | `deny all;` |

## 2. 静态站点部署

以 Flutter Web 应用部署为案例，将域名 `x.xluo.xin` 映射到服务器上的静态文件目录。

### 2.1 基础配置

完整的静态站点 `server` 块配置：

```nginx
server {
    listen 80;
    server_name x.xluo.xin;

    # 根目录指向 Flutter Web 构建产物
    root /home/ubuntu/data/build/prod/fe_star/build;
    index index.html index.htm;

    # 字符编码
    charset utf-8;

    # 日志分离
    access_log /var/log/nginx/x.xluo.xin.access.log;
    error_log /var/log/nginx/x.xluo.xin.error.log;

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }
}
```

### 2.2 SPA 路由处理

单页应用（SPA）使用前端路由时，所有未匹配的请求必须回退到 `index.html`，否则刷新页面会返回 404：

```nginx
location / {
    # $uri    — 尝试匹配请求的文件
    # $uri/   — 尝试匹配请求的目录
    # /index.html — 都不存在时回退到首页，交给前端路由处理
    try_files $uri $uri/ /index.html;
}
```

配置生效后，`https://x.xluo.xin/some/path` 这样的前端路由不再返回 404，而是正确加载 `index.html` 由前端框架接管路由。

### 2.3 静态资源缓存策略

为 CSS、JS、图片等静态资源设置长期缓存，减少重复请求：

```nginx
# 匹配常见静态资源文件类型
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    # 缓存 1 年
    expires 1y;
    # immutable 表示资源内容不会变，浏览器无需重新验证
    add_header Cache-Control "public, immutable";

    # 静态资源文件不存在时直接返回 404，不再回退到 index.html
    try_files $uri =404;
}
```

配合前端构建工具的文件名哈希（如 `main.a1b2c3d4.js`），新版本部署后文件名变化会自动绕过缓存。

## 3. 反向代理配置

以 `callback.xluo.xin` 反向代理到后端服务 `172.26.19.206:8090` 为案例。

### 3.1 基础反向代理

反向代理的核心是将客户端请求转发到后端服务，同时通过 `proxy_set_header` 传递真实的客户端信息：

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name callback.xluo.xin;

    # 日志
    access_log /var/log/nginx/callback.xluo.xin.access.log;
    error_log /var/log/nginx/callback.xluo.xin.error.log;

    # 传递真实客户端信息到后端
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    location / {
        proxy_pass http://172.26.19.206:8090;
    }
}
```

**Header 说明：**

| Header | 作用 |
|--------|------|
| `Host` | 传递原始请求的域名，后端需要此信息做虚拟主机判断 |
| `X-Real-IP` | 客户端真实 IP 地址 |
| `X-Forwarded-For` | 代理链中所有经过的 IP 地址列表 |
| `X-Forwarded-Proto` | 原始请求的协议（http 或 https） |

### 3.2 超时控制

三个超时参数分别控制代理连接的不同阶段：

```nginx
# 与后端建立 TCP 连接的超时
proxy_connect_timeout 30s;

# 向后端发送请求的超时
proxy_send_timeout 30s;

# 等待后端响应的超时
proxy_read_timeout 30s;
```

**不同场景的推荐值：**

| 场景 | connect | send | read | 说明 |
|------|---------|------|------|------|
| 普通 API | 10s | 10s | 30s | 常规请求 |
| 支付回调 | 30s | 30s | 60s | 回调处理可能耗时较长 |
| 大文件上传 | 30s | 300s | 300s | 需要足够的发送时间 |
| WebSocket | 10s | 3600s | 3600s | 长连接需要更长超时 |

### 3.3 路径精确匹配

当特定路径需要代理到不同的后端接口时，使用独立的 `location` 块。以支付宝回调为例，将 `/alipay` 精确代理到后端的特定接口路径：

```nginx
# 支付宝回调 — 精确匹配并重写路径
location /alipay {
    proxy_pass http://172.26.19.206:8090/api/guest/op.alipay/callback;

    # 回调处理需要更长的超时
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # 独立日志便于调试支付问题
    access_log /var/log/nginx/callback.xluo.xin.alipay.log;
}

# 默认代理规则
location / {
    proxy_pass http://172.26.19.206:8090;
}
```

这样访问 `https://callback.xluo.xin/alipay` 会被代理到 `http://172.26.19.206:8090/api/guest/op.alipay/callback`，同时拥有独立的超时设置和日志文件。

## 4. SSL/TLS 配置与证书管理

### 4.1 HTTP 到 HTTPS 重定向

监听 80 端口，将所有 HTTP 请求 301 重定向到 HTTPS：

```nginx
server {
    listen 80;
    server_name callback.xluo.xin;

    # 301 永久重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}
```

`$server_name` 取自 `server_name` 指令，`$request_uri` 保留原始请求路径，确保重定向后用户访问的页面不变。

### 4.2 SSL 协议与密码套件

在 HTTPS 的 `server` 块中配置 SSL 安全参数：

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name callback.xluo.xin;

    # SSL 证书路径（Certbot 自动生成）
    ssl_certificate /etc/letsencrypt/live/callback.xluo.xin/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/callback.xluo.xin/privkey.pem;

    # 仅允许 TLS 1.2 和 1.3，禁用不安全的旧版本
    ssl_protocols TLSv1.2 TLSv1.3;

    # 密码套件配置（Mozilla Intermediate 推荐）
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;

    # 是否优先使用服务端的密码套件（off 为推荐值，让客户端选择最优套件）
    ssl_prefer_server_ciphers off;

    # ... 其他配置
}
```

> TLS 1.0 和 1.1 已被主流浏览器弃用，务必只保留 TLSv1.2 和 TLSv1.3。

### 4.3 Certbot 证书部署

使用 Certbot 申请 Let's Encrypt 免费 SSL 证书的完整流程：

```bash
# 1. 安装 Certbot 和 Nginx 插件
# Ubuntu 24.04+ 推荐使用 snap 安装：
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Ubuntu 22.04 及更早版本可使用 apt：
# sudo apt update
# sudo apt install certbot python3-certbot-nginx

# 2. 申请证书（Certbot 会自动修改 Nginx 配置）
sudo certbot --nginx -d callback.xluo.xin

# 3. 验证证书文件
ls -la /etc/letsencrypt/live/callback.xluo.xin/

# 4. 测试自动续期
sudo certbot renew --dry-run
```

Certbot 安装后会自动创建 systemd timer 或 cron job 实现证书自动续期。证书有效期 90 天，自动续期会在到期前 30 天内执行。

如需为多个域名申请证书：

```bash
sudo certbot --nginx -d callback.xluo.xin -d x.xluo.xin -d another.example.com
```

## 5. 安全加固

### 5.1 安全响应头

在 `server` 块或 `http` 块中添加以下安全响应头：

```nginx
# 防止页面被嵌入 iframe（防点击劫持）
add_header X-Frame-Options DENY;

# 防止浏览器猜测 MIME 类型（防 MIME 嗅探攻击）
add_header X-Content-Type-Options nosniff;

# HSTS — 强制浏览器在指定时间内只通过 HTTPS 访问
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
```

**各 Header 作用说明：**

| Header | 防御目标 | 推荐值 |
|--------|---------|--------|
| `X-Frame-Options` | 点击劫持 | `DENY`（完全禁止嵌入）或 `SAMEORIGIN`（允许同源嵌入） |
| `X-Content-Type-Options` | MIME 嗅探 | `nosniff` |
| `Strict-Transport-Security` | 中间人降级攻击 | `max-age=63072000; includeSubDomains; preload` |

> HSTS 的 `max-age=63072000` 对应 2 年。`preload` 表示允许加入浏览器的 HSTS 预加载列表，首次启用时建议先不加 `preload`，确认无问题后再添加。

### 5.2 隐藏文件与敏感文件保护

禁止访问以 `.` 开头的隐藏文件（如 `.git`、`.env`、`.htaccess`）：

```nginx
# 禁止访问所有以 . 开头的隐藏文件和目录
location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
}

# 额外禁止访问 .htaccess 和 .htpasswd
location ~* \.(htaccess|htpasswd)$ {
    deny all;
}
```

`access_log off` 和 `log_not_found off` 的作用是避免扫描攻击产生大量无用日志。

## 6. 常见问题排查

### 6.1 权限问题排查（Permission denied）

这是 Nginx 最常见的问题之一。典型错误日志：

```text
[crit] stat() "/home/ubuntu/data/build/prod/fe_star/build/index.html" failed (13: Permission denied)
```

**排查流程：**

**第一步：检查目录权限链**

问题往往不在目标目录本身，而在路径中的某个父目录。使用 `namei` 命令逐级检查：

```bash
namei -l /home/ubuntu/data/build/prod/fe_star/build/
```

输出会显示每一级目录的权限和所有者，快速定位哪个目录缺少 `x`（执行/进入）权限。

**第二步：修复目录路径权限**

确保路径中每个目录都有 `755` 权限（owner 可读写执行，group 和 others 可读和执行）：

```bash
sudo chmod 755 /home/ubuntu/
sudo chmod 755 /home/ubuntu/data/
sudo chmod 755 /home/ubuntu/data/build/
sudo chmod 755 /home/ubuntu/data/build/prod/
sudo chmod 755 /home/ubuntu/data/build/prod/fe_star/
sudo chmod 755 /home/ubuntu/data/build/prod/fe_star/build/
```

或使用一行命令修复整个路径：

```bash
sudo find /home/ubuntu/data -type d -exec chmod 755 {} \;
```

**第三步：设置目标目录所有权和文件权限**

```bash
# 将 build 目录及内容的所有者设为 www-data
sudo chown -R www-data:www-data /home/ubuntu/data/build/prod/fe_star/build/

# 目录 755，文件 644
sudo find /home/ubuntu/data/build/prod/fe_star/build/ -type d -exec chmod 755 {} \;
sudo find /home/ubuntu/data/build/prod/fe_star/build/ -type f -exec chmod 644 {} \;
```

**第四步：验证修复结果**

以 nginx 运行用户身份测试访问：

```bash
sudo -u www-data ls -la /home/ubuntu/data/build/prod/fe_star/build/
sudo -u www-data cat /home/ubuntu/data/build/prod/fe_star/build/index.html
```

**第五步：重启 Nginx 并验证**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 6.2 SELinux / AppArmor 安全模块

即使文件权限正确，安全模块也可能阻止 Nginx 访问非标准目录。

**CentOS/RHEL — SELinux：**

```bash
# 检查 SELinux 状态
getenforce

# 如果返回 Enforcing，临时禁用测试
sudo setenforce 0

# 正确做法：设置目录的 SELinux 上下文
sudo chcon -R -t httpd_sys_content_t /home/ubuntu/data/build/prod/fe_star/build/
```

**Ubuntu/Debian — AppArmor：**

```bash
# 检查 AppArmor 状态
sudo aa-status

# 如果 nginx 被 AppArmor 限制，切换到投诉模式调试
sudo aa-complain nginx
```

> 临时禁用 SELinux（`setenforce 0`）仅用于排查问题，确认是 SELinux 导致后应使用 `chcon` 或 `semanage fcontext` 正确设置上下文。

### 6.3 ACL 访问控制列表

当标准权限修复无法解决问题时，使用 ACL 为 `www-data` 用户添加精细的读取权限：

```bash
# 安装 ACL 工具
sudo apt install acl

# 为 www-data 用户添加递归读取和执行权限
sudo setfacl -R -m u:www-data:rx /home/ubuntu/data/build/prod/fe_star/build/
sudo setfacl -R -m u:www-data:r /home/ubuntu/data/build/prod/fe_star/build/*

# 验证 ACL 设置
getfacl /home/ubuntu/data/build/prod/fe_star/build/
```

ACL 的优势在于不影响文件原有的 owner/group 权限，只额外授权给指定用户。

### 6.4 Nginx 运行用户调整

当权限链修复困难（如目录由特殊用户管理），可以调整 Nginx 的运行用户：

```bash
# 查看当前 Nginx 运行用户
cat /etc/nginx/nginx.conf | grep user

# 修改运行用户（编辑 nginx.conf）
sudo nano /etc/nginx/nginx.conf
# 将 user www-data; 改为：
# user ubuntu;

# 重启生效
sudo systemctl restart nginx
```

**替代方案** — 将 ubuntu 用户加入 www-data 组：

```bash
sudo usermod -a -G www-data ubuntu
newgrp www-data

# 调整目录组权限
sudo chown -R ubuntu:www-data /home/ubuntu/data/build/prod/fe_star/build/
sudo chmod -R 775 /home/ubuntu/data/build/prod/fe_star/build/
```

> 修改 Nginx 运行用户会影响所有站点的安全隔离，建议仅在开发环境使用。生产环境优先修复目录权限。

### 6.5 日志分析与调试

**实时监控日志：**

```bash
# 实时查看错误日志
sudo tail -f /var/log/nginx/x.xluo.xin.error.log

# 实时查看访问日志
sudo tail -f /var/log/nginx/x.xluo.xin.access.log
```

**常见错误信息解读：**

| 错误信息 | 原因 | 解决方向 |
|---------|------|---------|
| `Permission denied (13)` | Nginx 进程无权访问文件 | 检查目录权限链、SELinux/AppArmor |
| `rewrite or internal redirection cycle` | try_files 循环重定向 | 检查 index.html 是否存在且可读 |
| `no live upstreams` | 后端服务不可达 | 检查后端服务状态和网络连通性 |
| `upstream timed out` | 后端响应超时 | 增大 `proxy_read_timeout` 或优化后端性能 |
| `connect() failed (111)` | 连接被拒绝 | 后端服务未启动或端口不对 |

## 7. 部署与验证

### 7.1 部署步骤

从创建配置到上线的完整流程：

```bash
# 1. 创建配置文件
sudo nano /etc/nginx/sites-available/example.conf
# 编写配置内容并保存

# 2. 启用站点（创建符号链接）
sudo ln -s /etc/nginx/sites-available/example.conf /etc/nginx/sites-enabled/

# 3. 测试配置语法
sudo nginx -t
# 输出 "syntax is ok" 和 "test is successful" 表示配置正确

# 4. 重载配置（不中断现有连接）
sudo systemctl reload nginx

# 如需完全重启（中断连接）
sudo systemctl restart nginx
```

> 修改配置后始终先执行 `nginx -t`，语法错误会导致 reload 失败，所有站点停服。

### 7.2 验证与测试

```bash
# 检查 Nginx 服务状态
sudo systemctl status nginx

# 检查端口监听情况
sudo ss -tlnp | grep nginx
# 或
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# 检查响应头（HTTP）
curl -I http://x.xluo.xin

# 检查响应头（HTTPS）
curl -I https://x.xluo.xin

# 检查 HTTP 到 HTTPS 重定向
curl -I http://callback.xluo.xin
# 应返回 301 状态码和 Location: https://... 头

# 检查 SSL 证书信息
echo | openssl s_client -connect callback.xluo.xin:443 -servername callback.xluo.xin 2>/dev/null | openssl x509 -noout -dates
```

### 7.3 日志分离与监控

为不同域名或路径配置独立的日志文件，便于问题定位：

```nginx
# 站点级别日志
access_log /var/log/nginx/callback.xluo.xin.access.log;
error_log /var/log/nginx/callback.xluo.xin.error.log;

# 路径级别日志（覆盖站点级别）
location /alipay {
    proxy_pass http://172.26.19.206:8090/api/guest/op.alipay/callback;
    access_log /var/log/nginx/callback.xluo.xin.alipay.log;
}
```

**日志文件组织建议：**

```
/var/log/nginx/
├── x.xluo.xin.access.log          # 静态站点访问日志
├── x.xluo.xin.error.log           # 静态站点错误日志
├── callback.xluo.xin.access.log   # 反向代理访问日志
├── callback.xluo.xin.error.log    # 反向代理错误日志
└── callback.xluo.xin.alipay.log   # 支付宝回调专用日志
```

定期清理旧日志，或使用 `logrotate` 自动轮转：

```bash
# Nginx 安装时通常自带 logrotate 配置
cat /etc/logrotate.d/nginx
```
