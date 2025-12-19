#!/bin/bash
# ============================================================
# Script para agregar un nuevo cliente SaaS
# ============================================================
# Uso: ./add-new-client.sh cliente_id dominio.com email@cliente.com
# Ejemplo: ./add-new-client.sh acmecorp acmecorp.tudominio.com admin@acmecorp.com
# ============================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar argumentos
if [ "$#" -lt 2 ]; then
    echo -e "${RED}Error: Argumentos insuficientes${NC}"
    echo "Uso: $0 <cliente_id> <dominio> [email]"
    echo "Ejemplo: $0 cliente1 cliente1.tudominio.com admin@cliente1.com"
    exit 1
fi

CLIENTE_ID=$1
DOMINIO=$2
EMAIL=${3:-"admin@$DOMINIO"}
BASE_DIR="/opt/saas-$CLIENTE_ID"
TEMPLATE_DIR="./templates"
NGINX_GATEWAY_DIR="/opt/nginx-gateway"

echo -e "${GREEN}=== Creando nuevo cliente SaaS ===${NC}"
echo "Cliente ID: $CLIENTE_ID"
echo "Dominio: $DOMINIO"
echo "Email: $EMAIL"
echo ""

# Verificar que el template existe
if [ ! -f "$TEMPLATE_DIR/docker-compose-cliente-template.yml" ]; then
    echo -e "${RED}Error: Template no encontrado en $TEMPLATE_DIR${NC}"
    exit 1
fi

# Crear directorio del cliente
echo -e "${YELLOW}1. Creando directorio del cliente...${NC}"
mkdir -p "$BASE_DIR"
cd "$BASE_DIR"

# Copiar código de backend y frontend
echo -e "${YELLOW}2. Copiando código fuente...${NC}"
if [ -d "/opt/tratios-admin/backend" ]; then
    cp -r /opt/tratios-admin/backend ./
    cp -r /opt/tratios-admin/frontend ./
    echo -e "${GREEN}✓ Código copiado${NC}"
else
    echo -e "${RED}Error: Código fuente no encontrado en /opt/tratios-admin${NC}"
    exit 1
fi

# Crear docker-compose.yml desde template
echo -e "${YELLOW}3. Generando docker-compose.yml...${NC}"
sed "s/CLIENTE_ID/$CLIENTE_ID/g" "$TEMPLATE_DIR/docker-compose-cliente-template.yml" > docker-compose.yml
echo -e "${GREEN}✓ docker-compose.yml creado${NC}"

# Crear archivo .env
echo -e "${YELLOW}4. Generando archivo .env...${NC}"
cat > .env << EOF
# Variables de entorno para $CLIENTE_ID
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
DB_NAME=saas_$CLIENTE_ID
DB_USER=user_$CLIENTE_ID
DB_PASSWORD=$(openssl rand -hex 16)

SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)

SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SENDER_EMAIL=$EMAIL
SENDER_NAME=SaaS $CLIENTE_ID

SAAS_API_KEY=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-43)
SUPPORT_API_SECRET=$(openssl rand -hex 16)
SUPPORT_API_DEV_KEY=$(openssl rand -hex 16)

FRONTEND_ORIGINS=https://$DOMINIO

JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7
EOF
echo -e "${GREEN}✓ .env creado con credenciales aleatorias${NC}"

# Crear red Docker
echo -e "${YELLOW}5. Creando red Docker...${NC}"
docker network create saas_${CLIENTE_ID}_network 2>/dev/null || echo "Red ya existe"
echo -e "${GREEN}✓ Red creada${NC}"

# Generar configuración de nginx
echo -e "${YELLOW}6. Generando configuración de Nginx...${NC}"
NGINX_CONF="$NGINX_GATEWAY_DIR/conf.d/$CLIENTE_ID.conf"
sed -e "s/CLIENTE_ID/$CLIENTE_ID/g" -e "s/CLIENTE_ID.tudominio.com/$DOMINIO/g" \
    "$TEMPLATE_DIR/nginx-cliente-template.conf" > "$NGINX_CONF"
echo -e "${GREEN}✓ Configuración de Nginx creada en $NGINX_CONF${NC}"

# Actualizar docker-compose del gateway para incluir la nueva red
echo -e "${YELLOW}7. Actualizando Nginx Gateway...${NC}"
cat >> "$NGINX_GATEWAY_DIR/docker-compose.yml" << EOF

  # Red para $CLIENTE_ID
  saas_${CLIENTE_ID}_network:
    external: true
    name: saas_${CLIENTE_ID}_network
EOF

# Agregar la red al servicio nginx_gateway en networks
echo -e "${YELLOW}   Editando manualmente docker-compose del gateway...${NC}"
echo -e "${YELLOW}   Agregar 'saas_${CLIENTE_ID}_network' en la sección networks del servicio nginx_gateway${NC}"

# Iniciar servicios del cliente
echo -e "${YELLOW}8. Construyendo imágenes Docker...${NC}"
docker-compose build

echo -e "${YELLOW}9. Iniciando servicios...${NC}"
docker-compose up -d

# Esperar a que los servicios estén listos
echo -e "${YELLOW}10. Esperando a que los servicios estén listos...${NC}"
sleep 10

# Obtener certificado SSL
echo -e "${YELLOW}11. Obteniendo certificado SSL...${NC}"
docker exec nginx_gateway certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMINIO" || echo -e "${YELLOW}⚠ Error al obtener certificado. Configurar manualmente.${NC}"

# Recargar nginx
echo -e "${YELLOW}12. Recargando Nginx...${NC}"
docker exec nginx_gateway nginx -s reload

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Cliente $CLIENTE_ID creado exitosamente!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Detalles:"
echo "  - Directorio: $BASE_DIR"
echo "  - Dominio: https://$DOMINIO"
echo "  - Base de datos: saas_$CLIENTE_ID"
echo ""
echo "Siguientes pasos:"
echo "  1. Configurar DNS: Apuntar $DOMINIO a este servidor"
echo "  2. Editar .env en $BASE_DIR con configuración SMTP"
echo "  3. Crear usuario admin:"
echo "     cd $BASE_DIR"
echo "     docker-compose exec backend_$CLIENTE_ID python scripts/create_admin.py"
echo "  4. Verificar: https://$DOMINIO"
echo ""
echo "Comandos útiles:"
echo "  - Ver logs: cd $BASE_DIR && docker-compose logs -f"
echo "  - Reiniciar: cd $BASE_DIR && docker-compose restart"
echo "  - Detener: cd $BASE_DIR && docker-compose down"
echo ""
