#!/bin/bash
set -euo pipefail

echo "🚀 Starting development environment provision..."

# Configurações para desenvolvimento
DEV_FRONT_DOMAIN="dev.xml.lojasrealce.shop"
DEV_API_DOMAIN="dev-api.xml.lojasrealce.shop"
DEV_FRONT_WEBROOT="/var/www/dev"
DEV_API_PORT="3002"
CERTBOT_EMAIL="pedrojr.xp@gmail.com"

echo "📋 Dev Config: $DEV_FRONT_DOMAIN -> $DEV_FRONT_WEBROOT"
echo "📋 Dev API Config: $DEV_API_DOMAIN -> Port $DEV_API_PORT"

# Criar diretórios
sudo mkdir -p "$DEV_FRONT_WEBROOT"
sudo chown -R www-data:www-data "$DEV_FRONT_WEBROOT"

# Configurar Nginx para frontend dev
echo "🔧 Configuring Nginx for dev frontend..."
DEV_FRONT_CONF="/etc/nginx/sites-available/${DEV_FRONT_DOMAIN}"
sudo bash -lc "cat > '$DEV_FRONT_CONF' <<'NGINX'
server {
  listen 80;
  server_name ${DEV_FRONT_DOMAIN};
  root ${DEV_FRONT_WEBROOT};
  index index.html;
  
  # Não cachear em desenvolvimento
  location = /index.html {
    add_header Cache-Control \"no-store, no-cache, must-revalidate\" always;
  }
  
  # SPA fallback
  location / {
    try_files \$uri /index.html;
  }
}
NGINX"

sudo ln -sf "$DEV_FRONT_CONF" "/etc/nginx/sites-enabled/${DEV_FRONT_DOMAIN}"

# Configurar Nginx para API dev
echo "🔧 Configuring Nginx for dev API..."
DEV_API_CONF="/etc/nginx/sites-available/${DEV_API_DOMAIN}"
sudo bash -lc "cat > '$DEV_API_CONF' <<'NGINX'
server {
  listen 80;
  server_name ${DEV_API_DOMAIN};
  
  location / {
    proxy_pass http://127.0.0.1:${DEV_API_PORT};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
  }
}
NGINX"

sudo ln -sf "$DEV_API_CONF" "/etc/nginx/sites-enabled/${DEV_API_DOMAIN}"

# Testar e recarregar Nginx
sudo nginx -t
sudo systemctl reload nginx
echo "✅ Nginx configured for dev environment"

# Configurar PM2 para backend dev
echo "🔧 Setting up PM2 for dev backend..."
cd /root
if [ ! -d "xml-4-dev" ]; then
  git clone https://github.com/pedroojr/xml-4.git xml-4-dev
fi

cd xml-4-dev
git checkout develop 2>/dev/null || git checkout -b develop

# Criar arquivo de configuração para dev
cat > ecosystem-dev.config.js << 'JS'
module.exports = {
  apps: [{
    name: 'xml-importer-api-dev',
    script: 'server/server-production.js',
    cwd: '/root/xml-4-dev',
    env: {
      NODE_ENV: 'development',
      PORT: 3002,
      ALLOWED_ORIGINS: 'https://dev.xml.lojasrealce.shop'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
JS

# Instalar dependências do backend
cd server
npm install
cd ..

# Iniciar com PM2
pm2 start ecosystem-dev.config.js
pm2 save

echo "🎉 Development environment provisioned!"
echo "🌐 Dev Frontend: http://${DEV_FRONT_DOMAIN}/ (HTTP - SSL pendente DNS)"
echo "🔌 Dev API: http://${DEV_API_DOMAIN}/ (HTTP - SSL pendente DNS)"
echo "📁 Dev Frontend Dir: ${DEV_FRONT_WEBROOT}"
echo "🔧 Dev Backend Port: ${DEV_API_PORT}"
echo ""
echo "⚠️ IMPORTANTE: Configure DNS para os domínios dev antes de usar SSL:"
echo "   - dev.xml.lojasrealce.shop -> 82.29.58.242"
echo "   - dev-api.xml.lojasrealce.shop -> 82.29.58.242"
