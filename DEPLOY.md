# Deployment Guide

## Prerequisites

- Docker and Docker Compose installed on your Tencent Cloud server
- Domain name with DNS pointing to your server
- SSL certificate (e.g., from Let's Encrypt)

## Quick Start (Development)

```bash
# Clone the repository
git clone <your-repo-url>
cd screenflow-ai-studio

# Create .env file
cp .env.example .env
# Edit .env with your values (JWT_SECRET, OPENROUTER_API_KEY, etc.)

# Build and run
docker-compose up -d --build

# Verify
curl http://localhost:4000/api/health
```

## Production Deployment

### 1. Prepare Environment

```bash
# Clone the repository
git clone <your-repo-url>
cd screenflow-ai-studio

# Create .env file with production values
cat > .env << EOF
JWT_SECRET=$(openssl rand -hex 32)
OPENROUTER_API_KEY=sk-or-your-key-here
AI_MODEL=meta-llama/llama-3.1-8b-instruct:free
CORS_ORIGIN=https://yourdomain.com
SSL_CERT_PATH=/path/to/your/cert.pem
SSL_KEY_PATH=/path/to/your/key.pem
EOF
```

### 2. Configure Nginx

Edit `nginx/nginx.conf` and replace `yourdomain.com` with your actual domain.

### 3. Place SSL Certificates

```bash
# Option A: Copy certificates to nginx directory
cp /path/to/cert.pem nginx/cert.pem
cp /path/to/key.pem nginx/key.pem

# Option B: Use paths in .env
# SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
# SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### 4. Build and Deploy

```bash
# Build and start with production config
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Verify
curl https://yourdomain.com/api/health
```

### 5. Verify Deployment

1. Open `https://yourdomain.com` in a browser
2. Test video call between two browsers
3. Check WebSocket connectivity (DevTools → Network → WS tab)

## Useful Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Rebuild after code changes
docker-compose -f docker-compose.prod.yml up -d --build

# Access database
docker-compose -f docker-compose.prod.yml exec app sh
cd /app/server && npx prisma studio
```

## Troubleshooting

### WebSocket not connecting
- Ensure nginx config has proper WebSocket upgrade headers
- Check CORS_ORIGIN matches your domain
- Verify SSL certificate is valid

### Database issues
- SQLite database is stored in a Docker volume (`db-data`)
- To reset: `docker-compose -f docker-compose.prod.yml down -v`

### Port conflicts
- Change ports in `docker-compose.prod.yml` if 80/443 are in use
- Update nginx config accordingly
