# Implementación: Flujo de Suscripción vía WhatsApp + Panel de Administración

## Resumen Ejecutivo

Se implementó un cambio completo del modelo de negocio:
- **Antes**: Los usuarios se suscriben directamente en la plataforma
- **Ahora**: Los usuarios contactan por WhatsApp para adquirir un plan, y un administrador gestiona las suscripciones manualmente

---

## 1. Cambios en Base de Datos

### 1.1 Migración: `suscripciones.servicio_id` → `plan_id`

**Archivo**: `backend/migrations/versions/e8f4a2c1d9b3_migrate_suscripcion_to_plan.py`

#### Cambios en la tabla `suscripciones`:
- ❌ Eliminado: `servicio_id` (FK a `servicios`)
- ✅ Agregado: `plan_id` (FK a `planes`)
- ✅ Nuevos campos para gestión administrativa:
  - `periodo`: 'mensual' o 'anual'
  - `precio_pagado`: Precio al momento de la suscripción (histórico)
  - `creado_en`: Timestamp de creación
  - `actualizado_en`: Timestamp de última actualización
  - `creado_por`: ID del admin que creó la suscripción
  - `motivo_cancelacion`: Razón de cancelación (si aplica)
  - `notas`: Notas internas del administrador

#### Nuevos índices:
```sql
idx_suscripcion_plan (plan_id)
idx_suscripcion_empresa_estado (empresa_id, estado)
idx_suscripcion_fecha_fin (fecha_fin)
uk_empresa_plan_activo (empresa_id, plan_id, estado) -- UNIQUE
```

#### Estados de suscripción:
- `activa`: Suscripción vigente
- `inactiva`: Suscripción terminada o reemplazada
- `suspendida`: Suscripción pausada temporalmente
- `cancelada`: Suscripción cancelada permanentemente

---

### 1.2 Actualización del Modelo `Suscripcion`

**Archivo**: `backend/models/suscripcion.py`

```python
class Suscripcion(db.Model):
    # Campos principales
    empresa_id = ForeignKey('empresas.id')
    plan_id = ForeignKey('planes.id')  # ← CAMBIO PRINCIPAL
    fecha_inicio, fecha_fin, estado, forma_pago
    
    # Campos de gestión
    periodo, precio_pagado, creado_en, actualizado_en
    creado_por (FK a usuarios), motivo_cancelacion, notas
    
    # Relaciones
    empresa = relationship('Empresa')
    plan = relationship('Plan')
    creador = relationship('Usuario')
```

---

## 2. API de Administración

### 2.1 Gestión de Empresas

**Archivo**: `backend/routes/admin_empresas.py`

#### Endpoints:

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/admin/empresas` | Listar todas las empresas con suscripción activa | admin |
| GET | `/admin/empresas/:id` | Obtener empresa con historial de suscripciones | admin |
| POST | `/admin/empresas` | Crear nueva empresa (con suscripción opcional) | admin |
| PUT | `/admin/empresas/:id` | Actualizar datos de empresa | admin |
| DELETE | `/admin/empresas/:id` | Desactivar empresa (soft delete) | admin |

#### Ejemplo: Crear empresa con suscripción

**Request**:
```http
POST /admin/empresas
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "nombre": "Acme Corp",
  "nit": "123456789-0",
  "contacto": "ventas@acme.com",
  "plan_id": 1,
  "periodo": "mensual",
  "notas": "Cliente referido por partner X"
}
```

**Response**:
```json
{
  "message": "Empresa creada exitosamente",
  "empresa": {
    "id": 15,
    "nombre": "Acme Corp",
    "nit": "123456789-0",
    "contacto": "ventas@acme.com",
    "estado": true
  }
}
```

---

### 2.2 Gestión de Suscripciones

**Archivo**: `backend/routes/admin_suscripciones.py`

#### Endpoints:

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/admin/suscripciones` | Listar suscripciones (con filtros) | admin |
| POST | `/admin/suscripciones` | Asignar plan a empresa | admin |
| POST | `/admin/suscripciones/:id/renovar` | Renovar suscripción | admin |
| POST | `/admin/suscripciones/:id/cancelar` | Cancelar suscripción | admin |
| POST | `/admin/suscripciones/:id/suspender` | Suspender suscripción | admin |
| POST | `/admin/suscripciones/:id/reactivar` | Reactivar suscripción suspendida | admin |
| GET | `/admin/suscripciones/estadisticas` | Estadísticas globales | admin |

