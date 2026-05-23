# ScreenFlow AI Studio 部署文档

## 目录
- [环境要求](#环境要求)
- [部署步骤](#部署步骤)
- [注意事项](#注意事项)
- [日常维护](#日常维护)
- [故障排查](#故障排查)

---

## 环境要求

| 项目 | 要求 |
|------|------|
| 系统 | Ubuntu 20.04+ / Debian 11+ |
| CPU | 2 核+（推荐 4 核+） |
| 内存 | 4GB+（推荐 8GB+） |
| 磁盘 | 50GB+ 可用空间 |
| Docker | 20.10+ |
| Docker Compose | 2.0+ |
| 域名 | 已备案域名，配置好 SSL 证书 |

---

## 部署步骤

### 1. 服务器环境准备

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo apt update
sudo apt install docker-compose -y

# 验证安装
docker --version
docker-compose --version
```

### 2. 上传项目代码

```bash
# 本地打包（项目根目录）
git archive --format=tar --prefix=screenflow-ai-studio/ HEAD | gzip > screenflow-deploy.tar.gz

# 上传到服务器
scp screenflow-deploy.tar.gz ubuntu@your-server:/tmp/

# 服务器解压
ssh ubuntu@your-server
sudo mv /tmp/screenflow-deploy.tar.gz /opt/
cd /opt
sudo tar -xzf screenflow-deploy.tar.gz
sudo mv screenflow-deploy.tar.gz screenflow-ai-studio/
cd screenflow-ai-studio
```

### 3. 配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑配置
nano .env
```

必需配置项：
```env
JWT_SECRET=your-secret-key-here-min-32-chars
CORS_ORIGIN=https://your-domain.com
OPENROUTER_API_KEY=your-api-key
```

### 4. 构建并启动

```bash
# 构建镜像（首次部署或代码更新）
sudo docker-compose -f docker-compose.prod.yml build --no-cache

# 启动服务
sudo docker-compose -f docker-compose.prod.yml up -d

# 查看状态
sudo docker-compose -f docker-compose.prod.yml ps
```

### 5. 验证部署

```bash
# 检查容器状态
docker ps | grep screenflow

# 检查日志
docker logs --tail 50 screenflow-ai-studio-app-1

# 检查端口
curl http://localhost:4000/api/health
```

---

## 注意事项

### 代码更新流程

1. **不要**直接在服务器上修改代码
2. 本地完成开发和测试后，按以下流程部署：

```bash
# 本地打包（使用要部署的 commit 或 tag）
git archive --format=tar --prefix=screenflow-ai-studio/ HEAD | gzip > screenflow.tar.gz

# 上传到服务器（先备份）
ssh ubuntu@your-server
sudo cp -r /opt/screenflow-ai-studio /opt/screenflow-ai-studio.backup
sudo rm -rf /opt/screenflow-ai-studio
tar -xzf screenflow.tar.gz -C /opt

# 重建镜像
cd /opt/screenflow-ai-studio
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Docker 镜像构建注意事项

- **构建超时**：服务器网络慢时，npm ci 可能超时。确保网络连接稳定
- **磁盘空间**：构建前检查磁盘空间，确保有 20GB+ 可用
  ```bash
  df -h /
  ```
- **mediasoup 编译**：mediasoup 需要编译原生模块，确保服务器可以访问 WrapDB

### 环境配置注意事项

- **JWT_SECRET**：生产环境必须设置复杂的随机密钥，不要使用默认值
- **CORS_ORIGIN**：必须设置为实际访问的域名，包含协议（https://）
- **数据库路径**：docker-compose 中已配置持久化挂载，删除容器不会丢失数据

### 端口注意事项

| 端口 | 用途 | 说明 |
|------|------|------|
| 4000 | HTTP API | 仅监听 127.0.0.1 |
| 10000-10100 | WebRTC UDP | 媒体传输，需对公网开放 |

---

## 日常维护

### 查看日志

```bash
# 实时查看应用日志
docker logs -f screenflow-ai-studio-app-1

# 查看最近 100 行
docker logs --tail 100 screenflow-ai-studio-app-1

# 查看错误日志
docker logs screenflow-ai-studio-app-1 2>&1 | grep -i error
```

### 容器管理

```bash
# 重启应用容器
docker-compose -f docker-compose.prod.yml restart app

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 完全重建
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

### 数据库操作

```bash
# 进入数据库目录
docker exec -it screenflow-ai-studio-app-1 sh
cd /app/data
sqlite3 screenflow.db

# 备份数据库
docker exec screenflow-ai-studio-app-1 sh -c 'cp /app/data/screenflow.db /app/data/screenflow.db.bak'
docker cp screenflow-ai-studio-app-1:/app/data/screenflow.db.bak ./
```

### 清理资源

```bash
# 清理未使用的 Docker 资源
docker system prune -a

# 清理旧镜像
docker image prune -a

# 清理构建缓存
docker builder prune -a
```

### 更新 SSL 证书

SSL 证书位于 `/opt/screenflow-ai-studio/nginx/ssl/` 目录：

```bash
# 更新证书后重启 Nginx
docker exec nginx nginx -s reload
```

---

## 故障排查

### 容器启动失败

```bash
# 1. 检查容器状态
docker ps -a | grep screenflow

# 2. 查看详细日志
docker logs screenflow-ai-studio-app-1

# 3. 常见错误：
#    - "JWT_SECRET environment variable is required" → 检查 .env 配置
#    - "Port is already allocated" → 端口被占用，检查其他服务
#    - "mediasoup worker failed" → 检查 UDP 端口是否开放
```

### WebRTC 无法连接

```bash
# 1. 检查 UDP 端口
nc -v -u -z localhost 10000 10100

# 2. 检查服务器防火墙
sudo ufw status
sudo iptables -L -n | grep 10000

# 3. 检查 Coturn 服务
docker ps | grep coturn
docker logs screenflow-ai-studio-coturn-1
```

### 前端资源 404

```bash
# 1. 检查前端文件是否存在
docker exec screenflow-ai-studio-app-1 sh -c 'ls -la /app/dist/'

# 2. 检查 Nginx 配置
cat /opt/screenflow-ai-studio/nginx/nginx.conf
```

### 数据库损坏

```bash
# 1. 停止服务
docker-compose -f docker-compose.prod.yml down

# 2. 恢复备份
docker cp screenflow.db.bak screenflow-ai-studio-app-1:/app/data/screenflow.db

# 3. 重启服务
docker-compose -f docker-compose.prod.yml up -d
```

### 服务响应慢

```bash
# 1. 检查资源使用
docker stats

# 2. 检查内存
free -h

# 3. 检查磁盘 I/O
df -h
```

---

## 快速命令参考

```bash
# 部署更新
cd /opt/screenflow-ai-studio
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 查看状态
docker ps
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker logs -f screenflow-ai-studio-app-1

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 完全停止
docker-compose -f docker-compose.prod.yml down
```

---

## 联系方式

如遇问题，请提供：
1. `docker logs screenflow-ai-studio-app-1` 输出
2. `docker ps -a` 输出
3. 操作系统的 `/var/log/syslog` 相关错误