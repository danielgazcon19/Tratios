# 🌐 Guía de Despliegue en VPS Contabo - Arquitectura Multi-Tenant

Guía paso a paso para desplegar Tratios con arquitectura multi-tenant en un servidor VPS de Contabo.

---

## 📋 Prerequisitos

### En Contabo:
- ✅ VPS con Ubuntu 20.04/22.04 o Debian 11/12
- ✅ Mínimo 2GB RAM, 2 vCPU, 40GB disco
- ✅ IP pública asignada
- ✅ Acceso SSH como root

### En tu computadora:
- ✅ Cliente SSH (PuTTY, Windows Terminal, etc.)
- ✅ Dominio registrado (ej: tratios.com)
- ✅ Acceso al panel DNS del dominio

---

## 🏗️ Arquitectura en Producción

```
Internet (Puerto 80/443)
      ↓
https://tratios.com
      ↓
┌─────────────────────┐
│  Nginx Gateway      │ (Puerto 80/443)
│  + Let's Encrypt    │
└─────────────────────┘
      ↓
┌─────────────────────┐
│  Tratios Admin      │
│  - mysql_admin      │ (Red aislada)
│  - backend_admin    │
│  - frontend_admin   │
└─────────────────────┘
```

---

## 📍 PASO 1: Conectarse al Servidor VPS

### 1.1. Obtener credenciales de Contabo

Después de contratar el VPS, recibirás un email con:
- **IP del servidor:** `123.45.67.89`
- **Usuario:** `root`
- **Password:** `contraseña-temporal`

### 1.2. Conectarse vía SSH

**Desde Windows (PowerShell):**
```powershell
ssh root@123.45.67.89
```

**Desde Windows (PuTTY):**
- Host: `123.45.67.89`
- Port: `22`
- Usuario: `root`
- Password: `contraseña-temporal`

### 1.3. Cambiar contraseña de root

```bash
passwd
# Ingresa nueva contraseña segura dos veces
```

---

## 📍 PASO 2: Actualizar Sistema Operativo

```bash
# Actualizar lista de paquetes
apt update

# Actualizar paquetes instalados
apt upgrade -y

# Instalar herramientas básicas
apt install -y curl wget git vim nano htop net-tools
```

---

## 📍 PASO 3: Instalar Docker y Docker Compose

```bash
# Instalar Docker con script oficial
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verificar instalación
docker --version

# Instalar Docker Compose
apt install -y docker-compose

# Verificar instalación
docker-compose --version

# Habilitar Docker al inicio
systemctl enable docker
systemctl start docker

# Verificar que Docker esté corriendo
systemctl status docker
```

**Salida esperada:**
```
Docker version 24.0.x
docker-compose version 1.29.x (o superior)
● docker.service - Docker Application Container Engine
   Active: active (running)
```

---

## 📍 PASO 4: Configurar Firewall (UFW)

```bash
# Instalar UFW si no está instalado
apt install -y ufw

# Permitir SSH (IMPORTANTE: hacer esto primero)
ufw allow 22/tcp

# Permitir HTTP y HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Ver reglas antes de activar
ufw show added

# Activar firewall
ufw enable

# Verificar estado
ufw status verbose
```

**Salida esperada:**
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

---

## 📍 PASO 5: Configurar DNS del Dominio

**ANTES de continuar, configurar DNS en tu proveedor de dominios:**

### Registros DNS necesarios:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | @ | `123.45.67.89` | 3600 |
| A | www | `123.45.67.89` | 3600 |
| A | tratios-admin | `123.45.67.89` | 3600 |

**Ejemplo con GoDaddy, Namecheap, Cloudflare:**
- Ir al panel DNS
- Crear registro A: `@` → `123.45.67.89`
- Crear registro A: `www` → `123.45.67.89`
- Guardar cambios

### Verificar propagación DNS (desde tu PC):

```powershell
# Esperar 5-30 minutos para propagación
ping tratios.com
nslookup tratios.com
```

**Debe resolver a tu IP del VPS: `123.45.67.89`**

---

## 📍 PASO 6: Clonar Proyecto en el Servidor

