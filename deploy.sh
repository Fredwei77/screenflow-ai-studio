#!/bin/bash
set -e

echo "=== ScreenFlow AI Studio - Deploy to your-domain.example/meet ==="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ── 1. Check Docker ──
echo -e "${YELLOW}[1/5] Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found. Installing...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed.${NC}"
else
    echo -e "${GREEN}Docker found: $(docker --version)${NC}"
fi

if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo -e "${RED}Docker Compose not found. Installing...${NC}"
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    COMPOSE="docker compose"
    echo -e "${GREEN}Docker Compose installed.${NC}"
fi

# ── 2. Check port 4000 ──
echo ""
echo -e "${YELLOW}[2/5] Checking port 4000...${NC}"
if ss -tlnp | grep -q ':4000 '; then
    echo -e "${RED}Port 4000 is in use. Attempting to stop old container...${NC}"
    $COMPOSE -f docker-compose.prod.yml down 2>/dev/null || true
    sleep 2
    if ss -tlnp | grep -q ':4000 '; then
        echo -e "${RED}Port 4000 still in use. Please stop the process manually.${NC}"
        ss -tlnp | grep ':4000'
        exit 1
    fi
fi
echo -e "${GREEN}Port 4000 is available.${NC}"

# ── 3. Create .env ──
echo ""
echo -e "${YELLOW}[3/5] Configuring environment...${NC}"
if [ ! -f .env ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    cat > .env << EOF
JWT_SECRET=${JWT_SECRET}
OPENROUTER_API_KEY=replace-with-your-openrouter-key
AI_MODEL=meta-llama/llama-3.1-8b-instruct:free
CORS_ORIGIN=https://your-domain.example
EOF
    echo -e "${GREEN}.env created.${NC}"
    echo -e "${YELLOW}>>> IMPORTANT: Edit .env and set your OPENROUTER_API_KEY! <<<${NC}"
    echo ""
    read -p "Press Enter after editing .env (or Ctrl+C to abort)..."
else
    echo -e "${GREEN}.env already exists, skipping.${NC}"
fi

# ── 4. Build and start ──
echo ""
echo -e "${YELLOW}[4/5] Building Docker image (this takes a few minutes)...${NC}"
$COMPOSE -f docker-compose.prod.yml build

echo ""
echo -e "${YELLOW}[5/5] Starting services...${NC}"
$COMPOSE -f docker-compose.prod.yml up -d

echo ""
echo -e "${GREEN}=== Docker app started on port 4000 ===${NC}"

# ── 5. Configure Nginx ──
echo ""
echo -e "${YELLOW}Checking Nginx configuration...${NC}"

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}Nginx not found. Please install nginx first:${NC}"
    echo "  apt install nginx"
    exit 1
fi

# Find the existing site config
SITE_CONF=""
for conf in /etc/nginx/conf.d/*.conf /etc/nginx/sites-enabled/*; do
    if [ -f "$conf" ] && grep -q "your-domain.example" "$conf" 2>/dev/null; then
        SITE_CONF="$conf"
        break
    fi
done

if [ -z "$SITE_CONF" ]; then
    echo -e "${RED}Could not find nginx config for your-domain.example${NC}"
    echo "Please manually add the following location blocks to your nginx server config:"
    echo ""
    cat nginx/meet.your-domain.example.conf
    echo ""
else
    echo -e "${GREEN}Found site config: $SITE_CONF${NC}"

    # Check if /meet/ location already exists
    if grep -q "location /meet/" "$SITE_CONF" 2>/dev/null; then
        echo -e "${GREEN}Nginx /meet/ location already configured.${NC}"
    else
        echo -e "${YELLOW}Adding /meet/ location blocks to $SITE_CONF${NC}"

        # Find the closing brace of the server block and insert before it
        # First, back up the config
        cp "$SITE_CONF" "${SITE_CONF}.bak.$(date +%s)"

        # Insert location blocks before the last closing brace
        sed -i '/^}/i \
    # ScreenFlow AI Studio - Video Meeting\
    location /meet/socket.io {\
        proxy_pass http://127.0.0.1:4000/socket.io;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
    }\
\
    location /meet/ {\
        proxy_pass http://127.0.0.1:4000/;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
    }' "$SITE_CONF"

        # Test nginx config
        if nginx -t 2>/dev/null; then
            systemctl reload nginx
            echo -e "${GREEN}Nginx config updated and reloaded.${NC}"
        else
            echo -e "${RED}Nginx config test failed! Restoring backup...${NC}"
            cp "${SITE_CONF}.bak."* "$SITE_CONF"
            nginx -t
            echo ""
            echo "Please manually add the location blocks from nginx/meet.your-domain.example.conf"
        fi
    fi
fi

echo ""
echo "============================================"
echo -e "${GREEN}Deployment complete!${NC}"
echo "============================================"
echo ""
echo "  App:     https://your-domain.example/meet"
echo "  Health:  curl -k https://your-domain.example/meet/api/health"
echo ""
echo "  Logs:    $COMPOSE -f docker-compose.prod.yml logs -f"
echo "  Restart: $COMPOSE -f docker-compose.prod.yml restart"
echo "  Stop:    $COMPOSE -f docker-compose.prod.yml down"
echo ""
