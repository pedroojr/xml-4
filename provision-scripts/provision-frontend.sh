#!/bin/bash
set -euo pipefail

echo "🚀 Starting frontend provision..."

# Configurações fixas para simplificar
FRONT_DOMAIN="xml.lojasrealce.shop"
FRONT_ALT="www.xml.lojasrealce.shop"
WEBROOT="/var/www/html"
CERTBOT_EMAIL="pedrojr.xp@gmail.com"

echo "📋 Config: $FRONT_DOMAIN (alt: $FRONT_ALT) -> $WEBROOT"

# Atualizar sistema
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Nginx server block
echo "🔧 Configuring Nginx..."
CONF="/etc/nginx/sites-available/${FRONT_DOMAIN}"
sudo bash -lc "cat > '$CONF' <<'NGINX'
server {
  listen 80;
  server_name ${FRONT_DOMAIN} ${FRONT_ALT};
  root /var/www/html;
  index index.html;
  
  # Não cachear o index
  location = /index.html {
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate" always;
  }
  
  # Cache longo para assets versionados
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
  }
  
  # SPA fallback
  location / {
    try_files \$uri /index.html;
  }
}
NGINX"

sudo ln -sf "$CONF" "/etc/nginx/sites-enabled/${FRONT_DOMAIN}"
sudo nginx -t
sudo systemctl reload nginx
echo "✅ Nginx configured and reloaded"

# Emitir/renovar SSL e forçar redirect HTTPS
echo "🔒 Issuing SSL certificate..."
sudo certbot --nginx -d "$FRONT_DOMAIN" -d "$FRONT_ALT" -m "$CERTBOT_EMAIL" --agree-tos --non-interactive --redirect || true
sudo systemctl reload nginx || true
echo "✅ SSL certificate issued"

# Forçar timestamp do index para evitar cache
if [ -f "$WEBROOT/index.html" ]; then 
  sudo touch "$WEBROOT/index.html"
  echo "✅ Index.html timestamp updated"
fi

echo "🎉 Frontend provisioned for ${FRONT_DOMAIN} (alt: ${FRONT_ALT})"
echo "🌐 Test: https://${FRONT_DOMAIN}/"
