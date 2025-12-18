# Frontend - Gestión de API Keys (Admin)

## Resumen

Panel de administración Angular para gestionar API keys del sistema. Permite crear, editar, activar/desactivar, renovar y eliminar API keys asociadas a empresas.

## Archivos creados

### 1. Servicio (`services/admin-api-keys.service.ts`)

Gestiona las llamadas HTTP al backend:

```typescript
export interface ApiKey {
  id: number;
  empresa_id: number;
  empresa_nombre?: string;
  nombre: string;
  activo: boolean;
  fecha_creacion: string;
  ultimo_uso?: string;
  fecha_expiracion?: string;
}

// Métodos:
- listarApiKeys(filtros?)
- obtenerApiKey(id)
- crearApiKey(data)
- actualizarApiKey(id, data)
- eliminarApiKey(id)
- toggleApiKey(id)
- renovarApiKey(id, data?)
```

### 2. Componente (`pages/admin/admin-api-keys/`)

#### admin-api-keys.component.ts

Lógica del componente:

**Funcionalidades principales:**
- ✅ Listar API keys con filtros (empresa, estado, búsqueda)
- ✅ Crear nueva API key (muestra clave UNA VEZ con botón copiar)
- ✅ Editar nombre y estado
- ✅ Activar/desactivar
- ✅ Renovar (generar nueva clave)
- ✅ Eliminar
- ✅ Indicadores visuales de expiración
- ✅ Últimos días antes de expirar

**Métodos destacados:**
```typescript
crearApiKey()       // Muestra modal con API key generada
renovarApiKey()     // Genera nueva clave (invalida anterior)
toggleEstado()      // Activar/desactivar
estaExpirada()      // Verifica expiración
getDiasRestantes()  // Calcula días hasta expirar
formatearFecha()    // Formato localizado
```

#### admin-api-keys.component.html

Template con:
- Navegación admin (incluye nuevo enlace "API Keys")
- Filtros por empresa, estado y búsqueda
- Formulario de creación con advertencia
- Tabla con estados visuales (activa/inactiva/expirada)
- Acciones: editar, toggle, renovar, eliminar
- Sección informativa sobre uso de API keys

#### admin-api-keys.component.css

Estilos completos:
- Layout responsivo con grid
- Badges de estado con colores semánticos
- Botones de acción con iconos
- Estados de fila (expirada en rojo)
- Modal de SweetAlert2 personalizado para mostrar clave
- Info box con ejemplos de uso

## Integración

### Rutas (app.routes.ts)

```typescript
{
  path: 'admin',
  canActivate: [adminGuard],
  children: [
    // ...otras rutas
    { 
      path: 'api-keys', 
      loadComponent: () => import('./pages/admin/admin-api-keys/admin-api-keys.component')
        .then(m => m.AdminApiKeysComponent) 
    }
  ]
}
```

### Navegación

Actualizado el menú lateral de todos los componentes admin:

```html
<a routerLink="/admin/api-keys" routerLinkActive="active" class="nav-item">
  <i class="fas fa-key"></i>
  API Keys
</a>
```

Archivos actualizados:
- ✅ admin-empresas.component.html
- ✅ admin-suscripciones.component.html
- ✅ admin-planes.component.html
- ✅ admin-servicios.component.html
- ✅ admin-plan-servicios.component.html
- ✅ admin-usuarios.component.html
- ✅ admin-soporte.component.html

## Flujo de uso

### 1. Crear API key

1. Admin accede a `/admin/api-keys`
2. Click en "Nueva API Key"
3. Selecciona empresa
4. Ingresa nombre descriptivo (ej: "Producción Principal")
5. Opcionalmente configura días de expiración
6. Click en "Generar API Key"
7. **IMPORTANTE:** Modal muestra la clave generada UNA SOLA VEZ
8. Botón "Copiar al portapapeles" para facilitar guardado
9. La clave no se puede recuperar después

**SweetAlert2 personalizado:**
```typescript
Swal.fire({
  title: 'API Key creada exitosamente',
  html: `
    <code>${response.api_key_plana}</code>
    <button id="copyApiKeyBtn">📋 Copiar</button>
  `,
  allowOutsideClick: false,
  allowEscapeKey: false
});
```

### 2. Filtrar API keys

- Por empresa (dropdown)
- Por estado (Todas/Activas/Inactivas)
- Por búsqueda (nombre de key)
- Botón "Aplicar" y "Limpiar filtros"

### 3. Editar API key

- Click en icono de edición
- Permite cambiar: nombre y estado activo/inactivo
- No permite cambiar empresa ni recuperar clave

### 4. Activar/Desactivar

- Toggle rápido con icono (on/off)
- Confirmación con SweetAlert2
- Bloquea acceso inmediatamente

### 5. Renovar API key

- Genera nueva clave
- Invalida la anterior al instante
- Permite especificar nueva fecha de expiración
- Muestra la nueva clave UNA VEZ (mismo modal que creación)

### 6. Eliminar

- Eliminación permanente
- Confirmación con advertencia (no se puede deshacer)
- Afecta inmediatamente a cualquier sistema usando esa key

## Indicadores visuales

### Badges de estado

```typescript
getEstadoClass(apiKey: ApiKey): string {
  if (!apiKey.activo) return 'badge bg-secondary';    // Gris
  if (this.estaExpirada(apiKey)) return 'badge bg-danger';  // Rojo
  const dias = this.getDiasRestantes(apiKey.fecha_expiracion);
  if (dias !== null && dias <= 30) return 'badge bg-warning'; // Amarillo
  return 'badge bg-success';  // Verde
}
```

**Estados:**
- 🟢 **Verde:** Activa y sin expirar pronto
- 🟡 **Amarillo:** Activa pero expira en ≤30 días
- 🔴 **Rojo:** Expirada
- ⚫ **Gris:** Inactiva

