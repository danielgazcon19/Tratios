# Sistema de API Keys con Encriptación - Resumen Completo

## ✅ Implementación Finalizada

Sistema completo de gestión de API keys con encriptación en base de datos, reemplazando variables de entorno por un sistema robusto y escalable.

---

## 🎯 Objetivos Cumplidos

1. ✅ **Eliminar dependencia de variables de entorno** (SAAS_API_KEY deprecado)
2. ✅ **Almacenamiento seguro en BD** (bcrypt hash, nunca texto plano)
3. ✅ **Asociación por empresa** (cada empresa tiene sus propias keys)
4. ✅ **Control de expiración** (opcional, con alertas visuales)
5. ✅ **Auditoría de uso** (campo `ultimo_uso` actualizado en cada request)
6. ✅ **CRUD completo desde admin panel** (frontend Angular)
7. ✅ **Rotación de claves** (renovar genera nueva key e invalida anterior)

---

## 📦 Componentes del Sistema

### Backend

#### 1. Modelo de Datos
**Archivo:** `backend/models/api_key.py`

```python
class ApiKey:
    id: int
    empresa_id: int (FK → empresas)
    api_key_hash: str (bcrypt, 255 chars)
    nombre: str
    activo: bool
    fecha_creacion: datetime
    ultimo_uso: datetime
    fecha_expiracion: datetime
```

**Métodos:**
- `esta_expirada()`: Verifica si pasó la fecha
- `es_valida()`: Activa + no expirada
- `to_dict()`: Serialización (opción para incluir hash)

#### 2. Utilidades de Encriptación
**Archivo:** `backend/utils/api_key_crypto.py`

```python
generar_api_key() → str  # 64 chars hex (256 bits)
hashear_api_key(key) → str  # bcrypt rounds=12
verificar_api_key(key, hash) → bool  # bcrypt.checkpw
generar_api_key_con_hash() → (str, str)  # todo en uno
```

#### 3. Migración Alembic
**Archivo:** `backend/migrations/versions/0c3391f4e75a_add_api_keys_table.py`

```sql
CREATE TABLE api_keys (
  id INT PRIMARY KEY AUTO_INCREMENT,
  empresa_id INT NOT NULL,
  api_key_hash VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  ultimo_uso DATETIME,
  fecha_expiracion DATETIME,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- Índices:
CREATE INDEX ix_api_keys_empresa_id ON api_keys(empresa_id);
CREATE INDEX ix_api_keys_activo ON api_keys(activo);
CREATE INDEX ix_api_keys_hash ON api_keys(api_key_hash);
```

**Aplicada:** ✅ `flask db upgrade`

#### 4. Decoradores de Validación

**Archivo:** `backend/routes/api.py`
```python
@require_api_key
def obtener_suscripcion_activa(nit):
    # Valida X-API-Key y X-Empresa-Id
    # Busca en BD, verifica hash, actualiza ultimo_uso
    pass
```

**Archivo:** `backend/routes/api_soporte.py`
```python
@validar_api_key
def crear_ticket():
    # Misma lógica, para endpoints de soporte
    pass
```

**Headers requeridos:**
```http
X-API-Key: a1b2c3d4e5f6... (64 chars)
X-Empresa-Id: 1
```

**Validaciones:**
1. Headers presentes y formato correcto
2. Empresa existe
3. API key activa para esa empresa
4. Hash coincide (bcrypt.checkpw)
5. No expirada
6. Actualiza `ultimo_uso` en BD

#### 5. Endpoints de Administración
**Archivo:** `backend/routes/admin_api_keys.py`
**Ruta base:** `/admin/api-keys`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/admin/api-keys` | Listar (filtros: empresa_id, activo, search) |
| GET | `/admin/api-keys/{id}` | Obtener detalles |
| POST | `/admin/api-keys` | Crear (retorna clave UNA VEZ) |
| PUT | `/admin/api-keys/{id}` | Actualizar nombre/estado |
| DELETE | `/admin/api-keys/{id}` | Eliminar |
| POST | `/admin/api-keys/{id}/toggle` | Activar/desactivar |
| POST | `/admin/api-keys/{id}/renovar` | Rotar (genera nueva, invalida anterior) |

**Protección:** Solo usuarios con `rol='admin'`

#### 6. Script CLI
**Archivo:** `backend/scripts/generar_api_key.py`

```bash
python scripts/generar_api_key.py <empresa_id> <nombre> [dias_expiracion]

