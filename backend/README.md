# Backend (Flask) - Tratios / Compraventa SaaS

Backend REST construido con Flask + SQLAlchemy, pensado para:
- Autenticación con JWT + 2FA (TOTP) y flujos de cuenta.
- Administración (planes/servicios/empresas/usuarios/suscripciones).
- Módulo de soporte (tipos, suscripciones de soporte, pagos y tickets) + API privada para instancias SaaS.
- Servir el build de Angular (SPA) cuando existe `frontend/dist/...`.

Puerto por defecto: `http://localhost:5222`.

---

## Requisitos
- Python `3.8+`
- MySQL `8+`
- (Opcional) Node/Angular para el frontend

---

## Inicio rápido (Windows)

Desde la raíz del repo:
```powershell
./start.ps1
```

Backend solamente:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

---

## Configuración (`.env`)

Hay un ejemplo en `backend/.env.example`. Variables relevantes (no subas secretos al repo):

### Flask / Seguridad
- `SECRET_KEY`: clave del servidor Flask.
- `JWT_SECRET_KEY`: clave para firmar JWT.
- `JWT_ACCESS_MINUTES` (default `30`) y `JWT_REFRESH_DAYS` (default `7`).
- `JWT_HEADER_TYPE` (default `Bearer`).

### Base de datos
El backend prioriza `DATABASE_URL`; si no existe, construye la URL con `DB_*`.
- `DATABASE_URL`: `mysql+pymysql://<user>:<pass>@<host>:<port>/<db>`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

Nota: `backend/app.py` incluye `ensure_database_exists()` para crear la BD si no existe (solo MySQL).

### CORS
- `FRONTEND_ORIGINS`: lista separada por comas (ej: `http://localhost:4200,http://127.0.0.1:4200`).

### API Key (consumo privado desde instancias SaaS)
- `SAAS_API_KEY`: requerido para `/api/*` protegidos por API key y para `/api/internal/support/*`.

### Soporte (secrets internos)
- `SUPPORT_API_SECRET` y `SUPPORT_API_DEV_KEY`: claves internas (si se usan en integraciones/scripts).

### Uploads
- `UPLOAD_FOLDER` (default: `backend/uploads`).
- `MAX_CONTENT_LENGTH` (hardcode: 50MB por request).

### Localización (catálogo países/ciudades)
El proyecto usa un servicio local SQLite (no depende de un API externo en runtime):
- `LOCATION_DB_PATH` (default: `backend/data/countries.db`)
- `LOCATION_CITIES_ARCHIVE_PATH` (default: `backend/data/cities.sqlite3.gz`)
- `LOCATION_CACHE_TTL_COUNTRIES`, `LOCATION_CACHE_TTL_CITIES`
- `LOCATION_RATE_LIMIT_REQUESTS`, `LOCATION_RATE_LIMIT_WINDOW`

### SMTP (códigos por email)
Usado por `utils/otp_email_service.py` para cambio de contraseña sin 2FA:
- `SMTP_SERVER`, `SMTP_PORT`
- `SMTP_USERNAME`, `SMTP_PASSWORD`
- `SENDER_EMAIL`, `SENDER_NAME`

---

## Arquitectura

### App Factory
El entrypoint es `backend/app.py` con `create_app()`:
- Configura SQLAlchemy, Migrate (Alembic), JWT, CORS, uploads.
- Registra blueprints (`/auth`, `/account`, `/public`, `/api`, `/admin` y soporte).
- Si existe el build Angular, sirve la SPA desde `frontend/dist/frontend/browser`.

### Estructura de carpetas (backend)
- `app.py`: create_app, config, registro de blueprints, seed CLI.
- `database/db.py`: instancia `SQLAlchemy()`.
- `models/`: modelos ORM.
- `routes/`: blueprints (auth/account/admin/public/api/soporte).
- `migrations/`: Alembic (Flask-Migrate).
- `utils/`: utilidades (logger, logs por categoría, localización, uploads, validación password, OTP email).
- `uploads/`: adjuntos de tickets (por defecto).
- `templates/emails/`: plantillas HTML de correo (OTP).

