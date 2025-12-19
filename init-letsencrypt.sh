#!/bin/bash
# Script para obtener certificados SSL de Let's Encrypt en producción

set -e

# Verificar que las variables estén configuradas
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "ERROR: Debes configurar las variables DOMAIN y EMAIL"
    echo "Ejemplo: DOMAIN=tudominio.com EMAIL=tu@email.com ./init-letsencrypt.sh"
    exit 1
fi

echo "=== Inicializando Let's Encrypt para $DOMAIN ==="

# Crear directorios necesarios
mkdir -p ./certbot/www
mkdir -p ./certbot/conf

# Verificar si ya existen certificados
if [ -d "./certbot/conf/live/$DOMAIN" ]; then
    echo "⚠️  Ya existen certificados para $DOMAIN"
    read -p "¿Deseas renovarlos? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operación cancelada"
        exit 0
    fi
fi

# Configurar nginx para validación HTTP
echo "Configurando Nginx para validación HTTP..."
cat > ./nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

# Reiniciar nginx
echo "Reiniciando Nginx..."
docker-compose restart nginx

# Obtener certificados
echo "Solicitando certificados SSL..."
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

if [ $? -eq 0 ]; then
    echo "✓ Certificados obtenidos exitosamente"
    
    # Configurar nginx con SSL
    echo "Configurando Nginx con SSL..."
    cp ./nginx/conf.d/ssl.conf.example ./nginx/conf.d/default.conf
    sed -i "s/tudominio.com/$DOMAIN/g" ./nginx/conf.d/default.conf
    
    # Reiniciar nginx con SSL
    echo "Reiniciando Nginx con SSL..."
    docker-compose restart nginx
    
    echo "✓ Configuración SSL completada"
    echo "Tu sitio ahora está disponible en https://$DOMAIN"
else
    echo "✗ Error al obtener certificados"
    exit 1
fi