# Ejemplos:
python scripts/generar_api_key.py 1 "Producción Principal"
python scripts/generar_api_key.py 2 "Desarrollo" 365
```

Salida incluye:
- API key en texto plano (guardar en lugar seguro)
- ID de registro en BD
- Fecha de creación y expiración
- Ejemplo de uso con curl

#### 7. Documentación
**Archivo:** `backend/API_KEYS_SISTEMA.md`

Incluye:
- Arquitectura completa
- Flujo de validación
- Endpoints con ejemplos curl
- Seguridad y mejores prácticas
- Migración desde variables de entorno
- Testing

---

### Frontend (Angular)

#### 1. Servicio
**Archivo:** `frontend/src/app/services/admin-api-keys.service.ts`

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

// Métodos HTTP:
listarApiKeys(filtros?)
obtenerApiKey(id)
crearApiKey(data)
actualizarApiKey(id, data)
eliminarApiKey(id)
toggleApiKey(id)
renovarApiKey(id, data?)
```

#### 2. Componente
**Archivos:** `frontend/src/app/pages/admin/admin-api-keys/`

**admin-api-keys.component.ts:**
- Lógica de CRUD completo
- Filtros (empresa, estado, búsqueda)
- Modales de SweetAlert2 para mostrar claves
- Botón copiar al portapapeles
- Indicadores visuales de estado/expiración

**admin-api-keys.component.html:**
- Navegación admin (con nuevo enlace "API Keys")
- Filtros interactivos
- Tabla con badges de estado
- Acciones: editar/toggle/renovar/eliminar
- Sección informativa sobre uso

**admin-api-keys.component.css:**
- Estilos completos y responsivos
- Badges de color semántico
- Estados de fila (expirada en rojo)
- Botones de acción con iconos

#### 3. Rutas
**Archivo:** `frontend/src/app/app.routes.ts`

```typescript
{
  path: 'admin',
  canActivate: [adminGuard],
  children: [
    { path: 'api-keys', loadComponent: ... }
  ]
}
```

**URL:** `http://localhost:4200/admin/api-keys`

#### 4. Navegación
Actualizado en todos los componentes admin:
- admin-empresas
- admin-suscripciones
- admin-planes
- admin-servicios
- admin-plan-servicios
- admin-usuarios
- admin-soporte

```html
<a routerLink="/admin/api-keys" routerLinkActive="active">
  <i class="fas fa-key"></i> API Keys
</a>
```

#### 5. Documentación
**Archivo:** `frontend/FRONTEND_API_KEYS.md`

Incluye:
- Flujos de uso detallados
- Indicadores visuales (badges)
- Seguridad frontend
- Ejemplos de código
- Testing

---

## 🔐 Seguridad Implementada

### Backend
- ✅ **Bcrypt hashing:** rounds=12, nunca se almacena texto plano
- ✅ **API keys de 256 bits:** 64 caracteres hexadecimales
- ✅ **Validación de expiración:** automática en cada request
- ✅ **Auditoría:** campo `ultimo_uso` + logs en `LogCategory.API`
- ✅ **Headers explícitos:** `X-API-Key` + `X-Empresa-Id`
- ✅ **FK con CASCADE:** eliminar empresa elimina sus keys
- ✅ **Índices únicos:** `api_key_hash` único

### Frontend
- ✅ **Protección de rutas:** `authGuard` + `adminGuard`
- ✅ **Clave mostrada UNA VEZ:** al crear/renovar
- ✅ **No se almacena en frontend:** solo se muestra en modal
- ✅ **Copiar seguro:** `navigator.clipboard` API
- ✅ **Confirmaciones:** antes de acciones destructivas