---

## Modelos (SQLAlchemy)

### Core
- `Usuario` (`models/usuario.py`):
  - Identidad: `id`, `nombre`, `email` (único), `rol` (`admin|cliente`), `empresa_id`.
  - Estado: `is_active`.
  - 2FA: `otp_secret`, `otp_enabled`, `otp_backup_codes`, `otp_last_verified_at`.
  - Perfil: `telefono`, `direccion`, `ciudad`, `pais`, `fecha_nacimiento`.

- `Empresa` (`models/empresa.py`):
  - `nit` (único), `nombre`, `contacto`, `plan` (string), `estado`.
  - Relaciones: `usuarios`, `suscripciones`.

- `Plan` (`models/plan.py`): `nombre`, `descripcion`, `precio_mensual`, `precio_anual`, `seleccionado`.

- `Servicio` y `PlanServicio` (`models/servicio.py`):
  - `Servicio`: catálogo (`nombre` único, `activo`, `url_api`).
  - `PlanServicio`: tabla puente plan-servicio con campo extra `cantidad` (límite por servicio).

- `Suscripcion` (`models/suscripcion.py`):
  - Enlaza `empresa_id` con `plan_id`, periodo (`mensual|anual`), fechas, estado (`activa|inactiva|suspendida|cancelada`).
  - Gestión: `precio_pagado`, `porcentaje_descuento`, `renovacion_automatica`, `motivo_cancelacion`, `notas`, `creado_por`.

Nota importante (deuda técnica): algunos endpoints (`routes/api.py` y `routes/public.py`) referencian `Suscripcion.servicio_id`/“servicios activos”, pero el modelo actual es plan-based (`plan_id`). Si esos endpoints se usan en producción, conviene revisarlos/actualizarlos para evitar incoherencias.

### Soporte (según reglas de negocio)
- `SoporteTipo` (`models/soporte_tipo.py`): catálogo de soporte (modalidad `mensual|anual|por_tickets|por_horas`, `precio`, límites `max_tickets`/`max_horas`).
- `SoporteSuscripcion` (`models/soporte_suscripcion.py`): vincula soporte con `suscripcion_id` + `empresa_id` + `soporte_tipo_id`.
  - Estado: `activo|vencido|cancelado|pendiente_pago`.
  - Auditoría básica: `precio_actual` (snapshot), `creado_por`, `notas`.
  - Control de cupos: `tickets_consumidos`, `horas_consumidas`.
- `SoportePago` (`models/soporte_pago.py`): pagos asociados a soporte (`exitoso|fallido|pendiente`) con `detalle` JSON.
- `SoporteTicket` y `SoporteTicketComentario` (`models/soporte_ticket.py`):
  - Tickets por empresa con estado `abierto|en_proceso|pendiente_respuesta|cerrado|cancelado`.
  - Comentarios con bandera `es_admin` y adjuntos (JSON).

### Auditoría
- `LogAcceso` (`models/log_acceso.py`): eventos simples (tipo, fecha, empresa_id, ip).

---

## Autenticación y seguridad

### JWT
- Se emiten `access_token` + `refresh_token`.
- Los claims incluyen `rol`, `usuario_id`, `empresa_id`, `otp_enabled`.
- Decoradores:
  - `utils.security.admin_required`: valida rol admin (por claim o DB).

### 2FA (TOTP)
Implementado en `models/usuario.py` + `routes/auth.py`:
- Registro puede iniciar en modo “pendiente de activación” y luego confirmar OTP.
- Login puede responder `202` con `requires_otp` (challenge token) si el usuario tiene 2FA.
- Backup codes soportados.

### Cambio de contraseña
- Admin: `POST /admin/usuarios/:id/cambiar-password`.
- Usuario: `POST /account/password`.
  - Si tiene 2FA: requiere `otp_code`.
  - Si no tiene 2FA: requiere `verification_code` por email (ver `OTPEmailService`).

### Fortaleza de contraseña
Backend valida con `utils/password_validator.py`:
- mínimo 8 caracteres
- mayúscula, minúscula, número y caracter especial

