@echo off
echo ========================================
echo Deploy para Subdominio - XML Importer
echo ========================================
echo.
echo Subdominio: xml.lojasrealce.shop
echo VPS: 82.29.58.242
echo.
echo ========================================
echo Passo 1: Verificar Configuracao
echo ========================================
echo.

echo Verificando arquivo .env.production...
if not exist ".env.production" (
    echo ERRO: Arquivo .env.production nao encontrado!
    echo Criando arquivo...
    echo VITE_API_URL=https://82.29.58.242:3001/api > .env.production
)

echo.
echo ========================================
echo Passo 2: Build de Producao
echo ========================================
echo.

echo Limpando build anterior...
if exist dist rmdir /s /q dist

echo Instalando dependencias...
call npm install

echo Criando build de producao...
call npm run build

if errorlevel 1 (
    echo ERRO: Falha no build!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build concluido com sucesso!
echo ========================================
echo.
echo Arquivos gerados em: dist/
echo.

echo ========================================
echo Passo 3: Upload para Subdominio
echo ========================================
echo.
echo Para fazer upload no Hostinger:
echo.
echo 1. Acesse o painel do Hostinger
echo 2. Vá em "Gerenciador de Arquivos"
echo 3. Navegue até public_html/xml/
echo 4. Faça upload de TODOS os arquivos da pasta dist/
echo.
echo IMPORTANTE: 
echo - Mantenha a estrutura de pastas
echo - Não altere os nomes dos arquivos
echo - Faça backup antes de substituir
echo.

echo ========================================
echo Passo 4: Configurar Backend
echo ========================================
echo.
echo No VPS, execute:
echo.
echo cd /var/www/api
echo nano .env
echo.
echo Atualizar ALLOWED_ORIGINS para:
echo ALLOWED_ORIGINS=https://xml.lojasrealce.shop,https://www.xml.lojasrealce.shop
echo.
echo pm2 restart xml-importer-api
echo.

echo ========================================
echo URLs de Acesso
echo ========================================
echo.
echo Frontend: https://xml.lojasrealce.shop
echo Backend: https://82.29.58.242:3001
echo API Status: https://82.29.58.242:3001/api/status
echo.

echo ========================================
echo Deploy Preparado!
echo ========================================
echo.
echo Próximos passos:
echo 1. Criar subdomínio no Hostinger
echo 2. Upload dos arquivos para xml.lojasrealce.shop
echo 3. Configurar backend no VPS
echo 4. Testar a aplicação
echo.
pause