#### Ejemplo: Asignar plan a empresa

**Request**:
```http
POST /admin/suscripciones
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "empresa_id": 15,
  "plan_id": 2,
  "periodo": "anual",
  "forma_pago": "transferencia",
  "notas": "Pago recibido el 2025-10-19. Factura #001234"
}
```

**Response**:
```json
{
  "message": "Suscripción creada exitosamente",
  "suscripcion": {
    "id": 42,
    "empresa_id": 15,
    "plan_id": 2,
    "plan": {
      "id": 2,
      "nombre": "Plan Profesional",
      "precio_mensual": 150000,
      "precio_anual": 1500000
    },
    "fecha_inicio": "2025-10-19T13:22:10",
    "fecha_fin": "2026-10-19T13:22:10",
    "estado": "activa",
    "periodo": "anual",
    "precio_pagado": 1500000,
    "forma_pago": "transferencia",
    "creado_en": "2025-10-19T13:22:10",
    "creado_por": 3,
    "notas": "Pago recibido el 2025-10-19. Factura #001234"
  }
}
```

#### Ejemplo: Renovar suscripción

**Request**:
```http
POST /admin/suscripciones/42/renovar
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "periodo": "mensual",
  "notas": "Renovación: cliente cambió a plan mensual"
}
```

**Response**: Crea una nueva suscripción, marca la anterior como `inactiva`

#### Ejemplo: Cancelar suscripción

**Request**:
```http
POST /admin/suscripciones/42/cancelar
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "motivo": "Cliente solicitó cancelación por reducción de personal",
  "notas": "Conversación del 2025-10-19 con gerente general"
}
```

#### Ejemplo: Estadísticas

**Response**:
```json
{
  "total": 128,
  "activas": 95,
  "suspendidas": 5,
  "canceladas": 18,
  "inactivas": 10,
  "por_plan": [
    { "plan": "Plan Básico", "cantidad": 45 },
    { "plan": "Plan Profesional", "cantidad": 50 },
    { "plan": "Plan Empresarial", "cantidad": 33 }
  ]
}
```

---

## 3. Control de Acceso (RBAC)

### Decorador `@admin_required`

Todos los endpoints administrativos están protegidos:

```python
@admin_required
def crear_empresa():
    # Solo usuarios con rol='admin' pueden acceder
    pass
```

**Flujo**:
1. Extrae JWT del header `Authorization: Bearer {token}`
2. Obtiene `current_user_id` del token
3. Consulta `Usuario.query.get(current_user_id)`
4. Valida que `usuario.rol == 'admin'`
5. Si no es admin: `403 Forbidden`

---

## 4. Integración de WhatsApp (Pendiente)

### Objetivo:
Reemplazar el botón "Suscribirse Ahora" por un enlace que abra WhatsApp con un mensaje pre-llenado.

### Formato del enlace:
```
https://wa.me/573001234567?text=Hola,%20estoy%20interesado%20en%20el%20plan%20[NOMBRE_PLAN]%20que%20cuesta%20$[PRECIO]%20[PERIODO].%20Me%20gustaría%20recibir%20más%20información.
```

### Ejemplo:
```html
<a href="https://wa.me/573001234567?text=Hola,%20estoy%20interesado%20en%20el%20plan%20Profesional%20que%20cuesta%20$150,000%20mensual.%20Me%20gustaría%20recibir%20más%20información."
   target="_blank"
   class="btn-whatsapp">
  <i class="fab fa-whatsapp"></i> Contactar por WhatsApp
</a>
```

### Implementación en Frontend:
- Componente: `landing/landing.component.ts` (planes)
- Método: `generarEnlaceWhatsApp(plan: Plan, periodo: 'mensual' | 'anual')`
- Template: Reemplazar `(click)="suscribirse(plan)"` por `[href]="generarEnlaceWhatsApp(plan, 'mensual')"`

---

## 5. Frontend: Panel de Administración (Pendiente)

### 5.1 Componentes a Crear