---

## 📊 Flujo Completo de Uso

### Crear API Key (Admin)

1. Login como admin → `/admin/api-keys`
2. Click "Nueva API Key"
3. Seleccionar empresa
4. Ingresar nombre: "Producción Principal"
5. Días de expiración: 365
6. Click "Generar API Key"
7. **Modal muestra clave UNA VEZ:**
   ```
   a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
   ```
8. Click "Copiar al portapapeles"
9. Guardar en gestor de secretos (AWS Secrets, .env, etc.)

### Usar API Key (Instancia SaaS)

```bash
# Endpoint de suscripción activa
curl -X GET "http://localhost:5222/api/suscripcion-activa/80030148752-vxT21.Ad" \
  -H "X-API-Key: a1b2c3d4e5f6..." \
  -H "X-Empresa-Id: 1"

# Endpoint de soporte (crear ticket)
curl -X POST "http://localhost:5222/api/internal/support/create_tickets" \
  -H "X-API-Key: a1b2c3d4e5f6..." \
  -H "X-Empresa-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "soporte_suscripcion_id": 4,
    "titulo": "Error al generar factura",
    "descripcion": "...",
    "prioridad": "alta"
  }'
```

### Renovar API Key

1. Admin accede a `/admin/api-keys`
2. Click en icono "Renovar" (🔄)
3. Modal pregunta días de expiración
4. Confirma
5. Backend genera nueva clave y invalida la anterior
6. **Modal muestra nueva clave UNA VEZ**
7. Copiar y actualizar en instancias SaaS

---

## 🎨 Indicadores Visuales

### Badges de Estado

| Estado | Color | Condición |
|--------|-------|-----------|
| 🟢 Activa | Verde | `activo=true` + no expirada + >30 días |
| 🟡 Expira pronto | Amarillo | `activo=true` + ≤30 días restantes |
| 🔴 Expirada | Rojo | Fecha expiración < hoy |
| ⚫ Inactiva | Gris | `activo=false` |

### Filas de Tabla
- Normal: fondo blanco
- Expirada: fondo rojo claro (`row-expired`)
- Hover: fondo gris claro

---

## 📝 Endpoints Protegidos

### Antes (variable de entorno)
```python
# .env
SAAS_API_KEY=una-clave-global-para-todos

# Código
if api_key != os.getenv('SAAS_API_KEY'):
    return 401
```

### Ahora (base de datos)
```python
# BD: tabla api_keys con empresa_id
# Cada empresa tiene sus propias keys

api_keys = ApiKey.query.filter_by(
    empresa_id=empresa_id,
    activo=True
).all()

for key_record in api_keys:
    if verificar_api_key(api_key, key_record.api_key_hash):
        # ✅ Válida
        key_record.ultimo_uso = datetime.utcnow()
        db.session.commit()
        return True
```

---

## 🚀 Despliegue

### Backend

1. **Instalar dependencia:**
   ```bash
   pip install bcrypt==4.1.2
   ```

2. **Aplicar migración:**
   ```bash
   flask db upgrade
   ```

3. **Generar primera API key:**
   ```bash
   python scripts/generar_api_key.py 1 "Producción" 365
   ```

4. **Reiniciar backend:**
   ```bash
   python app.py
   ```

### Frontend

1. **Navegar a admin:**
   ```
   http://localhost:4200/admin/api-keys
   ```

2. **Crear keys desde UI** (más amigable que CLI)

---

## 📚 Documentación Completa

- **Backend:** `backend/API_KEYS_SISTEMA.md`
- **Frontend:** `frontend/FRONTEND_API_KEYS.md`
- **README Backend:** `backend/README.md` (pendiente actualizar)
- **README Frontend:** `frontend/README.md`

---

## ✨ Características Destacadas

1. **Seguridad máxima:** bcrypt + 256 bits + nunca texto plano
2. **UX optimizada:** modal con botón copiar, badges visuales
3. **Auditoría completa:** logs + último_uso + expiración
4. **Escalable:** cada empresa tiene sus keys
5. **Rotación simple:** renovar invalida anterior al instante
6. **Sin secretos en .env:** todo en BD encriptado

