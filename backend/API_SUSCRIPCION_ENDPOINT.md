# API de Consulta de Suscripciones - Documentación

## Endpoint de Suscripción Activa por Empresa

### Descripción
Endpoint seguro y privado para consultar la suscripción activa de una empresa, incluyendo el plan contratado y los servicios asociados. Diseñado para ser consumido por el backend de tu aplicativo SaaS.

---

## 🔒 Seguridad

Este endpoint está protegido mediante **API Key** que debe enviarse en los headers de cada petición.

### Configuración de API Key

1. **Generar una API Key segura:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

2. **Configurar en el archivo `.env`:**
```env
SAAS_API_KEY=tu-api-key-generada-aqui
```

3. **Reiniciar el servidor** para aplicar los cambios.

---

## 📡 Especificación del Endpoint

### Request

**Método:** `GET`  
**URL:** `/api/suscripcion-activa/{nit}`  
**Content-Type:** `application/json`

#### Headers Requeridos
```http
X-API-Key: tu-api-key-secreta
```

#### Path Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `nit` | string | NIT de la empresa a consultar (puede incluir guiones y caracteres especiales) |

#### Ejemplo de Request
```bash
# Con NIT simple
curl -X GET "http://localhost:5222/api/suscripcion-activa/900000001" \
  -H "X-API-Key: tu-api-key-secreta"

# Con NIT complejo
curl -X GET "http://localhost:5222/api/suscripcion-activa/80030148752-vxT21.Ad" \
  -H "X-API-Key: tu-api-key-secreta"
```

---

## 📤 Respuestas

### ✅ Éxito (200 OK) - Con Suscripción Activa

```json
{
  "empresa": {
    "id": 1,
    "nombre": "Empresa Demo",
    "contacto": "demo@empresa.com",
    "nit": "900000001",
    "plan": "pro",
    "estado": true,
    "creado_en": "2024-01-15T10:30:00"
  },
  "suscripcion": {
    "id": 5,
    "fecha_inicio": "2024-01-15",
    "fecha_fin": "2025-01-15",
    "estado": "activa",
    "forma_pago": "tarjeta_credito",
    "periodo": "anual",
    "precio_pagado": 1200.00,
    "creado_en": "2024-01-15T10:30:00"
  },
  "plan": {
    "id": 2,
    "nombre": "Plan Pro",
    "descripcion": "Plan profesional con todas las funcionalidades",
    "precio_mensual": 120.00,
    "precio_anual": 1200.00,
    "seleccionado": false
  },
  "servicios": [
    {
      "id": 1,
      "nombre": "Facturación Electrónica",
      "descripcion": "Módulo completo de facturación electrónica",
      "activo": true,
      "url_api": "https://api.ejemplo.com/facturacion",
      "creado_en": "2024-01-01T00:00:00"
    },
    {
      "id": 2,
      "nombre": "Inventario",
      "descripcion": "Control de inventario en tiempo real",
      "activo": true,
      "url_api": "https://api.ejemplo.com/inventario",
      "creado_en": "2024-01-01T00:00:00"
    }
  ],
  "tiene_suscripcion_activa": true,
  "total_servicios": 2
}
```

### ✅ Éxito (200 OK) - Sin Suscripción Activa

```json
{
  "empresa": {
    "id": 1,
    "nombre": "Empresa Demo",
    "contacto": "demo@empresa.com",
    "nit": "900000001",
    "plan": "basico",
    "estado": true,
    "creado_en": "2024-01-15T10:30:00"
  },
  "suscripcion": null,
  "plan": null,
  "servicios": [],
  "tiene_suscripcion_activa": false,
  "message": "La empresa no tiene una suscripción activa"
}
```

### ❌ Error (401 Unauthorized) - API Key Faltante

```json
{
  "message": "API Key requerida",
  "error": "missing_api_key"
}
```

### ❌ Error (403 Forbidden) - API Key Inválida

```json
{
  "message": "API Key inválida",
  "error": "invalid_api_key"
}
```

### ❌ Error (404 Not Found) - Empresa No Existe

```json
{
  "message": "Empresa no encontrada",
  "error": "empresa_not_found"
}
```

### ❌ Error (500 Internal Server Error)

```json
{
  "message": "Error al procesar la solicitud",
  "error": "internal_server_error"
}
```

---

## 💻 Ejemplos de Integración

### Python (requests)

