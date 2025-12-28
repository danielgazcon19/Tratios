# Instrucciones para Generar Configuración SaaS Multi-Empresa con AI

Estas instrucciones están diseñadas para que un agente de AI pueda generar automáticamente la configuración necesaria para desplegar un entorno SaaS multi-empresa usando Docker y Nginx, basado en el template `nginx-cliente-template.conf`.

---

## 1. Estructura Esperada

- Un solo Nginx central (reverse proxy) que enruta peticiones a los contenedores de cada empresa según el subdominio.
- Cada empresa tiene su propio backend y frontend en contenedores separados.
- Los archivos de configuración de Nginx para cada empresa se generan a partir de un template.

---

## 2. Pasos para el Agente AI

### a) Generar Servicios en docker-compose.yml

Por cada nueva empresa:
- Agregar un servicio de backend y uno de frontend con nombres únicos (ej: `empresaX-backend`, `empresaX-frontend`).
- Definir variables de entorno y puertos según corresponda.
- Asegurarse de que ambos servicios estén conectados a la red del Nginx central.

### b) Generar Configuración Nginx

Por cada empresa:
- Crear un archivo en `nginx/conf.d/` llamado `empresaX.conf`.
- Usar el template `templates/nginx-cliente-template.conf` y reemplazar:
  - `server_name` por el subdominio de la empresa (ej: `empresaX.tudominio.com`).
  - Los nombres de los servicios de backend/frontend en las directivas `proxy_pass`.

Ejemplo de reemplazo:

```
server {
    listen 80;
    server_name EMPRESA_SUBDOMINIO;

    location / {
        proxy_pass http://EMPRESA_FRONTEND:4200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://EMPRESA_BACKEND:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Donde:
- `EMPRESA_SUBDOMINIO` → subdominio de la empresa
- `EMPRESA_FRONTEND` → nombre del servicio frontend
- `EMPRESA_BACKEND` → nombre del servicio backend

### c) Certificados SSL (Opcional)

- Si se requiere HTTPS, el agente debe agregar bloques `server` para el puerto 443 y montar los certificados correspondientes.

### d) Reinicio de Nginx

- El agente debe reiniciar el servicio Nginx tras agregar o modificar configuraciones.

---

## 3. Resumen de Variables a Reemplazar

- Nombre de la empresa (para servicios y archivos)
- Subdominio de la empresa
- Puertos de backend/frontend si difieren del estándar

---

## 4. Ejemplo de Solicitud para el Agente

"Genera la configuración para una nueva empresa llamada `empresa2` con subdominio `empresa2.tudominio.com`, usando el template de Nginx y actualizando el docker-compose.yml."

---

Estas instrucciones permiten automatizar la generación y despliegue de nuevas instancias SaaS multi-empresa de forma segura y escalable.