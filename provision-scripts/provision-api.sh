#!/bin/bash
set -euo pipefail

echo "🚀 Starting API provision..."

# Configurações fixas para simplificar
API_DOMAIN="api.xml.lojasrealce.shop"
API_PORT="3001"
CERTBOT_EMAIL="pedrojr.xp@gmail.com"
ALLOWED1="https://xml.lojasrealce.shop"
ALLOWED2="https://www.xml.lojasrealce.shop"

echo "📋 Config: $API_DOMAIN -> port $API_PORT"

# Atualizar sistema
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Nginx server block
echo "🔧 Configuring Nginx..."
CONF="/etc/nginx/sites-available/${API_DOMAIN}"
sudo bash -lc "cat > '$CONF' <<'NGINX'
server {
  listen 80;
  server_name ${API_DOMAIN};
  
  location / {
    proxy_pass http://127.0.0.1:${API_PORT};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINX"

sudo ln -sf "$CONF" "/etc/nginx/sites-enabled/${API_DOMAIN}"
sudo nginx -t
sudo systemctl reload nginx
echo "✅ Nginx configured and reloaded"

# Issue SSL certificate
echo "🔒 Issuing SSL certificate..."
sudo certbot --nginx -d "$API_DOMAIN" -m "$CERTBOT_EMAIL" --agree-tos --non-interactive --redirect || true
sudo systemctl reload nginx || true
echo "✅ SSL certificate issued"

# Configure backend CORS
echo "🔧 Configuring backend CORS..."
ENV_FILE="/var/www/api/.env"
sudo mkdir -p /var/www/api
sudo touch "$ENV_FILE"
sudo bash -lc "grep -q '^ALLOWED_ORIGINS=' '$ENV_FILE' && sed -i 's#^ALLOWED_ORIGINS=.*#ALLOWED_ORIGINS=${ALLOWED1},${ALLOWED2}#' '$ENV_FILE' || echo ALLOWED_ORIGINS=${ALLOWED1},${ALLOWED2} >> '$ENV_FILE'"

# Restart backend if managed by PM2
if command -v pm2 >/dev/null 2>&1; then
  echo "🔄 Restarting PM2 backend..."
  pm2 restart xml-importer-api || true
  pm2 save || true
else
  echo "⚠️ PM2 not found, backend restart skipped"
fi

echo "🎉 Provision completed for ${API_DOMAIN} -> http://127.0.0.1:${API_PORT}"
echo "🌐 Test: https://${API_DOMAIN}/api/status"
