@echo off
echo ========================================
echo   AMBIENTE DE DESENVOLVIMENTO
echo ========================================
echo.

echo [1/3] Iniciando servidor backend (porta 4001)...
start "Backend Server" cmd /k "cd ../server && npm start"
echo.

echo [2/3] Aguardando backend inicializar...
timeout /t 5 /nobreak >nul
echo.

echo [3/3] Iniciando frontend (porta 4000)...
start "Frontend Dev" cmd /k "npm run dev:local"
echo.

echo ========================================
echo   AMBIENTE PRONTO!
echo ========================================
echo.
echo Frontend: http://localhost:4000
echo Backend:  http://localhost:4001
echo.
echo Para parar: feche as janelas do CMD
echo.
pause
