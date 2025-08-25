@echo off
echo ========================================
echo Deploy para Hostinger - XML Importer
echo ========================================
echo.

echo Verificando configuracoes...
if not exist "env.production.example" (
    echo ERRO: Arquivo env.production.example nao encontrado!
    echo Crie o arquivo .env.production com sua URL da API
    pause
    exit /b 1
)

echo.
echo ========================================
echo Passo 1: Configuracao da API
echo ========================================
echo.
echo IMPORTANTE: Configure a URL da sua API no arquivo .env.production
echo.
echo Exemplo:
echo VITE_API_URL=https://api.seu-dominio.com/api
echo.
echo Pressione qualquer tecla quando configurar...
pause

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
echo Passo 3: Upload para Hostinger
echo ========================================
echo.
echo Para fazer upload no Hostinger:
echo.
echo 1. Acesse o painel do Hostinger
echo 2. Vá em "Gerenciador de Arquivos"
echo 3. Navegue até public_html/
echo 4. Faça upload de TODOS os arquivos da pasta dist/
echo.
echo IMPORTANTE: 
echo - Mantenha a estrutura de pastas
echo - Não altere os nomes dos arquivos
echo - Faça backup antes de substituir
echo.

echo ========================================
echo Passo 4: Configuracao do Backend
echo ========================================
echo.
echo Para o backend funcionar, você precisa:
echo.
echo Opção A - VPS Hostinger:
echo 1. Contratar VPS no Hostinger
echo 2. Seguir o guia em GUIA-HOSTINGER.md
echo.
echo Opção B - Serviços Externos:
echo 1. Railway.app (gratuito)
echo 2. Render.com (gratuito)
echo 3. Heroku (pago)
echo.

echo ========================================
echo Deploy Preparado!
echo ========================================
echo.
echo Próximos passos:
echo 1. Upload dos arquivos para Hostinger
echo 2. Configurar backend (VPS ou serviço externo)
echo 3. Testar a aplicação
echo.
echo Para continuar desenvolvendo:
echo - Mantenha o ambiente local funcionando
echo - Use npm run dev para desenvolvimento
echo - Use npm run build para produção
echo.
pause
