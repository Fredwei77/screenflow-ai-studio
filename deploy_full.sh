#!/bin/bash
# ============================================================
# ScreenFlow AI Studio — 完整部署脚本 (含 TURN 视频穿透)
# 适用：腾讯云 / Ubuntu 22.04
# ============================================================
set -e

DOMAIN="your-domain.example"
APP_PORT="4000"
TURN_PORT="3478"
TURN_TLS_PORT="443"

echo "=== ScreenFlow AI Studio — 完整部署 ==="
echo "域名: $DOMAIN"
echo ""

# ── 1. 检查 Docker ──
echo "[1/7] 检查 Docker..."
if ! command -v docker &> /dev/null; then
  echo "安装 Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi
echo "Docker: $(docker --version)"

COMPOSE=$(docker compose version &>/dev/null && echo "docker compose" || echo "docker-compose")

# ── 2. 获取服务器公网 IP ──
echo ""
echo "[2/7] 获取服务器公网 IP..."
PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || curl -s ip.sb)
if [ -z "$PUBLIC_IP" ]; then
  echo "无法获取公网 IP，使用内网地址，请在 turnserver.conf 中手动设置"
  PUBLIC_IP="YOUR_SERVER_PUBLIC_IP"
fi
echo "公网 IP: $PUBLIC_IP"

# ── 3. 准备目录结构 ──
echo ""
echo "[3/7] 准备目录..."
mkdir -p ~/screenflow-deploy/nginx/ssl
mkdir -p ~/screenflow-deploy/turn

# ── 4. 配置 TURN 服务器 ──
echo ""
echo "[4/7] 配置 Coturn TURN 服务器..."

TURN_CONF="~/screenflow-deploy/turn/turnserver.conf"
cat > "$TURN_CONF" << EOF
# Coturn TURN Server — screenflow-ai-studio
# 服务器公网IP（自动检测）
external-ip=${PUBLIC_IP}

# 监听端口
listening-port=${TURN_PORT}
tls-listening-port=${TURN_TLS_PORT}

# 服务器身份
server-name=${DOMAIN}
realm=${DOMAIN}

# 开放中继（视频会议场景，无认证）
lt-cred-mech
# 用户名/密码（用于 WebRTC TURN）
user=screenflow:replace-with-a-strong-turn-password

# 协议
stun-only
no-multicast-peers

# 日志
syslog
verbose

# 性能（0=无限制）
max-bps=0
bps-capacity=0

# 安全
no-tls
no-dtls
fingerprint
no-cli
EOF

echo "TURN 配置: $TURN_CONF"

# ── 5. 配置 Nginx（SSL 反向代理）──
echo ""
echo "[5/7] 配置 Nginx..."

# 检查是否有 SSL 证书
SSL_CERT=""
SSL_KEY=""
for cert_path in /etc/letsencrypt/live/$DOMAIN/fullchain.pem ~/screenflow-deploy/nginx/ssl/cert.pem; do
  if [ -f "$cert_path" ]; then
    SSL_CERT="$cert_path"
    SSL_KEY=$(echo "$cert_path" | sed 's/fullchain.pem/privkey.pem/')
    break
  fi
done