Nota: si el frontend valida con reglas distintas, conviene unificar para evitar “pasa en UI pero falla en API”.

### API Key (instancias SaaS)
- `SAAS_API_KEY` protege endpoints internos:
  - `routes/api.py` (`require_api_key`)
  - `routes/api_soporte.py` (`X-API-Key` + `X-Empresa-Id`)

---

## Logging

Hay dos mecanismos:
- `utils/logger.py` escribe un log general en `backend/logs/app.log`.
- `utils/log/__init__.py` (`AppLogger`) escribe logs por categoría en `backend/utils/log/logs/*.log` (auth, soporte, api, etc.).

---

## Archivos adjuntos (tickets)

Implementado en `utils/file_handler.py` y endpoints de soporte:
- Carpeta por ticket: `uploads/tickets/<ticket_id>/`.
- Límite por archivo: 10 MB.
- Límite total por ticket: 50 MB.
- Extensiones permitidas: imágenes, documentos, comprimidos, logs.

---

## Endpoints (resumen)

### Auth (`/auth`)
- `POST /auth/registro`
- `POST /auth/registro/confirmar-otp`
- `POST /auth/login`
- `POST /auth/login/otp`
- `POST /auth/refresh` (requiere refresh token)
- `POST /auth/otp/setup` (JWT)
- `POST /auth/otp/activate` (JWT)
- `POST /auth/otp/disable` (JWT)

### Cuenta (`/account`) (JWT)
- `GET /account/profile`
- `PUT /account/profile`
- `POST /account/password`
- `POST /account/password/request-code`
- `POST /account/password/verify-code`
- `GET /account/subscriptions`
- `PATCH /account/subscriptions/:id`
- `GET /account/suscripciones`

### Público (`/public`)
- `GET /public/planes`
- `GET /public/servicios?activos=1`
- `GET /public/empresas/:id`
- `POST /public/suscripcion` (ver nota de coherencia con `Suscripcion`)
- `GET /public/location/countries?q=co&limit=20`
- `GET /public/location/countries/:iso2/cities`

### API (`/api`)
- `GET /api/planes`
- `POST /api/verificar-licencia` (JWT)
- `POST /api/verificar-servicios-activos`
- `GET /api/suscripcion-activa/:nit` (API Key: `X-API-Key`)

### Admin (`/admin`) (JWT Admin)

Empresas (`routes/admin_empresas.py`):
- `GET /admin/empresas`
- `GET /admin/empresas/:id`
- `POST /admin/empresas`
- `PUT /admin/empresas/:id`
- `DELETE /admin/empresas/:id` (soft-delete desactiva)
- `POST /admin/empresas/:id/activar`

Usuarios (`routes/admin_usuarios.py`):
- `GET /admin/usuarios` (filtros + paginación)
- `GET /admin/usuarios/:id`
- `POST /admin/usuarios`
- `PUT /admin/usuarios/:id`
- `POST /admin/usuarios/:id/cambiar-password`
- `POST /admin/usuarios/:id/toggle-estado`
- `DELETE /admin/usuarios/:id`

Planes (`routes/admin_planes.py`):
- `GET /admin/planes`
- `POST /admin/planes`
- `PUT /admin/planes/:id`
- `DELETE /admin/planes/:id`

Servicios (`routes/admin_servicios.py`):
- `GET /admin/servicios`
- `POST /admin/servicios`
- `PUT /admin/servicios/:id`
- `POST /admin/servicios/:id/toggle`
- `DELETE /admin/servicios/:id`

Relación Planes-Servicios (`routes/admin_plan_servicios.py`):
- `GET /admin/planes/:plan_id/servicios`
- `POST /admin/planes/:plan_id/servicios` (reemplaza asociaciones; soporta formato legacy)
- `POST /admin/planes/:plan_id/servicios/:servicio_id`
- `PUT /admin/planes/:plan_id/servicios/:servicio_id` (actualiza `cantidad`)
- `DELETE /admin/planes/:plan_id/servicios/:servicio_id`
- `GET /admin/planes-servicios/resumen`

