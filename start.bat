@echo off
echo ============================================
echo   Tratios - Plataforma SaaS
echo ============================================
echo.

echo [Backend] Iniciando Flask en puerto 5222...
start "Tratios Backend" cmd /k "cd backend && python app.py"
timeout /t 3 /nobreak >nul

echo [Frontend] Iniciando Angular en puerto 4200...
start "Tratios Frontend" cmd /k "cd frontend && ng serve --proxy-config proxy.conf.json"
timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   Aplicacion iniciada correctamente
echo ============================================
echo.
echo   Accede a: http://localhost:4200
echo.
echo   IMPORTANTE: Usa puerto 4200, NO 5222
echo ============================================
echo.
pause
