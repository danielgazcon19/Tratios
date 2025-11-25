# Script para iniciar Backend y Frontend simultáneamente
# PowerShell (Windows)

Write-Host "Iniciando Tratios - Plataforma SaaS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Función para verificar si un puerto está en uso
function Test-Port {
    param($Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

# Verificar si los puertos están disponibles
if (Test-Port 5222) {
    Write-Host "⚠️  Puerto 5222 ya está en uso (Backend)" -ForegroundColor Yellow
    Write-Host "   Si deseas reiniciar, cierra primero el proceso que usa ese puerto" -ForegroundColor Yellow
    Write-Host ""
}

if (Test-Port 4200) {
    Write-Host "⚠️  Puerto 4200 ya está en uso (Frontend)" -ForegroundColor Yellow
    Write-Host "   Si deseas reiniciar, cierra primero el proceso que usa ese puerto" -ForegroundColor Yellow
    Write-Host ""
}

# Iniciar Backend
Write-Host "🚀 Iniciando Backend (Flask)..." -ForegroundColor Green
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python app.py"
Start-Sleep -Seconds 3

# Iniciar Frontend
Write-Host "🚀 Iniciando Frontend (Angular)..." -ForegroundColor Green
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; ng serve --proxy-config proxy.conf.json"
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✅ Aplicación iniciada correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Accede a la aplicación en:" -ForegroundColor Cyan
Write-Host "   http://localhost:4200" -ForegroundColor White
Write-Host ""
Write-Host "📊 Backend API en:" -ForegroundColor Cyan
Write-Host "   http://localhost:5222" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Siempre accede desde localhost:4200" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona Enter para cerrar esta ventana..." -ForegroundColor Gray
Read-Host