Suscripciones de plan (`routes/admin_suscripciones.py`):
- `GET /admin/suscripciones`
- `POST /admin/suscripciones`
- `POST /admin/suscripciones/:id/renovar`
- `POST /admin/suscripciones/:id/cancelar`
- `POST /admin/suscripciones/:id/suspender`
- `POST /admin/suscripciones/:id/reactivar`
- `POST /admin/suscripciones/:id/descuento`

Soporte (admin):
- Tipos: `routes/admin_soporte_tipos.py` bajo `/admin/soporte-tipos`.
- Suscripciones: `routes/admin_soporte_suscripciones.py` bajo `/admin/soporte-suscripciones`.
- Pagos: `routes/admin_soporte_pagos.py` bajo `/admin/soporte-pagos`.
- Tickets: `routes/admin_soporte_tickets.py` bajo `/admin/soporte-tickets`.
  - Incluye: listar/crear/obtener/patch, comentarios, cerrar/reabrir/cancelar, disponibilidad, estadísticas, upload/download/delete archivo.

### API interna de soporte (`/api/internal/support`) (API Key)

Implementada en `routes/api_soporte.py`.

Headers requeridos:
- `X-API-Key: <SAAS_API_KEY>`
- `X-Empresa-Id: <empresa_id>`

Endpoints:
- `POST /api/internal/support/create_tickets`
- `GET /api/internal/support/tickets`
- `GET /api/internal/support/ticket_id/:ticket_id`
- `POST /api/internal/support/tickets/:ticket_id/comentarios`
- `POST /api/internal/support/tickets/:ticket_id/upload`
- `GET /api/internal/support/tickets/:ticket_id/archivos/:filename`
- `GET /api/internal/support/status`
- `GET /api/internal/support/health`

Ejemplo (crear ticket):
```http
POST /api/internal/support/create_tickets
X-API-Key: <tu_api_key>
X-Empresa-Id: 12
Content-Type: application/json

{
  "titulo": "No puedo generar factura",
  "descripcion": "Error al guardar...",
  "usuario_id": 123,
  "prioridad": "media",
  "metadata": {"origen": "web", "version": "1.2.3"}
}
```

Regla de negocio central (ver `SoporteSuscripcion.puede_crear_ticket()` y `admin_soporte_tickets.calcular_disponibilidad_soporte()`):
- Solo empresas con soporte `activo` y vigente pueden crear tickets.
- En modalidad `por_tickets` se limita el cupo por periodo.
- En modalidad `por_horas` se descuenta tiempo al cerrar el ticket.

---

## Migraciones

El proyecto usa Flask-Migrate (Alembic) con config en `backend/migrations/`.

Comandos típicos (desde `backend/`):
```powershell
python -m flask --app app:create_app db upgrade
python -m flask --app app:create_app db migrate -m "mensaje"
python -m flask --app app:create_app db upgrade
```

Alternativa Alembic directo:
```powershell
python -m alembic --config .\migrations\alembic.ini upgrade head
```

---

## Seed (datos iniciales)

Hay 2 mecanismos:

1) Comando CLI `seed` definido en `backend/app.py` (recomendado, idempotente):
```powershell
python -m flask --app app:create_app seed
```
Opcionales vía `.env`: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEMO_EMPRESA_*`.

2) Script `backend/seed.py` (legacy): hoy no está alineado con los modelos actuales (por ejemplo, usa campos/IDs que no coinciden). Úsalo solo si se actualiza primero.

---

## Troubleshooting

- `SAAS_API_KEY no configurada`: configura `SAAS_API_KEY` en `.env` para endpoints con API key.
- `Aplicación en modo desarrollo`: si no existe el build Angular, el backend devuelve un JSON indicando que se use `http://localhost:4200`.
- Localización: si faltan `countries.db` o `cities.sqlite3.gz`, el servicio cae a un fallback mínimo.
- Inconsistencias modelo/endpoints: si ves errores sobre `servicio_id` en `Suscripcion`, revisa `routes/api.py` y `routes/public.py` (señalado arriba).