```bash
# Crear estructura de directorios
mkdir -p /opt
cd /opt

# Clonar repositorio
git clone https://github.com/danielgazcon19/Tratios.git tratios-repo

# Verificar que se clonó correctamente
ls -la tratios-repo/

# Debes ver:
# - docker-compose.yml
# - nginx-gateway/
# - backend/
# - frontend/
# - templates/
```

---

## 📍 PASO 7: Preparar Nginx Gateway

```bash
# Copiar nginx-gateway a /opt
cp -r /opt/tratios-repo/nginx-gateway /opt/

# Navegar al directorio
cd /opt/nginx-gateway

# Crear directorios necesarios
mkdir -p logs conf.d

# Verificar estructura
ls -la
```

---

## 📍 PASO 8: Preparar Tratios Admin

```bash
# Copiar proyecto a directorio de aplicación
cp -r /opt/tratios-repo /opt/tratios-admin

# Navegar al directorio
cd /opt/tratios-admin

# Configurar variables de entorno
cp .env.docker .env
nano .env
```

### Configurar `.env` para PRODUCCIÓN:

```env
# Base de datos - USAR PASSWORDS SEGUROS
MYSQL_ROOT_PASSWORD=<GENERAR_PASSWORD_SEGURO>
DB_NAME=web_compraventa
DB_USER=saas_user_compraventa
DB_PASSWORD=<GENERAR_PASSWORD_SEGURO>

# Seguridad - GENERAR CLAVES ÚNICAS
SECRET_KEY=<GENERAR_CLAVE_ALEATORIA_64_CARACTERES>
JWT_SECRET_KEY=<GENERAR_CLAVE_ALEATORIA_64_CARACTERES>

# SMTP - Configurar con tus credenciales
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
SENDER_EMAIL=tu-email@gmail.com
SENDER_NAME=Tratios Compraventa

# API Keys - GENERAR NUEVA
SAAS_API_KEY=<GENERAR_API_KEY_ALEATORIA>
SUPPORT_API_SECRET=<GENERAR_SECRET_ALEATORIO>
SUPPORT_API_DEV_KEY=<GENERAR_DEV_KEY_ALEATORIO>

# CORS - USAR TU DOMINIO REAL
FRONTEND_ORIGINS=https://tratios.com,https://www.tratios.com

# JWT
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7
```

### Generar passwords seguros:

```bash
# Password MySQL Root (32 caracteres)
openssl rand -hex 16

# Password MySQL User (32 caracteres)
openssl rand -hex 16

# SECRET_KEY (64 caracteres)
openssl rand -hex 32

# JWT_SECRET_KEY (64 caracteres)
openssl rand -hex 32

# SAAS_API_KEY (base64, 43 caracteres)
openssl rand -base64 32 | tr -d '/+=' | cut -c1-43
```

**Copiar estos valores y pegarlos en el archivo `.env`**

**Guardar archivo:**
- Presionar `Ctrl + X`
- Presionar `Y`
- Presionar `Enter`

---

## 📍 PASO 9: Crear Red Docker

```bash
# Crear red aislada para Tratios Admin
docker network create tratios_admin_network

# Verificar
docker network ls | grep tratios_admin
```

---

## 📍 PASO 10: Iniciar Nginx Gateway

```bash
# Navegar al directorio del gateway
cd /opt/nginx-gateway

# Iniciar servicios
docker-compose up -d

# Verificar estado
docker-compose ps

# Ver logs
docker-compose logs -f nginx_gateway
```

**Presionar `Ctrl + C` para salir de los logs.**

**Salida esperada:**
```
NAME            STATE    PORTS
nginx_gateway   Up       0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
certbot_gateway Up
```

---

## 📍 PASO 11: Construir e Iniciar Tratios Admin

```bash
# Navegar al directorio de la aplicación
cd /opt/tratios-admin

# Construir imágenes (toma 10-15 minutos)
docker-compose build

# Ver progreso con más detalle (opcional)
docker-compose build --progress=plain

# Iniciar servicios
docker-compose up -d

# Verificar estado
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f
```

**Esperar ver:**
```
mysql_admin    | MySQL está listo!
backend_admin  | Migraciones aplicadas!
backend_admin  | Gunicorn listening at: http://0.0.0.0:5000
frontend_admin | Nginx started
```

**Presionar `Ctrl + C` para salir de los logs.**