```python
import requests

API_KEY = 'tu-api-key-secreta'
BASE_URL = 'http://localhost:5222'

def obtener_suscripcion_empresa(nit):
    """
    Consulta la suscripción activa de una empresa por su NIT.
    
    Args:
        nit (str): NIT de la empresa (ej: "900000001" o "80030148752-vxT21.Ad")
    """
    url = f'{BASE_URL}/api/suscripcion-activa/{nit}'
    headers = {
        'X-API-Key': API_KEY
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        
        if data['tiene_suscripcion_activa']:
            print(f"Empresa: {data['empresa']['nombre']} (NIT: {data['empresa']['nit']})")
            print(f"Plan: {data['plan']['nombre']}")
            print(f"Servicios activos: {data['total_servicios']}")
            
            for servicio in data['servicios']:
                print(f"  - {servicio['nombre']}")
        else:
            print(f"La empresa no tiene suscripción activa")
            
        return data
        
    except requests.exceptions.HTTPError as e:
        print(f"Error HTTP: {e}")
        print(f"Respuesta: {e.response.json()}")
    except Exception as e:
        print(f"Error: {e}")

# Usar la función
suscripcion = obtener_suscripcion_empresa(EMPRESA_ID)
```

### Node.js (axios)

```javascript
const axios = require('axios');

const API_KEY = 'tu-api-key-secreta';
const BASE_URL = 'http://localhost:5222';

/**
 * Consulta la suscripción activa de una empresa por su NIT.
 * @param {string} nit - NIT de la empresa (ej: "900000001" o "80030148752-vxT21.Ad")
 */
async function obtenerSuscripcionEmpresa(nit) {
    try {
        const response = await axios.get(
            `${BASE_URL}/api/suscripcion-activa/${nit}`,
            {
                headers: {
                    'X-API-Key': API_KEY
                }
            }
        );
        
        const data = response.data;
        
        if (data.tiene_suscripcion_activa) {
            console.log(`Empresa: ${data.empresa.nombre}`);
            console.log(`Plan: ${data.plan.nombre}`);
            console.log(`Servicios activos: ${data.total_servicios}`);
            
            data.servicios.forEach(servicio => {
                console.log(`  - ${servicio.nombre}`);
            });
        } else {
            console.log('La empresa no tiene suscripción activa');
        }
        
        return data;
        
    } catch (error) {
        if (error.response) {
            console.error('Error HTTP:', error.response.status);
            console.error('Respuesta:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
        throw error;
    }
}

// Usar la función
obtenerSuscripcionEmpresa('80030148752-vxT21.Ad')
    .then(data => console.log('Consulta exitosa'))
    .catch(err => console.error('Error en la consulta'));
```

### PHP (cURL)

```php
<?php

/**
 * Consulta la suscripción activa de una empresa por su NIT.
 * @param string $nit NIT de la empresa (ej: "900000001" o "80030148752-vxT21.Ad")
 */
function obtenerSuscripcionEmpresa($nit) {
    $apiKey = 'tu-api-key-secreta';
    $baseUrl = 'http://localhost:5222';
    $url = "$baseUrl/api/suscripcion-activa/$nit";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-API-Key: ' . $apiKey
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        
        if ($data['tiene_suscripcion_activa']) {
            echo "Empresa: " . $data['empresa']['nombre'] . "\n";
            echo "Plan: " . $data['plan']['nombre'] . "\n";
            echo "Servicios activos: " . $data['total_servicios'] . "\n";
            
            foreach ($data['servicios'] as $servicio) {
                echo "  - " . $servicio['nombre'] . "\n";
            }
        } else {
            echo "La empresa no tiene suscripción activa\n";
        }
        
        return $data;
    } else {
        $error = json_decode($response, true);
        echo "Error HTTP $httpCode: " . $error['message'] . "\n";
        return null;
    }
}

// Usar la función
$suscripcion = obtenerSuscripcionEmpresa(1);
?>
```

---

## 🧪 Pruebas

### Script de Prueba Automático

Ejecuta el script de pruebas incluido:

```bash
cd backend
python scripts/test_suscripcion_api.py
```

El script ejecutará automáticamente:
- ✅ Prueba sin API Key (debe fallar)
- ✅ Prueba con API Key inválida (debe fallar)
- ✅ Prueba con API Key válida
- ✅ Prueba con empresa inexistente

### Prueba Manual con cURL

```bash
# Reemplaza 'tu-api-key' con tu API Key real
export API_KEY="tu-api-key"

# Consultar empresa por NIT
curl -X GET "http://localhost:5222/api/suscripcion-activa/80030148752-vxT21.Ad" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" | jq
```

