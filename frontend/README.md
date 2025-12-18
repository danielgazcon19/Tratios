# Frontend (Angular)

SPA en Angular (Angular CLI 17.x) para la plataforma Tratios. En desarrollo corre en `http://localhost:4200` y consume el backend Flask (por defecto `http://localhost:5222`).

## Requisitos

- Node.js + npm
- Angular CLI (`ng`) disponible en PATH
- Backend corriendo en `http://localhost:5222` (ver `../backend/README.md`)

## Arranque (desarrollo)

### Opción 1: script del repo (Windows)

Desde la raíz del workspace:

- PowerShell: `./start.ps1`
- CMD: `start.bat`

Estos scripts levantan:

- Backend: `python app.py` (puerto `5222`)
- Frontend: `ng serve --proxy-config proxy.conf.json` (puerto `4200`)

### Opción 2: manual

En dos terminales:

1) Backend (en `../backend`): `python app.py`
2) Frontend (en `./frontend`): `npm install` y luego `ng serve --proxy-config proxy.conf.json`

## Proxy y URLs hacia el backend

- `proxy.conf.json` proxya `/api` y `/auth` a `http://127.0.0.1:5222`.
- El proyecto también define `environment.apiUrl` (ver abajo) y varios servicios construyen URLs absolutas con esa base.

Si el backend no permite CORS desde `http://localhost:4200`, la alternativa es depender del proxy (requests relativas). Actualmente, el código mezcla ambos enfoques según el servicio/llamada.

## Configuración (environments)

Archivos:

- `src/environments/environment.ts` (dev)
- `src/environments/environment.prod.ts` (prod; se reemplaza en build)

Campos usados:

- `production`: boolean
- `apiUrl`: URL base del backend (dev: `http://localhost:5222`)
- `whatsappNumber`: número usado por la UI

## Arquitectura del frontend

### Standalone + providers globales

En `src/app/app.config.ts`:

- Router con `withInMemoryScrolling` (restaura scroll arriba y habilita anchors)
- HTTP con `provideHttpClient(withFetch(), withInterceptors([apiInterceptor]))`

### Rutas

Definidas en `src/app/app.routes.ts` (lazy con `loadComponent`).

- Públicas: `''` (landing) con children (`/funcionalidades`, `/planes`, `/acerca`, `/preguntas`)
- Auth: `/login`, `/registro`
- Cuenta: `/cuenta` (protegida por `authGuard`)
- Legales: `/terminos-condiciones`, `/politica-privacidad`, `/acuerdo-servicio`
- Admin: `/admin/*` (protegida por `adminGuard`)
	- `/admin/empresas`, `/admin/suscripciones`, `/admin/planes`, `/admin/servicios`, `/admin/plan-servicios`, `/admin/usuarios`, `/admin/soporte`

### Guards (autorización)

En `src/app/guards/`:

- `auth.guard.ts`: requiere sesión válida; intenta `refresh` si hay `refresh_token`.
- `admin.guard.ts`: además valida `usuario.rol === 'admin'` (si no, redirige a home).

La sesión se almacena en `localStorage` vía `AuthSessionService` (`tratios.auth`).

### Interceptor HTTP

En `src/app/interceptors/api.interceptor.ts`:

- Inyecta `Authorization: Bearer <token>` si hay sesión.
- Detecta expiración por `expires_at` y limpia sesión.
- Maneja 401 / token expirado y redirige a `/login` (muestra alerta si `Swal` está disponible).
- En producción, si la request es relativa (`/api/...`) y hay `environment.apiUrl`, prefija la base URL.

### Servicios

En `src/app/services/`:

- `api.service.ts`: endpoints generales (auth, account, public, suscripciones/planes/servicios, etc.).
- `admin-*.service.ts`: CRUDs del panel admin (empresas, usuarios, planes, servicios, soporte, suscripciones).
- `auth-session.service.ts`: persistencia/validación de sesión (access/refresh, expiración, sincronización post-F5).

## Build

- `ng build` genera artefactos en `dist/frontend` (ver `angular.json`).
- El build de producción reemplaza `environment.ts` por `environment.prod.ts`.

## Tests

- `ng test`

## Troubleshooting

- `ng: The term 'ng' is not recognized`: instalar Angular CLI (`npm i -g @angular/cli`).
- Puertos ocupados: `5222` (backend) / `4200` (frontend).
- 401 y redirección a login: revisar que exista sesión en `localStorage` (`tratios.auth`) y que el backend emita `access_token`/`refresh_token`.
- Problemas de conexión al backend: confirmar `environment.apiUrl` y/o que el proxy esté activo (`--proxy-config proxy.conf.json`).
