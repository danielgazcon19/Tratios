# Sistema de API Keys con Encriptación

## Resumen

Sistema seguro de API keys almacenadas en base de datos con:
- Encriptación con bcrypt (nunca se almacena texto plano)
- Asociación a empresas
- Control de expiración
- Auditoría de uso (ultimo_uso)
- CRUD completo para administradores

## Arquitectura

### 1. Modelo de datos (`models/api_key.py`)

```python
class ApiKey:
    id: int
    empresa_id: int  # FK a empresas
    api_key_hash: str  # Hash bcrypt (255 chars)
    nombre: str  # Descripción: "Producción", "Dev", etc.
    activo: bool
    fecha_creacion: datetime
    ultimo_uso: datetime  # Se actualiza en cada request
    fecha_expiracion: datetime  # Opcional
```

**Índices:**
- `api_key_hash` (único)
- `empresa_id`
- `activo`

### 2. Utilidades de encriptación (`utils/api_key_crypto.py`)

```python
# Generar nueva API key (64 chars hex)
api_key = generar_api_key()

# Hashear para almacenar en BD
hash = hashear_api_key(api_key)

# Verificar en login
es_valida = verificar_api_key(api_key_del_request, hash_de_bd)

# Todo en uno (crear nueva key)
api_key, hash = generar_api_key_con_hash()
```

### 3. Decoradores de validación

#### `@require_api_key` (api.py)

Usado en: `GET /api/suscripcion-activa/{nit}`

Headers requeridos:
- `X-API-Key`: clave en texto plano
- `X-Empresa-Id`: ID de la empresa

Validaciones:
1. Headers presentes
2. Empresa existe
3. API key activa para esa empresa
4. Hash coincide (bcrypt.checkpw)
5. No expirada
6. Actualiza `ultimo_uso`

#### `@validar_api_key` (api_soporte.py)

Usado en: `/api/internal/support/*`

Misma lógica que `require_api_key`.

### 4. Endpoints de administración (`/admin/api-keys`)

Solo accesibles por usuarios con rol `admin`.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/admin/api-keys` | Listar todas las API keys (filtros: empresa_id, activo, search) |
| GET | `/admin/api-keys/{id}` | Obtener detalles de una API key |
| POST | `/admin/api-keys` | Crear nueva API key |
| PUT | `/admin/api-keys/{id}` | Actualizar nombre/estado/expiración |
| DELETE | `/admin/api-keys/{id}` | Eliminar API key |
| POST | `/admin/api-keys/{id}/toggle` | Activar/desactivar |
| POST | `/admin/api-keys/{id}/renovar` | Rotar clave (genera nueva, invalida anterior) |

#### Crear API key (POST `/admin/api-keys`)

**Request:**
```json
{
  "empresa_id": 1,
  "nombre": "Producción SaaS Principal",
  "dias_expiracion": 365
}
```

**Response:**
```json
{
  "message": "API Key creada exitosamente",
  "api_key": {
    "id": 1,
    "empresa_id": 1,
    "nombre": "Producción SaaS Principal",
    "activo": true,
    "fecha_creacion": "2025-12-17T10:00:00",
    "ultimo_uso": null,
    "fecha_expiracion": "2026-12-17T10:00:00"
  },
  "api_key_plana": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  "importante": "Guarde esta API key en un lugar seguro. No se podrá recuperar."
}
```

**⚠️ IMPORTANTE:** La `api_key_plana` solo se muestra UNA VEZ. Si se pierde, debe renovarse.

## Migración

```bash
# Ya ejecutada:
flask db upgrade
```

Crea tabla `api_keys` con índices.

## Uso desde scripts

### Generar API key desde terminal

```bash
python scripts/generar_api_key.py <empresa_id> <nombre> [dias_expiracion]

# Ejemplos:
python scripts/generar_api_key.py 1 "Producción Principal"
python scripts/generar_api_key.py 2 "Desarrollo" 365
```

Salida:
```
🔑 API Key (guárdela en un lugar seguro):

    a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

📋 ID en base de datos: 1
🏢 Empresa ID: 1
...
```

## Ejemplos de consumo

### Endpoint público con API key

```bash
curl -X GET "http://localhost:5222/api/suscripcion-activa/80030148752-vxT21.Ad" \
  -H "X-API-Key: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456" \
  -H "X-Empresa-Id: 1"
