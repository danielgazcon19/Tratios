# 🚀 Manual de Deployment LOCAL - Tratios Admin

Guía completa para desplegar Tratios Admin en entorno de desarrollo local con Docker Compose.

---

## ⚡ Inicio Rápido (Quick Start)

```powershell
# 1. Crear red Docker (solo primera vez)
docker network create tratios_admin_network

# 2. Iniciar sistema completo
docker compose up -d

# 3. Seed data inicial (solo primera vez)
docker exec -it backend_admin python seed.py

# 4. Acceder al sistema
# 🌐 http://localhost
# 👤 admin@tratios.com / Admin123!
```

**Tiempo de inicio**: ~2 minutos en primera ejecución.

**📝 Nota**: Esta guía usa `docker compose` (v2), NO `docker-compose` (v1). Docker Compose v2 viene incluido con Docker Desktop moderno.

---

## 📋 Prerequisitos

###Software Requerido
- **Docker Desktop** 4.x o superior
- **Docker Compose** 2.x (incluido en Docker Desktop)
- **Git** para clonar el repositorio
- **PowerShell** (Windows) o **bash** (Linux/Mac)

### Recursos Mínimos del Sistema
- **RAM**: 4 GB mínimo (8 GB recomendado)
- **Disco**: 5 GB libres
- **CPU**: 2 cores mínimo

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    localhost:80/443                         │
│                    (nginx_gateway)                          │
│         Routing inteligente: HTML → Frontend               │
│                             JSON → Backend                  │
└────────────┬────────────────────────┬─────────────────────┘
             │                        │
    ┌────────▼────────┐      ┌────────▼────────┐
    │  Frontend       │      │  Backend        │
    │  Angular 17     │      │  Flask + JWT    │
    │  (port 80)      │      │  Gunicorn       │
    │  SPA routing    │      │  (port 5000)    │
    └─────────────────┘      └────────┬────────┘
                                      │
                             ┌────────▼────────┐
                             │  MySQL 8.0      │
                             │  (port 3306)    │
                             │  Pool de        │
                             │  conexiones     │
                             └─────────────────┘

Red: tratios_admin_network (bridge externa)
```

---

## 📍 PASO 1: Verificar Docker Desktop

```powershell
# Abrir PowerShell como Administrador
# Verificar que Docker esté corriendo
docker --version
docker compose --version

# Ver contenedores activos (debe estar vacío o con contenedores previos)
docker ps

# Si hay contenedores de Tratios viejos, detenerlos:
docker stop $(docker ps -q)
```

---

## 📍 PASO 2: Ubicarte en el Proyecto

```powershell
# Navegar a la raíz del proyecto
cd D:\Software\Pagina

# Verificar que estés en el lugar correcto
Get-ChildItem

# Debes ver:
# - docker compose.yml (el nuevo, sin nginx interno)
# - nginx-gateway/
# - backend/
# - frontend/
# - templates/
```

---

## 📍 PASO 3: Crear Red Docker

```powershell
# Crear red aislada para Tratios Admin
docker network create tratios_admin_network

# Verificar que se creó
docker network ls | Select-String "tratios_admin"
```

**Salida esperada:**
```
tratios_admin_network   bridge    local
```

---

## 📍 PASO 4: Configurar Variables de Entorno

```powershell
# Verificar que existe .env
Test-Path .env

# Si no existe, copiar desde template
if (!(Test-Path .env)) {
    Copy-Item .env.docker .env
}

# Editar el archivo .env
notepad .env
```

**Configuración mínima para LOCAL:**
```env
# Base de datos
MYSQL_ROOT_PASSWORD=rootpass_local
DB_NAME=web_compraventa
DB_USER=saas_user_compraventa
DB_PASSWORD=local_password_123

# Seguridad (para local está bien estos valores)
SECRET_KEY=dev-secret-key-local
JWT_SECRET_KEY=jwt-secret-local

# SMTP (configurar con tus credenciales reales)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=orosoftalert@gmail.com
SMTP_PASSWORD=qnprrjshoacplnvy
SENDER_EMAIL=orosoftalert@gmail.com
SENDER_NAME=Tratios Compraventa

# API Keys
SAAS_API_KEY=jLb99Ao2Tonu4-OQsExK5yVXf3fh-jhzfvU_ZLwOuqo

# CORS para local
FRONTEND_ORIGINS=http://localhost,http://localhost:80,http://127.0.0.1

