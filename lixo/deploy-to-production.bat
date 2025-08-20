@echo off
echo ========================================
echo   DEPLOY PARA PRODUCAO - XML IMPORTER
echo ========================================
echo.

echo [1/4] Parando servidor de desenvolvimento...
taskkill /F /IM node.exe 2>nul
echo.

echo [2/4] Criando build de producao...
call npm run build:prod
if %errorlevel% neq 0 (
    echo ERRO: Falha ao criar build de producao
    pause
    exit /b 1
)
echo.

echo [3/4] Build criado com sucesso em dist/
echo.

echo [4/4] Pronto para deploy!
echo.
echo INSTRUCOES:
echo 1. Faça backup do site atual em xml.lojasrealce.shop
echo 2. Faça upload dos arquivos da pasta dist/ para o servidor
echo 3. Teste todas as funcionalidades
echo 4. Se houver problemas, restaure o backup
echo.
echo PASTA COM BUILD: %cd%\dist\
echo.

pause
