@echo off
echo ========================================
echo Upload para VPS - XML Importer
echo ========================================
echo.
echo VPS: 82.29.58.242
echo Usuario: root
echo.
echo ========================================
echo Passo 1: Preparar arquivos
echo ========================================
echo.

echo Verificando arquivos do servidor...
if not exist "server" (
    echo ERRO: Pasta server nao encontrada!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Passo 2: Upload via SCP
echo ========================================
echo.
echo Para fazer upload via SCP, execute:
echo.
echo scp -r server/* root@82.29.58.242:/var/www/api/
echo.
echo Ou use o File Manager do Hostinger:
echo.
echo 1. Acesse o painel do Hostinger
echo 2. Vá em "File Manager"
echo 3. Navegue até /var/www/api/
echo 4. Upload dos arquivos da pasta server/
echo.
echo ========================================
echo Passo 3: Configurar no VPS
echo ========================================
echo.
echo Apos o upload, execute no VPS:
echo.
echo cd /var/www/api
echo npm install
echo.
echo Criar arquivo .env:
echo nano .env
echo.
echo Conteudo do .env:
echo PORT=3001
echo NODE_ENV=production
echo ALLOWED_ORIGINS=https://lojasrealce.shop,https://www.lojasrealce.shop
echo DB_PATH=/var/www/api/database.sqlite
echo.
echo ========================================
echo Passo 4: Iniciar aplicacao
echo ========================================
echo.
echo npm install -g pm2
echo pm2 start server-production.js --name "xml-importer-api"
echo pm2 startup
echo pm2 save
echo.
echo ========================================
echo Passo 5: Configurar firewall
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
echo URLs de Acesso
echo ========================================
echo.
echo Frontend: https://lojasrealce.shop
echo Backend: https://82.29.58.242:3001
echo API Status: https://82.29.58.242:3001/api/status
echo.
pause