---

## 📍 PASO 12: Verificar HTTP (sin SSL por ahora)

```bash
# Desde el servidor
curl http://localhost/health

# Debe responder: "tratios admin healthy"
```

**Desde tu PC (navegador):**
- Ir a: `http://tratios.com/health`
- Debe mostrar: "tratios admin healthy"

---

## 📍 PASO 13: Configurar SSL con Let's Encrypt

### 13.1. Editar configuración de Nginx para producción

```bash
# Editar archivo de configuración
nano /opt/nginx-gateway/conf.d/tratios-admin.conf
```

**Reemplazar todas las ocurrencias de `tratios.com` con tu dominio real.**

Buscar y reemplazar (en nano):
- Presionar `Ctrl + \`
- Buscar: `tratios.com`
- Reemplazar con: `tu-dominio-real.com`
- Presionar `A` (All)

**Guardar: `Ctrl + X`, `Y`, `Enter`**

### 13.2. Desactivar configuración local

```bash
# Renombrar config local para que no se use
mv /opt/nginx-gateway/conf.d/tratios-admin-local.conf \
   /opt/nginx-gateway/conf.d/tratios-admin-local.conf.disabled
```

### 13.3. Recargar Nginx

```bash
# Verificar sintaxis
docker exec nginx_gateway nginx -t

# Recargar configuración
docker exec nginx_gateway nginx -s reload
```

### 13.4. Obtener certificado SSL

```bash
# Reemplazar con tu dominio y email real
docker exec nginx_gateway certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email tu-email@ejemplo.com \
    --agree-tos \
    --no-eff-email \
    -d tratios.com \
    -d www.tratios.com
```

**Si todo va bien, verás:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/tratios.com/fullchain.pem
```

### 13.5. Recargar Nginx con SSL

```bash
# Recargar configuración
docker exec nginx_gateway nginx -s reload

# Verificar certificados
docker exec nginx_gateway certbot certificates
```

---

## 📍 PASO 14: Crear Usuario Administrador

```bash
cd /opt/tratios-admin

# Ejecutar script de creación
docker-compose exec backend_admin python scripts/create_admin.py
```

**Ingresar:**
- Nombre: `Admin`
- Email: `admin@tratios.com`
- Contraseña: `Password_Seguro_123!`

---

## 📍 PASO 15: Verificar Aplicación en HTTPS

### Desde navegador:

**Frontend:** https://tratios.com

**API:** https://tratios.com/api/

**Health Check:** https://tratios.com/health

### Probar login:
1. Ir a https://tratios.com
2. Login con credenciales creadas
3. Verificar que todo funcione

---

## 🎉 ¡Aplicación en producción!

---

## 🔒 Seguridad Post-Despliegue

### 1. Cambiar puerto SSH (opcional pero recomendado)

```bash
# Editar configuración SSH
nano /etc/ssh/sshd_config

# Cambiar línea:
# Port 22
# Por:
Port 2222

# Guardar y reiniciar SSH
systemctl restart sshd

# Actualizar firewall
ufw allow 2222/tcp
ufw delete allow 22/tcp
```

**Nota:** Usar puerto 2222 en próximas conexiones SSH.

### 2. Configurar fail2ban (protección contra fuerza bruta)

```bash
# Instalar fail2ban
apt install -y fail2ban

# Crear configuración
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22

[nginx-http-auth]
enabled = true
EOF

# Iniciar y habilitar
systemctl enable fail2ban
systemctl start fail2ban

# Verificar estado
fail2ban-client status
```

### 3. Actualizar automáticamente

```bash
# Instalar unattended-upgrades
apt install -y unattended-upgrades

# Configurar actualizaciones de seguridad
dpkg-reconfigure -plow unattended-upgrades
```

---

## 🔄 Actualizar la Aplicación

```bash
# Conectarse al servidor
ssh root@tratios.com

# Navegar al directorio
cd /opt/tratios-admin

# Hacer backup de base de datos
docker-compose exec mysql_admin mysqldump -u root -p web_compraventa > /opt/backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Obtener últimos cambios
cd /opt/tratios-repo
git pull origin main

# Copiar cambios
cp -r backend/ /opt/tratios-admin/
cp -r frontend/ /opt/tratios-admin/

# Reconstruir
cd /opt/tratios-admin
docker-compose build

# Reiniciar
docker-compose down
docker-compose up -d

# Verificar logs
docker-compose logs -f
```

