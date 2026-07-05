---
title: Certbot 使用指南
created: 2026-01-13
updated: 2026-03-26
source: https://certbot.eff.org
tags: [certbot, ssl, https, nginx, lets-encrypt]
aliases: [Let's Encrypt, SSL 证书]
description: Certbot 是 Let's Encrypt 官方推荐的免费 SSL/TLS 证书管理工具，支持自动获取、配置和续期证书
---

# Certbot 使用指南

## 目录

- [一、Certbot 简介](#一certbot-简介)
- [二、前置条件](#二前置条件)
- [三、安装 Certbot](#三安装-certbot)
- [四、获取 SSL 证书](#四获取-ssl-证书)
- [五、配置 Web 服务器](#五配置-web-服务器)
- [六、证书自动续期](#六证书自动续期)
- [七、证书管理](#七证书管理)
- [八、测试 HTTPS 配置](#八测试-https-配置)
- [九、常见问题与解决方案](#九常见问题与解决方案)

## 一、Certbot 简介

Certbot 是一款免费且开源的自动化安全证书管理工具，由电子前沿基金会（EFF）开发和维护。它专门用于在 Linux、Apache 和 Nginx 服务器上配置和管理 SSL/TLS 证书，能够自动完成域名认证和证书安装。

Let's Encrypt 是一个由非营利组织 ISRG 提供的免费证书颁发机构，Certbot 则是其官方推荐的自动化工具。核心优势包括：

- **免费**：无需支付证书费用
- **自动化**：提供自动获取和续期证书的功能
- **开源**：社区支持广泛，兼容多种服务器环境
- **快速**：几分钟即可完成配置

## 二、前置条件

在开始之前，请确保已准备好以下内容：

1. **一个域名**：已解析到你的服务器 IP
2. **服务器环境**：支持 Linux（如 Ubuntu、CentOS）或类似系统
3. **Web 服务器**：已安装 Nginx 或 Apache
4. **管理员权限**：需要 root 或 sudo 权限来执行命令

## 三、安装 Certbot

### 3.1 CentOS/RHEL 系统

```bash
yum install epel-release -y
yum install certbot -y
```

如果遇到 `python-urllib3` 依赖问题，需要先备份或删除相关的 Python 文件：

```bash
mv /usr/lib/python2.7/site-packages/urllib3/packages/ssl_match_hostname /usr/lib/python2.7/site-packages/urllib3/packages/ssl_match_hostname.bak
yum install python-urllib3 -y
```

然后再执行安装 certbot 命令。

### 3.2 Ubuntu/Debian 系统（推荐使用 snap）

```bash
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

验证安装是否成功：

```bash
certbot --version
```

输出类似 `certbot 2.x.x` 说明安装完成。

### 3.3 使用包管理器安装

```bash
# Ubuntu/Debian
apt install certbot python3-certbot-nginx

# CentOS/RHEL
yum install certbot python3-certbot-nginx
```

## 四、获取 SSL 证书

### 4.1 证书类型区分

域名分为主域名和泛域名：

- **主域名**：如 `example.com`
- **泛域名**：如 `*.example.com`

### 4.2 使用 Nginx 插件自动获取证书

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

- `-d` 指定需要 HTTPS 的域名，可以多次使用以支持多个子域名
- Certbot 会通过 HTTP-01 挑战验证域名所有权

**注意事项**：申请证书之前必须安装好 nginx，并配置好对应域名的 conf 文件。

### 4.3 使用 Apache 插件获取证书

```bash
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com
```

### 4.4 使用 Webroot 方式获取证书

适用于已有 Web 服务器但不想让 Certbot 自动配置的情况：

```bash
sudo certbot certonly --webroot -w /var/www/html -d example.com -d www.example.com
```

需要在 Web 服务器配置中添加 ACME 挑战路径：

```nginx
location ~ "^/.well-known/acme-challenge/(.*)$" {
    default_type text/plain;
    return 200 "$1";
}
```

### 4.5 使用 DNS 验证方式获取证书

适用于获取泛域名证书或没有 Web 服务器的情况。

#### 泛域名证书

```bash
certbot certonly -d *.example.com --manual --preferred-challenges dns
```

#### 主域名证书

```bash
certbot certonly -d example.com --manual --preferred-challenges dns
```

执行过程中会提示输入邮箱（用于接收续期通知），并同意服务条款，然后需要配置 DNS TXT 解析记录。

**DNS 配置示例（阿里云）**：

1. 进入阿里云控制中心 → 找到域名解析设置 → 添加新记录
2. 记录类型选择 `TXT-文本`
3. 主机记录填入：`_acme-challenge`
4. 解析请求来源选择默认
5. 记录值填入控制台提供的记录值
6. 保存，等待生效后按回车继续

### 4.6 使用 Standalone 模式

需要临时停止 Web 服务器：

```bash
sudo certbot certonly --standalone -d example.com
```

### 4.7 证书存储位置

证书生成成功后，证书文件存储在 `/etc/letsencrypt/live/yourdomain.com/` 目录下：

- `fullchain.pem`：完整证书链
- `privkey.pem`：私钥文件
- `cert.pem`：服务器证书
- `chain.pem`：中间证书

## 五、配置 Web 服务器

### 5.1 Nginx 配置

如果使用 `--nginx` 插件，Certbot 会自动修改 Nginx 配置文件。也可以手动配置：

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL 会话配置
    ssl_session_timeout 5m;
    ssl_session_cache shared:SSL:10m;

    # 加密套件配置
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_protocols TLSv1.2 TLSv1.3;

    # HSTS 头
    add_header Strict-Transport-Security "max-age=63072000" always;

    # 其他配置...
}
```

验证配置并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5.2 防火墙配置

确保 80 和 443 端口开放：

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## 六、证书自动续期

Let's Encrypt 证书有效期为 90 天，Certbot 提供自动续期功能。

### 6.1 测试自动续期

```bash
sudo certbot renew --dry-run
```

如果没有报错，说明续期配置正常。

### 6.2 查看自动续期服务状态

```bash
sudo systemctl status snap.certbot.renew.service
```

### 6.3 手动续期证书

```bash
sudo certbot renew
```

### 6.4 设置定时续期任务

```bash
sudo crontab -e
```

添加以下行（每天凌晨 2 点检查续期）：

```bash
0 2 * * * /usr/bin/certbot renew --quiet
```

### 6.5 泛域名证书自动续期

对于泛域名证书，需要配置自动 DNS 验证脚本和定时任务。

### 6.6 强制续期（即使证书未过期）

```bash
sudo certbot renew --force-renewal
```

### 6.7 部署钩子脚本

证书续期后自动重启 Web 服务器：

```bash
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy/

sudo nano /etc/letsencrypt/renewal-hooks/deploy/restart-nginx.sh
```

脚本内容：

```bash
#!/bin/bash
systemctl reload nginx
```

设置执行权限：

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-nginx.sh
```

## 七、证书管理

### 7.1 查看证书列表

```bash
sudo certbot certificates
```

### 7.2 多域名证书

使用多个域名生成一个证书：

```bash
sudo certbot certonly -d example.com -d www.example.com -d mail.example.com
```

### 7.3 自定义证书名称

```bash
sudo certbot certonly --cert-name mycustomcert -d example.com
```

### 7.4 扩展证书域名

使用 `--expand` 选项添加新域名而不替换现有证书：

```bash
sudo certbot certonly --cert-name example.com --expand -d new.example.com
```

### 7.5 吊销证书

如果证书因安全原因需要吊销（如私钥泄露）：

```bash
sudo certbot revoke --cert-path /etc/letsencrypt/archive/yourdomain.com/cert1.pem
```

或者使用证书名称：

```bash
sudo certbot revoke --cert-name yourdomain.com
```

### 7.6 删除证书

#### 方法一：直接删除（推荐）

```bash
sudo certbot delete --cert-name yourdomain.com
```

#### 方法二：先吊销再删除

1. 备份证书（可选但推荐）：
   ```bash
   sudo cp -r /etc/letsencrypt/ /etc/letsencrypt.backup
   ```

2. 吊销证书：
   ```bash
   sudo certbot revoke --cert-name yourdomain.com
   ```

3. 删除证书文件：
   ```bash
   sudo certbot delete
   ```

### 7.7 删除证书后清理

删除证书后，记得删除 Web 服务器（如 Nginx）中的 SSL 配置，并重启服务：

```bash
sudo systemctl restart nginx
```

## 八、测试 HTTPS 配置

1. **浏览器测试**：在浏览器中访问 `https://yourdomain.com`，检查是否加载正常

2. **OpenSSL 测试**：
   ```bash
   openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
   ```

3. **在线工具测试**：使用 [SSL Labs SSL Server Test](https://www.ssllabs.com/ssltest/) 检查证书状态

## 九、常见问题与解决方案

### 9.1 DNS 解析错误

确保域名已正确解析到服务器 IP：

```bash
dig yourdomain.com
# 或
nslookup yourdomain.com
```

### 9.2 Nginx 配置未自动更新

手动检查 `/etc/letsencrypt/live/yourdomain.com/` 下的证书路径，并更新 Nginx 配置文件。

### 9.3 续期失败

检查服务器是否允许 80 端口访问，Let's Encrypt 需要通过 HTTP 验证续期。

### 9.4 权限问题

确保 CertBot 有足够权限：

```bash
sudo chmod 755 /etc/letsencrypt/
sudo chmod 755 /var/lib/letsencrypt/
```

### 9.5 端口被占用

standalone 模式需要 80 和 443 端口可用，确保没有其他服务占用。

### 9.6 DNS 传播延迟

对于 DNS 挑战模式，可能需要等待 DNS 更新生效。

## 十、安全最佳实践

1. **定期备份** `/etc/letsencrypt/` 目录

2. **限制私钥权限**：
   ```bash
   sudo chmod 600 /etc/letsencrypt/live/yourdomain.com/privkey.pem
   sudo chown root:root /etc/letsencrypt/live/yourdomain.com/privkey.pem
   ```

3. **强制 HTTPS 重定向**：在 Nginx 配置中添加 301 重定向

4. **使用 --non-interactive 模式**：在脚本中自动执行

## 参考资料

- [Certbot 官方网站](https://certbot.eff.org)
- [Let's Encrypt 官方文档](https://letsencrypt.org/zh-cn/docs/)
- [吊销证书](https://letsencrypt.org/zh-cn/docs/revoking/)
