@echo off
echo ========================================
echo Configuracao do VPS - XML Importer
echo ========================================
echo.
echo VPS Detectado:
echo IP: 82.29.58.242
echo SO: Ubuntu 24.04 LTS
echo Status: Em Atividade
echo.
echo ========================================
echo Passo 1: Conectar ao VPS
echo ========================================
echo.
echo Para conectar ao seu VPS, use:
echo ssh root@82.29.58.242
echo.
echo Ou use o "Terminal do navegador" no painel do Hostinger
echo.
echo ========================================
echo Passo 2: Comandos para executar no VPS
echo ========================================
echo.
echo 1. Instalar Node.js:
echo curl -fsSL https://deb.nodesource.com/setup_18.x ^| sudo -E bash -
echo sudo apt-get install -y nodejs
echo.
echo 2. Verificar instalacao:
echo node --version
echo npm --version
echo.
echo 3. Criar diretorio da aplicacao:
echo mkdir -p /var/www/api
echo cd /var/www/api
echo.
echo 4. Fazer upload dos arquivos:
echo - Use o File Manager do Hostinger
echo - Ou use SCP: scp -r server/* root@82.29.58.242:/var/www/api/
echo.
echo 5. Instalar dependencias:
echo npm install
echo.
echo 6. Configurar variaveis de ambiente:
echo nano .env
echo.
echo Conteudo do .env:
echo PORT=3001
echo NODE_ENV=production
echo ALLOWED_ORIGINS=https://lojasrealce.shop,https://www.lojasrealce.shop
echo DB_PATH=/var/www/api/database.sqlite
echo.
echo 7. Instalar PM2:
echo npm install -g pm2
echo.
echo 8. Iniciar aplicacao:
echo pm2 start server-production.js --name "xml-importer-api"
echo.
echo 9. Configurar para iniciar com o sistema:
echo pm2 startup
echo pm2 save
echo.
echo 10. Verificar status:
echo pm2 status
echo.
echo ========================================
echo Passo 3: Configurar Firewall
echo ========================================
echo.
echo No painel do Hostinger:
echo 1. Vá em "Regras de firewall"
echo 2. Adicione regra para porta 3001
echo 3. Protocolo: TCP
echo 4. Porta: 3001
echo 5. Ação: Permitir
echo.
echo ========================================
echo Passo 4: Configurar Frontend
echo ========================================
echo.
echo 1. Criar arquivo .env.production:
echo VITE_API_URL=https://82.29.58.242:3001/api
echo.
echo 2. Build de producao:
echo npm run build
echo.
echo 3. Upload para Hostinger:
echo - Acesse o painel do Hostinger
echo - Vá em "Gerenciador de Arquivos"
echo - Navegue até public_html/
echo - Upload de TODOS os arquivos da pasta dist/
echo.
echo ========================================
echo URLs de Acesso
echo ========================================
echo.
echo Frontend: https://lojasrealce.shop
echo Backend: https://82.29.58.242:3001
echo API Status: https://82.29.58.242:3001/api/status
echo.
echo ========================================
echo Comandos Uteis
echo ========================================
echo.
echo Ver logs: pm2 logs xml-importer-api
echo Reiniciar: pm2 restart xml-importer-api
echo Status: pm2 status
echo.
pause
