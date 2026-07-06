@echo off
cd %~dp0
wix build product.wxs -ext WixToolset.Util.wixext -ext WixToolset.UI.wixext -out Almoxarifado.msi
echo.
echo Instalador criado: Almoxarifado.msi
pause
