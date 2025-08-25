@echo off
echo Iniciando XML Importer - Frontend e Backend
echo.

echo ========================================
echo Configuracao do Sistema
echo ========================================
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo IP Local: 192.168.31.240
echo Acesso Remoto: http://192.168.31.240:3001
echo ========================================
echo.

echo Iniciando servidor backend...
start "Backend Server" cmd /k "cd server && npm run dev"

echo Aguardando servidor backend inicializar...
timeout /t 5 /nobreak >nul

echo Iniciando frontend...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo Sistema iniciado com sucesso!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo API Status: http://localhost:3001/api/status
echo.
echo Para acessar de outros PCs na rede:
echo http://192.168.31.240:5173 (Frontend)
echo http://192.168.31.240:3001 (Backend)
echo.
echo Pressione qualquer tecla para sair...
pause >nul 