---

## 📊 Monitoreo y Mantenimiento

### Ver estado de servicios

```bash
# Todos los contenedores
docker ps

# Uso de recursos
docker stats

# Logs en tiempo real
cd /opt/tratios-admin
docker-compose logs -f

# Logs de nginx
cd /opt/nginx-gateway
tail -f logs/tratios-admin-access.log
tail -f logs/tratios-admin-error.log
```

### Backups automáticos de base de datos

```bash
# Crear directorio de backups
mkdir -p /opt/backups

# Crear script de backup
cat > /opt/backups/backup-mysql.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
docker exec mysql_admin mysqldump -u root -p'TU_PASSWORD_ROOT' web_compraventa > $BACKUP_DIR/tratios_admin_$DATE.sql
# Mantener solo últimos 7 días
find $BACKUP_DIR -name "tratios_admin_*.sql" -mtime +7 -delete
EOF

# Dar permisos de ejecución
chmod +x /opt/backups/backup-mysql.sh

# Agregar a crontab (backup diario a las 2 AM)
crontab -e
# Agregar línea:
0 2 * * * /opt/backups/backup-mysql.sh
```

### Renovación automática de SSL

Let's Encrypt se renueva automáticamente gracias al contenedor `certbot_gateway`.

Verificar:
```bash
# Ver logs de certbot
docker-compose -f /opt/nginx-gateway/docker-compose.yml logs certbot

# Probar renovación manual (dry-run)
docker exec nginx_gateway certbot renew --dry-run
```

---

## 🐛 Troubleshooting

### Error: No se puede conectar al servidor

**Verificar:**
```bash
# Estado de firewall
ufw status

# Estado de Docker
systemctl status docker

# Estado de contenedores
docker ps -a
```

### Error: Certificado SSL no se genera

**Causas comunes:**
1. DNS no propagado (esperar más tiempo)
2. Puerto 80 bloqueado
3. Dominio mal escrito

**Solución:**
```bash
# Verificar DNS
nslookup tratios.com

# Verificar puerto 80 accesible
curl http://tratios.com/.well-known/acme-challenge/test

# Ver logs de certbot
docker exec certbot_gateway certbot certificates
```

### Error: Base de datos no inicia

```bash
# Ver logs de MySQL
cd /opt/tratios-admin
docker-compose logs mysql_admin

# Verificar espacio en disco
df -h

# Reiniciar MySQL
docker-compose restart mysql_admin
```

---

## ✅ Checklist de Verificación en Producción

- [ ] Servidor VPS configurado y accesible
- [ ] Docker y Docker Compose instalados
- [ ] Firewall configurado (puertos 22, 80, 443)
- [ ] DNS configurado y propagado
- [ ] Red Docker `tratios_admin_network` creada
- [ ] Archivo `.env` con credenciales seguras de producción
- [ ] Nginx Gateway iniciado
- [ ] Tratios Admin construido e iniciado
- [ ] Certificado SSL obtenido y funcionando
- [ ] Acceso HTTPS funciona (https://tratios.com)
- [ ] Usuario admin creado
- [ ] Login exitoso
- [ ] Backups automáticos configurados
- [ ] Monitoreo básico implementado

---

## 📚 Comandos Útiles para el Día a Día

```bash
# Ver estado general
cd /opt/tratios-admin && docker-compose ps

# Reiniciar aplicación
cd /opt/tratios-admin && docker-compose restart

# Ver logs
cd /opt/tratios-admin && docker-compose logs -f backend_admin

# Backup manual de BD
docker exec mysql_admin mysqldump -u root -p web_compraventa > backup.sql

# Acceder a MySQL
docker exec -it mysql_admin mysql -u root -p

# Ver uso de recursos
htop
docker stats

# Ver espacio en disco
df -h

# Limpiar imágenes Docker sin usar
docker system prune -a
```

---

**🎊 ¡Tratios corriendo en producción con SSL en Contabo!**

**Siguiente paso:** Ver `MULTI-TENANT-GUIDE.md` para agregar clientes SaaS adicionales.
