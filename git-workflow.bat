@echo off
echo ========================================
echo   FLUXO DE TRABALHO GIT - XML IMPORTER
echo ========================================
echo.

:menu
echo Escolha uma opcao:
echo.
echo 1. Ver status atual
echo 2. Adicionar todas as mudancas
echo 3. Fazer commit
echo 4. Ver historico de commits
echo 5. Criar branch de desenvolvimento
echo 6. Trocar para branch principal
echo 7. Sair
echo.
set /p choice="Digite sua escolha (1-7): "

if "%choice%"=="1" goto status
if "%choice%"=="2" goto add
if "%choice%"=="3" goto commit
if "%choice%"=="4" goto log
if "%choice%"=="5" goto branch
if "%choice%"=="6" goto main
if "%choice%"=="7" goto end
goto menu

:status
echo.
echo === STATUS ATUAL ===
git status
echo.
pause
goto menu

:add
echo.
echo === ADICIONANDO MUDANCAS ===
git add .
echo Mudancas adicionadas com sucesso!
echo.
pause
goto menu

:commit
echo.
echo === FAZENDO COMMIT ===
set /p message="Digite a mensagem do commit: "
git commit -m "%message%"
echo Commit realizado com sucesso!
echo.
pause
goto menu

:log
echo.
echo === HISTORICO DE COMMITS ===
git log --oneline -10
echo.
pause
goto menu

:branch
echo.
echo === CRIANDO BRANCH DE DESENVOLVIMENTO ===
set /p branch_name="Digite o nome da branch: "
git checkout -b %branch_name%
echo Branch %branch_name% criada e ativada!
echo.
pause
goto menu

:main
echo.
echo === TROCANDO PARA BRANCH PRINCIPAL ===
git checkout main
echo Trocou para branch principal!
echo.
pause
goto menu

:end
echo.
echo Obrigado por usar o Git Workflow!
pause