if [ -n "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
  echo "找到 SSL 证书: $SSL_CERT"
else
  echo "未找到 SSL 证书，使用自签名证书（浏览器会有警告）"
  # 生成自签名证书
  OPENSSL_CNF=$(mktemp)
  cat > "$OPENSSL_CNF" << 'CONFEOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn
[dn]
C = CN
ST = Beijing
L = Beijing
O = ScreenFlow
CN = $DOMAIN
[v3_req]
subjectAltName = @alt_names
[alt_names]
DNS.1 = $DOMAIN
DNS.2 = *.$DOMAIN
IP.1 = $PUBLIC_IP
CONFEOF
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ~/screenflow-deploy/nginx/ssl/key.pem \
    -out ~/screenflow-deploy/nginx/ssl/cert.pem \
    -config "$OPENSSL_CNF" 2>/dev/null
  SSL_CERT=~/screenflow-deploy/nginx/ssl/cert.pem
  SSL_KEY=~/screenflow-deploy/nginx/ssl/key.pem
  rm -f "$OPENSSL_CNF"
fi

# 生成 Nginx 配置
cat > ~/screenflow-deploy/nginx/nginx.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Socket.IO WebSocket
    location /socket.io/ {
        proxy_pass http://127.0.0.1:$APP_PORT/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # App (Express serves built frontend + API)
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 安装 Nginx 配置
echo "安装 Nginx 配置..."
sudo cp ~/screenflow-deploy/nginx/nginx.conf /etc/nginx/sites-available/screenflow
sudo ln -sf /etc/nginx/sites-available/screenflow /etc/nginx/sites-enabled/screenflow
sudo rm -f /etc/nginx/sites-enabled/default  # 移除默认配置

if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
  echo "Nginx 配置正确"
  sudo systemctl reload nginx
else
  echo "Nginx 配置有误，请检查"
  sudo nginx -t
  exit 1
fi

# ── 6. 构建和启动 Docker ──
echo ""
echo "[6/7] 构建并启动 Docker 服务..."

cd ~/screenflow-deploy
if [ ! -f .env ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  cat > .env << EOF
JWT_SECRET=${JWT_SECRET}
OPENROUTER_API_KEY=replace-with-your-openrouter-key
AI_MODEL=meta-llama/llama-3.1-8b-instruct:free
CORS_ORIGIN=https://${DOMAIN}
EOF
  echo "请编辑 .env 填入 OPENROUTER_API_KEY"
fi

# 复制 docker-compose.prod.yml
cp /dev/stdin docker-compose.yml << 'DOCKEREOF'
version: '3.8'
services:
  app:
    image: ghcr.io/screenflow-ai/screenflow-ai-studio:latest
    ports:
      - "127.0.0.1:4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/data/screenflow.db
      - JWT_SECRET=${JWT_SECRET}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - AI_MODEL=${AI_MODEL:-meta-llama/llama-3.1-8b-instruct:free}
      - CORS_ORIGIN=https://${DOMAIN}
    volumes:
      - app-data:/app/data
    restart: unless-stopped

  coturn:
    image: instrumentisto/coturn:latest
    ports:
      - "$TURN_PORT:$TURN_PORT/tcp"
      - "$TURN_PORT:$TURN_PORT/udp"
      - "49160-49200:49160-49200/udp"
    volumes:
      - ./turn/turnserver.conf:/etc/coturn/turnserver.conf:ro
    restart: unless-stopped
    cap_add:
      - NET_ADMIN

volumes:
  app-data:
DOCKEREOF

# 注意：由于项目已有 docker-compose.prod.yml，
# 如果项目代码在 ~/screenflow-deploy，直接使用项目目录的 docker-compose.prod.yml

echo "请确保 docker-compose.prod.yml 已包含 coturn 服务配置"
echo "然后运行: cd ~/screenflow-deploy && docker compose up -d --build"

# ── 7. 防火墙设置 ──
echo ""
echo "[7/7] 配置防火墙..."
if command -v ufw &> /dev/null; then
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw allow $TURN_PORT/tcp
  sudo ufw allow $TURN_PORT/udp
  sudo ufw allow 49160-49200/udp
  sudo ufw --force enable
  echo "防火墙已配置 (UFW)"
elif command -v firewalld &> /dev/null; then
  sudo firewall-cmd --permanent --add-port=$TURN_PORT/tcp
  sudo firewall-cmd --permanent --add-port=$TURN_PORT/udp
  sudo firewall-cmd --permanent --add-port=49160-49200/udp
  sudo firewall-cmd --reload
  echo "防火墙已配置 (firewalld)"
fi

echo ""
echo "============================================"
echo "  部署步骤完成！"
echo "============================================"
echo ""
echo "  下一步："
echo "  1. 将代码上传到服务器: ~/screenflow-deploy/"
echo "     (或 git clone 到 ~/screenflow-deploy/)"
echo "  2. 编辑 ~/screenflow-deploy/.env 填入 OPENROUTER_API_KEY"
echo "  3. 编辑 ~/screenflow-deploy/turn/turnserver.conf"
echo "     确认 external-ip=你的公网IP"
echo "  4. 构建并启动:"
echo "     cd ~/screenflow-deploy"
echo "     docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "  访问: https://${DOMAIN}/meet"
echo "  健康检查: curl https://${DOMAIN}/api/health"
echo ""
echo "  TURN 服务器: $DOMAIN:$TURN_PORT"
echo "  (WebRTC 会自动在 STUN 失败时使用)"
echo ""
