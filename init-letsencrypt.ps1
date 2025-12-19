# Script PowerShell para obtener certificados SSL de Let's Encrypt en Windows

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$true)]
    [string]$Email
)

Write-Host "=== Inicializando Let's Encrypt para $Domain ===" -ForegroundColor Green

# Crear directorios necesarios
New-Item -ItemType Directory -Force -Path ".\certbot\www" | Out-Null
New-Item -ItemType Directory -Force -Path ".\certbot\conf" | Out-Null

# Verificar si ya existen certificados
if (Test-Path ".\certbot\conf\live\$Domain") {
    Write-Host "Ya existen certificados para $Domain" -ForegroundColor Yellow
    $response = Read-Host "¿Deseas renovarlos? (y/n)"
    if ($response -ne "y") {
        Write-Host "Operación cancelada" -ForegroundColor Red
        exit 0
    }
}

# Configurar nginx para validación HTTP
Write-Host "Configurando Nginx para validación HTTP..." -ForegroundColor Cyan
$nginxConfig = @"
server {
    listen 80;
    server_name $Domain www.$Domain;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://`$server_name`$request_uri;
    }
}
"@

$nginxConfig | Out-File -FilePath ".\nginx\conf.d\default.conf" -Encoding UTF8

# Reiniciar nginx
Write-Host "Reiniciando Nginx..." -ForegroundColor Cyan
docker-compose restart nginx

# Obtener certificados
Write-Host "Solicitando certificados SSL..." -ForegroundColor Cyan
docker-compose run --rm certbot certonly `
    --webroot `
    --webroot-path=/var/www/certbot `
    --email $Email `
    --agree-tos `
    --no-eff-email `
    -d $Domain `
    -d www.$Domain

if ($LASTEXITCODE -eq 0) {
    Write-Host "Certificados obtenidos exitosamente" -ForegroundColor Green
    
    # Configurar nginx con SSL
    Write-Host "Configurando Nginx con SSL..." -ForegroundColor Cyan
    Copy-Item ".\nginx\conf.d\ssl.conf.example" ".\nginx\conf.d\default.conf" -Force
    (Get-Content ".\nginx\conf.d\default.conf") -replace 'tratios.com', $Domain | Set-Content ".\nginx\conf.d\default.conf"
    
    # Reiniciar nginx con SSL
    Write-Host "Reiniciando Nginx con SSL..." -ForegroundColor Cyan
    docker-compose restart nginx
    
    Write-Host "Configuración SSL completada" -ForegroundColor Green
    Write-Host "Tu sitio ahora está disponible en https://$Domain" -ForegroundColor Green
} else {
    Write-Host "Error al obtener certificados" -ForegroundColor Red
    exit 1
}