```
src/app/pages/admin/
├── admin-empresas/
│   ├── admin-empresas.component.ts
│   ├── admin-empresas.component.html
│   └── admin-empresas.component.css
├── admin-suscripciones/
│   ├── admin-suscripciones.component.ts
│   ├── admin-suscripciones.component.html
│   └── admin-suscripciones.component.css
└── admin-dashboard/
    ├── admin-dashboard.component.ts
    ├── admin-dashboard.component.html
    └── admin-dashboard.component.css
```

### 5.2 Servicios

```typescript
// src/app/services/admin-empresas.service.ts
export class AdminEmpresasService {
  listarEmpresas(): Observable<Empresa[]>
  obtenerEmpresa(id: number): Observable<Empresa>
  crearEmpresa(data: CrearEmpresaDto): Observable<Empresa>
  actualizarEmpresa(id: number, data: ActualizarEmpresaDto): Observable<Empresa>
  eliminarEmpresa(id: number): Observable<void>
}

// src/app/services/admin-suscripciones.service.ts
export class AdminSuscripcionesService {
  listarSuscripciones(filtros?: FiltrosSuscripcion): Observable<Suscripcion[]>
  crearSuscripcion(data: CrearSuscripcionDto): Observable<Suscripcion>
  renovarSuscripcion(id: number, data?: RenovarDto): Observable<Suscripcion>
  cancelarSuscripcion(id: number, motivo: string): Observable<Suscripcion>
  suspenderSuscripcion(id: number, motivo: string): Observable<Suscripcion>
  reactivarSuscripcion(id: number): Observable<Suscripcion>
  obtenerEstadisticas(): Observable<Estadisticas>
}
```

### 5.3 Guards

```typescript
// src/app/guards/admin.guard.ts
export class AdminGuard implements CanActivate {
  canActivate(): boolean {
    const user = this.authSession.getCurrentUser();
    if (!user || user.rol !== 'admin') {
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }
}
```

### 5.4 Rutas

```typescript
// src/app/app.routes.ts
{
  path: 'admin',
  canActivate: [AdminGuard],
  children: [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: AdminDashboardComponent },
    { path: 'empresas', component: AdminEmpresasComponent },
    { path: 'suscripciones', component: AdminSuscripcionesComponent }
  ]
}
```

---

## 6. Flujo de Trabajo Completo

### Caso de Uso: Nuevo Cliente

1. **Usuario visita landing page**
   - Ve los planes disponibles
   - Hace clic en "Contactar por WhatsApp" del plan que le interesa

2. **WhatsApp se abre con mensaje pre-llenado**
   ```
   Hola, estoy interesado en el plan Profesional que cuesta $150,000 mensual. 
   Me gustaría recibir más información.
   ```

3. **Agente de ventas responde**
   - Explica detalles del plan
   - Confirma datos de la empresa (nombre, NIT, contacto)
   - Acuerda forma de pago

4. **Admin crea empresa en el sistema**
   ```http
   POST /admin/empresas
   {
     "nombre": "Acme Corp",
     "nit": "123456789-0",
     "contacto": "ventas@acme.com"
   }
   ```

5. **Admin asigna plan a la empresa**
   ```http
   POST /admin/suscripciones
   {
     "empresa_id": 15,
     "plan_id": 2,
     "periodo": "mensual",
     "forma_pago": "transferencia",
     "notas": "Pago recibido el 2025-10-19"
   }
   ```

6. **Admin crea usuario inicial para la empresa**
   ```http
   POST /auth/register
   {
     "nombre": "Juan Pérez",
     "email": "juan@acme.com",
     "password": "***",
     "empresa_id": 15,
     "rol": "cliente"
   }
   ```

7. **Cliente puede iniciar sesión**
   - Accede con su correo y contraseña
   - Ve funcionalidades según su plan activo

---

## 7. Comandos de Despliegue

### 7.1 Aplicar migración de base de datos

```bash
cd backend

# Revisar la migración antes de aplicar
flask db history
flask db current

# Aplicar la migración
flask db upgrade

# Si necesitas revertir (¡CUIDADO! Puede perder datos)
flask db downgrade
```

### 7.2 Verificar migración

```bash
# Conectarse a MySQL
mysql -u root -p compraventa_saas

# Ver estructura de suscripciones
DESCRIBE suscripciones;

# Ver columnas nuevas
SHOW COLUMNS FROM suscripciones LIKE '%plan%';
SHOW COLUMNS FROM suscripciones LIKE '%creado%';
```

---

## 8. Pruebas