# JWT
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7
```

**Guardar y cerrar el archivo.**

---

## 📍 PASO 5: Iniciar Nginx Gateway

```powershell
# Navegar al directorio del gateway
cd nginx-gateway

# Verificar archivos
Get-ChildItem

# Debes ver:
# - docker compose.yml
# - nginx.conf
# - conf.d/
#   - tratios-admin-local.conf

# Iniciar el gateway
docker compose up -d

# Verificar que esté corriendo
docker compose ps

# Ver logs (presiona Ctrl+C para salir)
docker compose logs -f nginx_gateway
```

**Salida esperada:**
```
NAME            STATE    PORTS
nginx_gateway   Up       0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
certbot_gateway Up
```

---

## 📍 PASO 6: Construir Imágenes de Tratios Admin

```powershell
# Volver a la raíz del proyecto
cd ..
# Ahora estás en D:\Software\Pagina

# Construir las imágenes (esto toma 5-10 minutos la primera vez)
docker compose build

# Ver progreso detallado (opcional)
docker compose build --progress=plain
```

**Esto construirá:**
- ✅ Backend Flask (Python 3.11 + dependencias)
- ✅ Frontend Angular (Node 20 + compilación)

---

## 📍 PASO 7: Iniciar Tratios Admin

```powershell
# Iniciar todos los servicios en segundo plano
docker compose up -d

# Verificar estado de los contenedores
docker compose ps
```

**Salida esperada:**
```
NAME             STATE    PORTS
mysql_admin      Up       (healthy)
backend_admin    Up       (healthy)
frontend_admin   Up       (healthy)
```

---

## 📍 PASO 8: Verificar Logs y Estado

```powershell
# Ver logs de todos los servicios
docker compose logs -f

# O ver logs de servicios específicos:
docker compose logs -f backend_admin
docker compose logs -f mysql_admin
docker compose logs -f frontend_admin
```

**Espera ver mensajes como:**
```
mysql_admin    | MySQL está listo!
backend_admin  | Migraciones aplicadas!
backend_admin  | [INFO] Gunicorn listening at: http://0.0.0.0:5000
frontend_admin | Nginx started
```

**Presiona Ctrl+C para salir de los logs.**

---

## 📍 PASO 9: Crear Usuario Administrador

```powershell
# Ejecutar el script de creación de admin
docker compose exec backend_admin python scripts/create_admin.py
```

**Interactivo - Ingresa:**
- Nombre: `Admin`
- Email: `admin@tratios.com`
- Contraseña: `Admin123!` (o la que prefieras)

**Salida esperada:**
```
Usuario administrador creado exitosamente
```

---

## 📍 PASO 10: Acceder a la Aplicación

### Abrir navegador y acceder a:

**Frontend:** http://localhost

**Backend API:** http://localhost/api/

**Health Check:** http://localhost/health

### Probar login:
1. Ir a http://localhost
2. Login con:
   - Email: `admin@tratios.com`
   - Password: `Admin123!`

---

## 🎉 ¡Listo! Aplicación corriendo en local

---

## 🔍 Verificaciones Adicionales

### Ver todos los contenedores:
```powershell
docker ps
```

Debes ver 5 contenedores corriendo:
- `nginx_gateway`
- `certbot_gateway`
- `mysql_admin`
- `backend_admin`
- `frontend_admin`

### Ver redes Docker:
```powershell
docker network ls
```

Debes ver:
- `tratios_admin_network`

### Ver volúmenes de datos:
```powershell
docker volume ls | Select-String "admin"
```

Debes ver:
- `mysql_admin_data`
- `backend_admin_uploads`
- `backend_admin_logs`
- `backend_admin_instance`

### Verificar conexión a MySQL:
```powershell
docker compose exec mysql_admin mysql -u root -prootpass_local -e "SHOW DATABASES;"
```

Debes ver la base de datos `web_compraventa`.

---

## 🛑 Detener la Aplicación

```powershell
# Detener Tratios Admin (mantiene datos)
cd D:\Software\Pagina
docker compose down

# Detener Nginx Gateway
cd nginx-gateway
docker compose down
```

---

## 🔄 Reiniciar la Aplicación

```powershell
# Iniciar Gateway
cd D:\Software\Pagina\nginx-gateway
docker compose up -d

# Iniciar Tratios Admin
cd ..
docker compose up -d