---

## 🔐 Mejores Prácticas de Seguridad

1. **Genera una API Key fuerte**
   - Mínimo 32 caracteres
   - Usa el generador incluido o herramientas como `secrets.token_urlsafe()`

2. **Protege tu API Key**
   - No la incluyas en el código fuente
   - Usa variables de entorno
   - No la compartas en repositorios públicos
   - Usa diferentes keys para desarrollo y producción

3. **Rotación de Keys**
   - Cambia la API Key periódicamente
   - Implementa un sistema de múltiples keys si es necesario

4. **Monitoreo**
   - Los intentos de acceso se registran en los logs
   - Revisa regularmente los accesos no autorizados

5. **HTTPS en Producción**
   - Siempre usa HTTPS para las peticiones en producción
   - La API Key viaja en texto plano en los headers

---

## 📊 Códigos de Estado HTTP

| Código | Significado | Descripción |
|--------|-------------|-------------|
| 200 | OK | Consulta exitosa |
| 401 | Unauthorized | API Key faltante |
| 403 | Forbidden | API Key inválida |
| 404 | Not Found | Empresa no encontrada |
| 500 | Internal Server Error | Error del servidor |

---

## 🔍 Casos de Uso

### 1. Validar Acceso a Servicios
Antes de permitir que una empresa acceda a un servicio específico de tu SaaS:

```python
def puede_acceder_servicio(empresa_id, nombre_servicio):
    data = obtener_suscripcion_empresa(empresa_id)
    
    if not data['tiene_suscripcion_activa']:
        return False
    
    servicios_activos = [s['nombre'] for s in data['servicios']]
    return nombre_servicio in servicios_activos
```

### 2. Mostrar Información del Plan
Mostrar al usuario su plan actual y servicios disponibles:

```python
def obtener_info_plan_usuario(empresa_id):
    data = obtener_suscripcion_empresa(empresa_id)
    
    if data['tiene_suscripcion_activa']:
        return {
            'plan': data['plan']['nombre'],
            'servicios': [s['nombre'] for s in data['servicios']],
            'fecha_renovacion': data['suscripcion']['fecha_fin']
        }
    return None
```

### 3. Verificar Estado de Suscripción
Verificación periódica del estado de suscripción:

```python
def verificar_estado_suscripcion(empresa_id):
    data = obtener_suscripcion_empresa(empresa_id)
    
    if not data['tiene_suscripcion_activa']:
        # Bloquear acceso o mostrar mensaje de renovación
        return 'inactiva'
    
    # Verificar si está próxima a vencer
    fecha_fin = datetime.fromisoformat(data['suscripcion']['fecha_fin'])
    dias_restantes = (fecha_fin - datetime.now()).days
    
    if dias_restantes <= 7:
        return 'por_vencer'
    
    return 'activa'
```

---

## 🐛 Troubleshooting

### Error: API Key no configurada en el servidor

**Problema:** El servidor responde con error 500 y mensaje "Configuración de servidor incorrecta"

**Solución:**
1. Verifica que `SAAS_API_KEY` está configurada en `.env`
2. Reinicia el servidor Flask
3. Verifica que el archivo `.env` está en la raíz del backend

### Error: Todas las peticiones retornan 403

**Problema:** Incluso con la API Key correcta, recibo 403 Forbidden

**Solución:**
1. Asegúrate de usar el header exacto: `X-API-Key`
2. Verifica que no hay espacios extra en el valor de la API Key
3. Confirma que la API Key en `.env` coincide con la que estás enviando

### Error: La empresa existe pero no retorna datos

**Problema:** Respuesta 200 pero `tiene_suscripcion_activa` es false

**Solución:**
- La empresa no tiene una suscripción con estado "activa"
- Verifica en la base de datos:
  ```sql
  SELECT * FROM suscripciones WHERE empresa_id = X AND estado = 'activa';
  ```

---

## 📝 Notas Adicionales

- El endpoint solo retorna suscripciones con estado "activa"
- Los servicios retornados son solo aquellos con `activo = true`
- La relación empresa-suscripción-plan-servicios se obtiene en una sola consulta optimizada
- Todos los accesos se registran en los logs para auditoría

---

## 📞 Soporte

Para problemas o preguntas sobre este endpoint, revisa:
1. Los logs del servidor: `backend/logs/`
2. El script de pruebas: `backend/scripts/test_suscripcion_api.py`
3. La implementación: `backend/routes/api.py`