### 8.1 Crear un admin de prueba

```python
# backend/scripts/create_admin.py
from models.usuario import Usuario
from database.db import db
from app import create_app

app = create_app()
with app.app_context():
    admin = Usuario(
        nombre='Admin Test',
        email='admin@orosoft.com',
        rol='admin'
    )
    admin.set_password('Admin123!')
    db.session.add(admin)
    db.session.commit()
    print(f"Admin creado: {admin.email}")
```

Ejecutar:
```bash
cd backend
python scripts/create_admin.py
```

### 8.2 Probar endpoints con curl

#### Login como admin
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@orosoft.com","password":"Admin123!"}'

# Guardar el token devuelto
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."
```

#### Listar empresas
```bash
curl -X GET http://localhost:5000/admin/empresas \
  -H "Authorization: Bearer $TOKEN"
```

#### Crear empresa
```bash
curl -X POST http://localhost:5000/admin/empresas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test Corp",
    "nit": "999999999-9",
    "contacto": "test@test.com"
  }'
```

#### Asignar plan
```bash
curl -X POST http://localhost:5000/admin/suscripciones \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_id": 1,
    "plan_id": 1,
    "periodo": "mensual",
    "forma_pago": "test",
    "notas": "Prueba"
  }'
```

---

## 9. Próximos Pasos

### Pendiente - Backend:
- [ ] Script para crear admin inicial (`create_admin.py`)
- [ ] Tests unitarios para rutas de admin
- [ ] Validación de permisos en endpoints existentes

### Pendiente - Frontend:
- [ ] Componente `admin-empresas` con tabla y formularios
- [ ] Componente `admin-suscripciones` con historial y acciones
- [ ] Componente `admin-dashboard` con estadísticas
- [ ] Servicios Angular para consumir API de admin
- [ ] Guard `AdminGuard` para rutas protegidas
- [ ] Actualizar landing page con enlace de WhatsApp
- [ ] Método `generarEnlaceWhatsApp()` en componente de planes

### Pendiente - Configuración:
- [ ] Agregar número de WhatsApp al `.env`
- [ ] Configurar mensajes personalizados por plan
- [ ] Documentar proceso de onboarding de clientes

---

## 10. Archivos Modificados/Creados

### Creados:
- `backend/migrations/versions/e8f4a2c1d9b3_migrate_suscripcion_to_plan.py`
- `backend/routes/admin_empresas.py`
- `backend/routes/admin_suscripciones.py`

### Modificados:
- `backend/models/suscripcion.py` (cambio de `servicio_id` a `plan_id` + nuevos campos)
- `backend/app.py` (registro de nuevos blueprints)

### Próximos a crear:
- `backend/scripts/create_admin.py`
- `frontend/src/app/pages/admin/**/*`
- `frontend/src/app/services/admin-*.service.ts`
- `frontend/src/app/guards/admin.guard.ts`

---

## 11. Consideraciones de Seguridad

1. **Autenticación**: Todos los endpoints de admin requieren JWT válido
2. **Autorización**: Decorador `@admin_required` valida rol de admin
3. **Auditoría**: Campo `creado_por` registra qué admin creó cada suscripción
4. **Soft Delete**: Empresas no se eliminan físicamente, solo se desactivan
5. **Historial**: Cada renovación crea un nuevo registro (trazabilidad completa)

---

## 12. Notas Técnicas

### Unique Constraint en suscripciones
```sql
UNIQUE KEY uk_empresa_plan_activo (empresa_id, plan_id, estado)
```
Esto permite que una empresa tenga:
- ✅ 1 suscripción activa por plan
- ✅ Múltiples suscripciones inactivas (historial)
- ✅ Múltiples suscripciones canceladas
- ❌ NO puede tener 2 suscripciones activas del mismo plan

### Cálculo de fecha_fin
- **Mensual**: `fecha_inicio + 30 días`
- **Anual**: `fecha_inicio + 365 días`

### Estados válidos
- `activa`: Solo una por empresa/plan
- `inactiva`: Suscripciones pasadas o reemplazadas
- `suspendida`: Pausa temporal (puede reactivarse)
- `cancelada`: Terminación permanente (no puede reactivarse)

---

**Fecha de implementación**: 2025-10-19  
**Versión**: 1.0  
**Autor**: GitHub Copilot