```

### Endpoint de soporte con API key

```bash
curl -X POST "http://localhost:5222/api/internal/support/create_tickets" \
  -H "X-API-Key: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456" \
  -H "X-Empresa-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "soporte_suscripcion_id": 4,
    "titulo": "Error al generar factura",
    "descripcion": "Detalle del problema...",
    "prioridad": "alta"
  }'
```

## Respuestas de error

### Sin API key
```json
{
  "message": "X-API-Key header requerido",
  "error": "missing_api_key"
}
```
Status: `401`

### API key inválida
```json
{
  "message": "API Key inválida o expirada",
  "error": "invalid_api_key"
}
```
Status: `403`

### Sin X-Empresa-Id
```json
{
  "message": "X-Empresa-Id header requerido",
  "error": "missing_empresa_id"
}
```
Status: `401`

### Empresa sin API keys activas
```json
{
  "message": "No hay API keys activas para esta empresa",
  "error": "no_active_keys"
}
```
Status: `403`

## Logs

Todos los accesos (exitosos y fallidos) se registran en:
- `LogCategory.API` (para endpoints `/api/*`)
- `LogCategory.SOPORTE` (para endpoints `/api/internal/support/*`)

Incluye:
- Empresa ID
- API key ID (si válida)
- Endpoint
- IP
- Timestamp
- Prefijo de API key en caso de fallo (primeros 8 chars para debug)

## Seguridad

### ✅ Implementado
- Hashing con bcrypt (rounds=12)
- API keys de 256 bits (64 chars hex)
- Validación de expiración
- Auditoría de uso (`ultimo_uso`)
- Headers explícitos (`X-API-Key`, `X-Empresa-Id`)
- Eliminación de variables de entorno (SAAS_API_KEY deprecated)

### 🔒 Recomendaciones de producción
1. **Rotar API keys periódicamente** (usar `/admin/api-keys/{id}/renovar`)
2. **Configurar expiración** (90-365 días según criticidad)
3. **Monitorear `ultimo_uso`** para detectar keys huérfanas
4. **Rate limiting** por API key (implementar middleware con Redis)
5. **IP whitelisting** (agregar columna `allowed_ips` a `api_keys` si es necesario)
6. **Alertas de seguridad** si se detectan muchos intentos fallidos desde una IP

## Cambios en endpoints existentes

### Antes (variables de entorno)
```python
@require_api_key
def endpoint():
    # Validaba contra SAAS_API_KEY del .env
    # Solo una clave global para todas las empresas
    pass
```

### Ahora (base de datos)
```python
@require_api_key
def endpoint():
    # Valida contra tabla api_keys
    # Cada empresa tiene sus propias keys
    # request.empresa_id y request.api_key_id disponibles
    pass
```

## Migración desde variables de entorno

Si tenías `SAAS_API_KEY` en `.env`:

1. Crear API key para cada empresa desde admin panel o script
2. Distribuir las nuevas keys a las instancias SaaS
3. Actualizar configuración de las instancias con los nuevos headers
4. Eliminar `SAAS_API_KEY` del `.env` (ya no se usa)

## Frontend (Angular)

TODO: Crear componente admin de API keys en `frontend/src/app/pages/admin/admin-api-keys/`

Funcionalidades:
- Listar API keys por empresa
- Crear nueva key (modal muestra clave UNA VEZ)
- Activar/desactivar
- Renovar (rotar)
- Ver último uso y expiración

## Testing

```python
# Crear API key de prueba
from utils.api_key_crypto import generar_api_key_con_hash
from models.api_key import ApiKey

key, hash = generar_api_key_con_hash()
api_key = ApiKey(
    empresa_id=1,
    api_key_hash=hash,
    nombre="Testing",
    activo=True
)
db.session.add(api_key)
db.session.commit()

# Probar request
response = client.get(
    '/api/suscripcion-activa/12345',
    headers={
        'X-API-Key': key,
        'X-Empresa-Id': '1'
    }
)
assert response.status_code == 200
```

## Rollback

Si necesitas volver atrás:

```bash
flask db downgrade -1
```

Esto elimina la tabla `api_keys` y los índices.

Para volver a validación con variables de entorno, restaurar el decorador anterior desde git:
```bash
git diff HEAD~1 backend/routes/api.py
```
