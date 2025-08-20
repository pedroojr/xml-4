@echo off
echo ========================================
echo Build de Producao - XML Importer
echo ========================================
echo.

echo Limpando build anterior...
if exist dist rmdir /s /q dist

echo Instalando dependencias...
npm install

echo Criando build de producao...
npm run build

echo.
echo ========================================
echo Build concluido com sucesso!
echo ========================================
echo.
echo Arquivos gerados em: dist/
echo.
echo Para fazer upload no Hostinger:
echo 1. Acesse o painel do Hostinger
echo 2. Vá em "Gerenciador de Arquivos"
echo 3. Navegue até public_html/
echo 4. Faça upload de todos os arquivos da pasta dist/
echo.
echo IMPORTANTE: Configure a API no arquivo .env.production
echo com o dominio do seu servidor backend.
echo.
pause