# Ver logs
docker compose logs -f
```

---

## 🗑️ Limpiar Todo (Incluye base de datos)

```powershell
# ⚠️ ESTO BORRA LA BASE DE DATOS
cd D:\Software\Pagina
docker compose down -v

cd nginx-gateway
docker compose down -v

# Eliminar red
docker network rm tratios_admin_network

# Limpiar imágenes sin usar
docker system prune -a
```

---

## 🐛 Troubleshooting

### Problema: Puerto 80 ya está en uso

**Síntoma:** Error al iniciar nginx_gateway
```
Error: Bind for 0.0.0.0:80 failed: port is already allocated
```

**Solución:**
```powershell
# Ver qué está usando el puerto 80
netstat -ano | findstr :80

# Detener IIS o Apache si están corriendo
# O cambiar puerto en nginx-gateway/docker compose.yml a 8080:80
```

### Problema: Backend no puede conectarse a MySQL

**Síntoma:** Backend muestra error de conexión a BD

**Solución:**
```powershell
# Verificar que MySQL esté saludable
docker compose exec mysql_admin mysqladmin ping -h localhost -u root -prootpass_local

# Ver logs de MySQL
docker compose logs mysql_admin

# Esperar 30-60 segundos y reintentar
```

### ⚠️ Problema: Error 401 al hacer F5 en páginas admin (RESUELTO)

**Síntoma:** Al refrescar con F5 en `/admin/empresas` o cualquier ruta admin, aparece:
```json
{"msg":"Missing Authorization Header"}
```

**Causa**: Request de navegación HTML (F5) era enviada al backend en lugar del frontend.

**Solución YA IMPLEMENTADA**:
El nginx gateway ahora diferencia correctamente:
- `Accept: text/html` → Envía al **frontend** (navegación)
- `Accept: application/json` → Envía al **backend** (API)

Si persiste el problema:
```powershell
# Verificar configuración de nginx
docker exec nginx_gateway cat /etc/nginx/conf.d/tratios-admin-local.conf | Select-String "text/html"

# Recargar configuración
docker exec nginx_gateway nginx -s reload

# Ver logs de nginx para debug
docker exec nginx_gateway tail -f /var/log/nginx/tratios-admin-local-access.log
```

### Problema: Frontend muestra página en blanco

**Síntoma:** http://localhost carga pero está en blanco

**Solución:**
```powershell
# Verificar logs del frontend
docker compose logs frontend_admin

# Reconstruir frontend
docker compose build frontend_admin
docker compose up -d frontend_admin

# Limpiar cache del navegador (Ctrl+Shift+Del)
```

### Problema: No puedo acceder a http://localhost

**Síntoma:** "No se puede establecer conexión"

**Solución:**
```powershell
# Verificar que nginx_gateway esté corriendo
cd D:\Software\Pagina\nginx-gateway
docker compose ps

# Ver logs de nginx
docker compose logs nginx_gateway

# Verificar configuración de nginx
docker exec nginx_gateway nginx -t

# Reiniciar nginx
docker compose restart nginx_gateway
```

---

## 📊 Comandos Útiles

```powershell
# Ver uso de recursos
docker stats

# Ver solo contenedores de Tratios
docker ps | Select-String "admin"

# Acceder a un contenedor (bash)
docker compose exec backend_admin bash
docker compose exec mysql_admin bash

# Ver variables de entorno de un contenedor
docker compose exec backend_admin env

# Exportar base de datos
docker compose exec mysql_admin mysqldump -u root -prootpass_local web_compraventa > backup_local.sql

# Importar base de datos
Get-Content backup_local.sql | docker compose exec -T mysql_admin mysql -u root -prootpass_local web_compraventa
```

---

## ✅ Checklist de Verificación

Antes de considerar que todo está funcionando:

- [ ] Docker Desktop corriendo
- [ ] Red `tratios_admin_network` creada
- [ ] Archivo `.env` configurado
- [ ] Nginx Gateway iniciado (`nginx_gateway` corriendo)
- [ ] Tratios Admin construido (imágenes creadas)
- [ ] Tratios Admin iniciado (3 contenedores: mysql, backend, frontend)
- [ ] Logs sin errores críticos
- [ ] Usuario admin creado
- [ ] Acceso a http://localhost funciona
- [ ] Login exitoso

---

**🎉 ¡Aplicación corriendo en local con arquitectura multi-tenant!**

**Siguiente paso:** Ver `DEPLOY-CONTABO-VPS.md` para subir a producción.
