@echo off
echo Configurando Firewall para XML Importer...
echo.

echo Adicionando regra de entrada para porta 3001...
netsh advfirewall firewall add rule name="XML Importer Server" dir=in action=allow protocol=TCP localport=3001

echo Adicionando regra de saída para porta 3001...
netsh advfirewall firewall add rule name="XML Importer Server Out" dir=out action=allow protocol=TCP localport=3001

echo.
echo Firewall configurado com sucesso!
echo.
echo Para verificar as regras criadas:
echo netsh advfirewall firewall show rule name="XML Importer Server"
echo.
pause 