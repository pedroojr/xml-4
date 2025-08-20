@echo off
echo Descobrindo IP da maquina...
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set ip=%%a
    set ip=!ip: =!
    echo IP encontrado: !ip!
    echo.
    echo Para acessar de outros PCs na rede:
    echo http://!ip!:3001
    echo.
    echo Para verificar se o servidor esta rodando:
    echo http://!ip!:3001/api/status
    echo.
    goto :end
)

:end
echo Pressione qualquer tecla para continuar...
pause >nul 