---

## 🧪 Testing

### Backend (manual con curl)

```bash
# Crear key vía CLI
python scripts/generar_api_key.py 1 "Testing" 30

# Probar endpoint
curl -X GET "http://localhost:5222/api/suscripcion-activa/NIT" \
  -H "X-API-Key: <clave-generada>" \
  -H "X-Empresa-Id: 1"

# Respuesta exitosa: 200 con datos de suscripción
# Sin key o inválida: 401/403
```

### Frontend (manual en UI)

1. Login como admin
2. Ir a `/admin/api-keys`
3. Crear key para empresa 1
4. Verificar que aparece en tabla con estado "Activa"
5. Copiar clave del modal
6. Editar nombre
7. Toggle estado (desactivar)
8. Verificar badge cambió a "Inactiva"
9. Activar nuevamente
10. Renovar key
11. Verificar nueva clave en modal
12. Eliminar key
13. Verificar desapareció de tabla

---

## 🔮 Mejoras Futuras (Opcional)

1. **Rate limiting:** Redis para limitar requests por key
2. **IP whitelisting:** Agregar columna `allowed_ips`
3. **Scopes:** Keys con permisos limitados (solo lectura, etc.)
4. **Webhooks:** Notificaciones cuando key esté por expirar
5. **Historial:** Ver todos los accesos de cada key
6. **Gráficas:** Dashboard con uso de keys por empresa
7. **Alertas:** Email cuando detecte intentos fallidos
8. **Múltiples keys activas:** Más de una key por empresa

---

## 📞 Soporte

Para cualquier duda sobre el sistema:

1. **Documentación backend:** `backend/API_KEYS_SISTEMA.md`
2. **Documentación frontend:** `frontend/FRONTEND_API_KEYS.md`
3. **Logs del sistema:** `backend/logs/` (categoría API)
4. **Base de datos:** Tabla `api_keys` para inspección manual

---

## ✅ Checklist de Implementación

### Backend
- [x] Modelo ApiKey con empresa_id y hash
- [x] Utilidades de encriptación (bcrypt)
- [x] Migración Alembic aplicada
- [x] Decorador require_api_key actualizado (api.py)
- [x] Decorador validar_api_key actualizado (api_soporte.py)
- [x] Endpoints CRUD admin (/admin/api-keys)
- [x] Blueprint registrado en app.py
- [x] Script CLI generar_api_key.py
- [x] Documentación API_KEYS_SISTEMA.md
- [x] bcrypt instalado en requirements.txt

### Frontend
- [x] Servicio admin-api-keys.service.ts
- [x] Componente AdminApiKeysComponent
- [x] Template con tabla y filtros
- [x] Estilos CSS completos
- [x] Ruta /admin/api-keys en app.routes.ts
- [x] Enlaces en navegación de todos los admin
- [x] Modal SweetAlert2 con botón copiar
- [x] Indicadores visuales de estado
- [x] Documentación FRONTEND_API_KEYS.md

### Testing
- [x] Migración aplicada sin errores
- [x] Backend inicia correctamente
- [x] Frontend compila sin errores
- [x] Ruta /admin/api-keys accesible
- [x] Crear key muestra modal con clave
- [x] Botón copiar funciona
- [x] Filtros actualizan tabla
- [x] Toggle cambia estado
- [x] Renovar genera nueva clave
- [x] Eliminar requiere confirmación

---

## 🎉 Resultado Final

Sistema completo de gestión de API keys implementado en backend (Flask) y frontend (Angular), con:

- ✅ Almacenamiento seguro en BD (bcrypt)
- ✅ CRUD completo desde panel admin
- ✅ Validación automática en endpoints protegidos
- ✅ Auditoría de uso
- ✅ Control de expiración
- ✅ Rotación de claves
- ✅ UX optimizada con indicadores visuales

**Todo documentado, probado y listo para producción.**