### Filas de tabla

- Fila normal: fondo blanco
- Fila expirada: fondo rojo claro (`row-expired`)
- Hover: fondo gris claro

## Información mostrada

Columnas de la tabla:
1. **ID**: Identificador numérico
2. **Empresa**: Nombre + ID
3. **Nombre**: Descripción de la key (con icono 🔑)
4. **Estado**: Badge con color semántico
5. **Creada**: Fecha/hora de creación
6. **Último uso**: Última vez que se usó (o "Nunca")
7. **Expira**: Fecha/hora de expiración + días restantes
8. **Acciones**: Botones de editar/toggle/renovar/eliminar

## Seguridad frontend

### Protección de rutas

Solo accesible por:
- Usuarios autenticados (authGuard)
- Con rol 'admin' (adminGuard)

### Manejo de claves

- ✅ La clave se muestra solo al crearla/renovarla
- ✅ No se almacena en el frontend
- ✅ No se recupera del backend (backend solo tiene hash)
- ✅ Botón de copiar usa `navigator.clipboard` (API segura)

## Ejemplos de uso

### Crear API key desde UI

```typescript
// Usuario rellena form:
empresa_id: 1
nombre: "Producción Principal"
dias_expiracion: 365

// Response del backend:
{
  message: "API Key creada exitosamente",
  api_key: {
    id: 1,
    empresa_id: 1,
    nombre: "Producción Principal",
    activo: true,
    ...
  },
  api_key_plana: "a1b2c3d4e5f6...64chars",
  importante: "Guarde esta API key..."
}

// Modal muestra la clave UNA VEZ
```

### Filtrar por empresa

```typescript
// Usuario selecciona empresa del dropdown
filtroEmpresaId = 1;
aplicarFiltros();

// Llama al servicio:
adminApiKeysService.listarApiKeys({ empresa_id: 1 });

// Backend retorna solo keys de esa empresa
```

### Renovar API key

```typescript
// Usuario click en botón renovar
// Modal pregunta días de expiración
// Usuario ingresa 180 días

renovarApiKey(apiKey: ApiKey) {
  Swal.fire({
    title: 'Renovar API Key',
    input: 'number',
    inputValue: 365,
    preConfirm: (dias) => ({ dias_expiracion: dias })
  }).then((result) => {
    if (result.isConfirmed) {
      this.adminApiKeysService.renovarApiKey(apiKey.id, result.value)
        .subscribe(response => {
          // Muestra nueva clave UNA VEZ
          Swal.fire({
            title: 'API Key renovada',
            html: `<code>${response.api_key_plana}</code>`,
            ...
          });
        });
    }
  });
}
```

## Validaciones

### Frontend
- Empresa y nombre obligatorios al crear
- Días de expiración >= 1 (si se especifica)
- No permite crear sin seleccionar empresa (empresa_id = 0)

### Backend (validado por admin-api-keys.service)
- 401: No autenticado
- 403: No es admin
- 404: Empresa no encontrada
- 400: Campos inválidos

## Mensajes de usuario

### Éxito
- "API Key creada exitosamente"
- "API Key activada/desactivada exitosamente"
- "API Key renovada exitosamente"
- "Eliminada"

### Error
- "Empresa y nombre son obligatorios"
- "No se pudieron cargar las API keys"
- "No se pudo crear/actualizar/eliminar la API key"

### Advertencias
- "⚠️ IMPORTANTE: Guarde esta clave en un lugar seguro. No se podrá recuperar."
- "⚠️ La clave anterior quedó invalidada inmediatamente."
- "⚠️ Esta acción no se puede deshacer."

## Copiar al portapapeles

Implementación con `navigator.clipboard`:

```typescript
copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(response.api_key_plana || '').then(() => {
    Swal.showValidationMessage('✓ Copiado al portapapeles');
    setTimeout(() => {
      Swal.resetValidationMessage();
    }, 2000);
  });
});
```

## Responsive

- Desktop: tabla completa con todas las columnas
- Tablet: scroll horizontal en tabla
- Mobile: grid de filtros en columna única, botones de acción en wrap

## Testing

### Flujo completo

1. Login como admin
2. Ir a `/admin/api-keys`
3. Crear API key para empresa 1
4. Copiar la clave generada
5. Filtrar por empresa 1
6. Editar nombre de la key
7. Desactivar la key
8. Activar nuevamente
9. Renovar la key (genera nueva clave)
10. Copiar nueva clave
11. Eliminar la key

### Casos de prueba

- ✅ Modal muestra clave solo al crear/renovar
- ✅ Botón copiar funciona
- ✅ Filtros actualizan la tabla
- ✅ Toggle cambia estado visualmente
- ✅ Badges reflejan estado real (activa/inactiva/expirada)
- ✅ Dias restantes se calculan correctamente
- ✅ Confirmaciones aparecen antes de acciones destructivas

## Próximas mejoras (opcional)

1. **Paginación:** Si hay muchas keys
2. **Exportar listado:** CSV con info de keys (sin claves planas)
3. **Historial de uso:** Gráfica de requests por key
4. **Logs de acceso:** Ver IPs que usaron cada key
5. **Múltiples keys por empresa:** Permitir más de una key activa
6. **Scopes/permisos:** Keys con acceso limitado a ciertos endpoints
7. **Webhook de notificación:** Avisar cuando una key esté por expirar

## Documentación adicional

Ver también:
- `backend/API_KEYS_SISTEMA.md`: Documentación completa del backend
- `backend/scripts/generar_api_key.py`: Script CLI para generar keys
- `backend/routes/admin_api_keys.py`: Endpoints del backend
