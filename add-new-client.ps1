# ============================================================
# Script PowerShell para agregar un nuevo cliente SaaS
# ============================================================
# Uso: .\add-new-client.ps1 -ClienteId "cliente1" -Dominio "cliente1.tudominio.com" -Email "admin@cliente1.com"
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ClienteId,
    
    [Parameter(Mandatory=$true)]
    [string]$Dominio,
    
    [Parameter(Mandatory=$false)]
    [string]$Email = "admin@$Dominio"
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "=== Creando nuevo cliente SaaS ==="
Write-Host "Cliente ID: $ClienteId"
Write-Host "Dominio: $Dominio"
Write-Host "Email: $Email"
Write-Host ""

$BaseDir = "D:\saas-$ClienteId"
$TemplateDir = ".\templates"
$NginxGatewayDir = ".\nginx-gateway"

# Verificar template
if (-not (Test-Path "$TemplateDir\docker-compose-cliente-template.yml")) {
    Write-ColorOutput Red "Error: Template no encontrado en $TemplateDir"
    exit 1
}

# Crear directorio
Write-ColorOutput Yellow "1. Creando directorio del cliente..."
New-Item -ItemType Directory -Force -Path $BaseDir | Out-Null
Set-Location $BaseDir

# Copiar código
Write-ColorOutput Yellow "2. Copiando código fuente..."
if (Test-Path "..\backend") {
    Copy-Item -Path "..\backend" -Destination "." -Recurse -Force
    Copy-Item -Path "..\frontend" -Destination "." -Recurse -Force
    Write-ColorOutput Green "✓ Código copiado"
} else {
    Write-ColorOutput Red "Error: Código fuente no encontrado"
    exit 1
}

# Crear docker-compose.yml
Write-ColorOutput Yellow "3. Generando docker-compose.yml..."
(Get-Content "$TemplateDir\docker-compose-cliente-template.yml") -replace 'CLIENTE_ID', $ClienteId | 
    Set-Content "docker-compose.yml"
Write-ColorOutput Green "✓ docker-compose.yml creado"

# Generar passwords aleatorios
function New-RandomPassword {
    param([int]$Length = 32)
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes) -replace '[^a-zA-Z0-9]', '' | Select-Object -First $Length
}

# Crear .env
Write-ColorOutput Yellow "4. Generando archivo .env..."
$envContent = @"
# Variables de entorno para $ClienteId
MYSQL_ROOT_PASSWORD=$(New-RandomPassword)
DB_NAME=saas_$ClienteId
DB_USER=user_$ClienteId
DB_PASSWORD=$(New-RandomPassword)

SECRET_KEY=$(New-RandomPassword -Length 64)
JWT_SECRET_KEY=$(New-RandomPassword -Length 64)

SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SENDER_EMAIL=$Email
SENDER_NAME=SaaS $ClienteId

SAAS_API_KEY=$(New-RandomPassword -Length 43)
SUPPORT_API_SECRET=$(New-RandomPassword)
SUPPORT_API_DEV_KEY=$(New-RandomPassword)

FRONTEND_ORIGINS=https://$Dominio

JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-ColorOutput Green "✓ .env creado con credenciales aleatorias"

# Crear red Docker
Write-ColorOutput Yellow "5. Creando red Docker..."
docker network create "saas_${ClienteId}_network" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput Green "✓ Red creada"
} else {
    Write-ColorOutput Yellow "⚠ Red ya existe o no se pudo crear"
}

# Generar configuración nginx
Write-ColorOutput Yellow "6. Generando configuración de Nginx..."
$nginxConf = "$NginxGatewayDir\conf.d\$ClienteId.conf"
(Get-Content "$TemplateDir\nginx-cliente-template.conf") -replace 'CLIENTE_ID', $ClienteId -replace 'CLIENTE_ID.tudominio.com', $Dominio |
    Set-Content $nginxConf
Write-ColorOutput Green "✓ Configuración de Nginx creada en $nginxConf"

# Actualizar docker-compose del gateway
Write-ColorOutput Yellow "7. Actualizando Nginx Gateway..."
$gatewayNetworkEntry = @"

  # Red para $ClienteId
  saas_${ClienteId}_network:
    external: true
    name: saas_${ClienteId}_network
"@
Add-Content -Path "$NginxGatewayDir\docker-compose.yml" -Value $gatewayNetworkEntry

# Construir e iniciar
Write-ColorOutput Yellow "8. Construyendo imágenes Docker..."
docker-compose build

Write-ColorOutput Yellow "9. Iniciando servicios..."
docker-compose up -d

Write-ColorOutput Yellow "10. Esperando a que los servicios estén listos..."
Start-Sleep -Seconds 10

# Obtener certificado SSL
Write-ColorOutput Yellow "11. Para obtener certificado SSL, ejecuta:"
Write-Host "docker exec nginx_gateway certbot certonly --webroot --webroot-path=/var/www/certbot --email $Email --agree-tos --no-eff-email -d $Dominio"

# Recargar nginx
Write-ColorOutput Yellow "12. Recargando Nginx..."
docker exec nginx_gateway nginx -s reload

Write-Host ""
Write-ColorOutput Green "========================================"
Write-ColorOutput Green "✓ Cliente $ClienteId creado exitosamente!"
Write-ColorOutput Green "========================================"
Write-Host ""
Write-Host "Detalles:"
Write-Host "  - Directorio: $BaseDir"
Write-Host "  - Dominio: https://$Dominio"
Write-Host "  - Base de datos: saas_$ClienteId"
Write-Host ""
Write-Host "Siguientes pasos:"
Write-Host "  1. Configurar DNS: Apuntar $Dominio a este servidor"
Write-Host "  2. Editar .env en $BaseDir con configuración SMTP"
Write-Host "  3. Crear usuario admin:"
Write-Host "     cd $BaseDir"
Write-Host "     docker-compose exec backend_$ClienteId python scripts/create_admin.py"
Write-Host "  4. Verificar: https://$Dominio"
Write-Host ""
