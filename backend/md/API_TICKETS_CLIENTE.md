# API de Tickets de Soporte - Documentación para Consumo Externo

## Descripción General

Esta API permite a las empresas/clientes interactuar con el sistema de tickets de soporte directamente desde sus aplicaciones SaaS. Los clientes pueden crear tickets, agregar comentarios, subir archivos y consultar el estado de sus tickets.

**Base URL:** `/api/internal/support`

---

## Autenticación

Todos los endpoints requieren autenticación mediante headers HTTP:

```http
X-API-Key: {TU_API_KEY_SECRETA}
X-Empresa-Id: {EMPRESA_ID}
```

### Obtención de Credenciales

- **API Key**: Proporcionada por el administrador del sistema
- **Empresa ID**: ID único de tu empresa en el sistema

**Importante**: La API Key debe mantenerse **secreta** y almacenarse en variables de entorno.

---

## Zona Horaria

Todas las fechas se retornan en zona horaria de Colombia (UTC-5) en formato ISO 8601:
```
2025-12-10T15:13:54-05:00
```

---

## Referencia Rápida de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Verificar que la API está funcionando |
| GET | `/status` | Verificar estado del soporte de la empresa |
| POST | `/create_ticket` | Crear nuevo ticket |
| GET | `/tickets` | Listar tickets de la empresa |
| GET | `/ticket_id/{id}` | Obtener detalle de un ticket |
| POST | `/tickets/{id}/comentarios` | Agregar comentario al ticket |
| POST | `/tickets/{id}/upload` | Subir archivos al ticket |
| GET | `/tickets/{id}/archivos/{filename}` | Descargar archivo adjunto |

---

## 1. Health Check

### Endpoint
```http
GET /api/internal/support/health
```

### Descripción
Verifica que la API está funcionando correctamente. No requiere autenticación.

### Headers
Ninguno requerido (endpoint público)

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "API de soporte funcionando",
  "timestamp": "2025-12-10T15:13:54.123456"
}
```

---

## 2. Verificar Estado del Soporte

### Endpoint
```http
GET /api/internal/support/status
```

### Descripción
Verifica si la empresa tiene una suscripción de soporte activa y obtiene información sobre disponibilidad.

### Headers
```http
X-API-Key: {TU_API_KEY_SECRETA}
X-Empresa-Id: {EMPRESA_ID}
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "tiene_soporte": true,
  "soporte": {
    "tipo": "Asesoría Técnica Avanzada",
    "modalidad": "por_horas",
    "fecha_inicio": "2025-12-01",
    "fecha_fin": "2025-12-31",
    "tickets_consumidos": 0,
    "max_tickets": null,
    "horas_consumidas": 5.54,
    "max_horas": 100,
    "puede_crear_ticket": true
  }
}
```

### Respuesta Sin Soporte (200)
```json
{
  "success": true,
  "tiene_soporte": false,
  "message": "No hay suscripción de soporte activa"
}
```

### Errores
- **401 Unauthorized**: API Key inválida o faltante
- **404 Not Found**: Empresa no encontrada

---

## 3. Crear Ticket de Soporte

### Endpoint
```http
POST /api/internal/support/create_tickets
```

### Descripción
Crea un nuevo ticket de soporte para la empresa. Valida automáticamente la disponibilidad según el tipo de suscripción.

### Headers
```http
X-API-Key: {TU_API_KEY_SECRETA}
X-Empresa-Id: {EMPRESA_ID}
Content-Type: application/json
```

### Body (JSON)
```json
{
  "soporte_suscripcion_id": 4,
  "usuario_id": 123,
  "titulo": "Error al generar reporte mensual",
  "descripcion": "Al intentar generar el reporte de ventas del mes aparece un error 500",
  "prioridad": "alta"
}
```

### Campos del Body

| Campo | Tipo | Requerido | Descripción | Valores |
|-------|------|-----------|-------------|---------|
| soporte_suscripcion_id | integer | Sí | ID de la suscripción de soporte | Obtener de `/status` |
| usuario_id | integer | Sí | ID del usuario que crea el ticket | - |
| titulo | string | Sí | Título breve del problema (máx 255 caracteres) | - |
| descripcion | string | No | Descripción detallada del problema | - |
| prioridad | string | No | Nivel de prioridad del ticket | `baja`, `media` (default), `alta`, `critica` |

### Respuesta Exitosa (201)
```json
{
  "success": true,
  "message": "Ticket creado exitosamente",
  "ticket_id": 42,
  "ticket": {
    "id": 42,
    "titulo": "Error al generar reporte mensual",
    "descripcion": "Al intentar generar el reporte de ventas del mes aparece un error 500",
    "estado": "abierto",
    "prioridad": "alta",
    "fecha_creacion": "2025-12-10T15:13:54-05:00",
    "fecha_actualizacion": "2025-12-10T15:13:54-05:00",
    "empresa_id": 1,
    "soporte_suscripcion_id": 4,
    "usuario_creador_id": 123,
    "asignado_a": null,
    "total_comentarios": 0
  }
}
```

### Errores Comunes

#### Sin Disponibilidad (400)
```json
{
  "success": false,
  "message": "Ha consumido todos los tickets disponibles (10 tickets) para este periodo",
  "disponibilidad": {
    "tiene_disponible": false,
    "consumido": 10,
    "maximo": 10,
    "disponible": 0,
    "modalidad": "por_tickets"
  }
}
```

#### Campos Faltantes (400)
```json
{
  "success": false,
  "message": "titulo es obligatorio"
}
```

---

## 4. Listar Tickets de la Empresa

### Endpoint
```http
GET /api/internal/support/tickets
```

### Descripción
Lista todos los tickets de soporte de la empresa autenticada. El filtrado por empresa es automático basado en el header `X-Empresa-Id`.

### Headers
```http
X-API-Key: {TU_API_KEY_SECRETA}
X-Empresa-Id: {EMPRESA_ID}
```

### Query Parameters (Todos opcionales)

| Parámetro | Tipo | Descripción | Valores |
|-----------|------|-------------|---------|
| estado | string | Filtrar por estado | `abierto`, `en_proceso`, `pendiente_respuesta`, `cerrado`, `cancelado` |
| prioridad | string | Filtrar por prioridad | `baja`, `media`, `alta`, `critica` |
| busqueda | string | Buscar en título/descripción | texto libre |
| page | integer | Número de página | >= 1 (default: 1) |
| per_page | integer | Tickets por página | 10-100 (default: 20) |

### Ejemplo de Petición
```http
GET /api/internal/support/tickets?estado=abierto&prioridad=alta&page=1&per_page=10
X-API-Key: tu-api-key-secreta
X-Empresa-Id: 1
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "tickets": [
    {
      "id": 42,
      "titulo": "Error al generar reporte mensual",
      "descripcion": "Al intentar generar el reporte...",
      "estado": "en_proceso",
      "prioridad": "alta",
      "fecha_creacion": "2025-12-10T15:13:54-05:00",
      "fecha_actualizacion": "2025-12-10T15:14:07-05:00",
      "fecha_cierre": null,
      "asignado_a": 18,
      "admin_asignado": {
        "id": 18,
        "nombre": "Administrador Soporte"
      },
      "tipo_soporte": "Asesoría Técnica Avanzada",
      "total_comentarios": 3,
      "extra_data": {
        "archivos": []
      }
    }
  ],
  "total": 5,
  "page": 1,
  "per_page": 10,
  "pages": 1,
  "estadisticas": {
    "total": 5,
    "abiertos": 1,
    "en_proceso": 2,
    "pendiente_respuesta": 0,
    "cerrados": 2,
    "criticos": 1,
    "sin_asignar": 0,
    "activos": 3
  }
}
```

### Respuesta Sin Tickets (200)
```json
{
  "success": true,
  "tickets": [],
  "total": 0,
  "page": 1,
  "per_page": 20,
  "pages": 0,
  "estadisticas": {
    "total": 0,
    "abiertos": 0,
    "en_proceso": 0,
    "pendiente_respuesta": 0,
    "cerrados": 0,
    "criticos": 0,
    "sin_asignar": 0,
    "activos": 0
  }
}
```

---

## 5. Obtener Detalle de un Ticket

### Endpoint
```http
GET /api/internal/support/ticket_id/{ticket_id}
```

### Descripción
Obtiene el detalle completo de un ticket específico, incluyendo todos sus comentarios y archivos adjuntos.

### Headers
```http
X-API-Key: {TU_API_KEY_SECRETA}
X-Empresa-Id: {EMPRESA_ID}
```

### Parámetros de Ruta
- `ticket_id` (integer): ID del ticket

### Ejemplo de Petición
```http
GET /api/internal/support/ticket_id/42
X-API-Key: tu-api-key-secreta
X-Empresa-Id: 1
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "ticket": {
    "id": 42,
    "titulo": "Error al generar reporte mensual",
    "descripcion": "Al intentar generar el reporte de ventas del mes aparece un error 500",
    "estado": "en_proceso",
    "prioridad": "alta",
    "fecha_creacion": "2025-12-10T15:13:54-05:00",
    "fecha_actualizacion": "2025-12-10T15:14:07-05:00",
    "fecha_cierre": null,
    "asignado_a": 18,
    "admin_asignado": {
      "id": 18,
      "nombre": "Administrador Soporte"
    },
    "tipo_soporte": "Asesoría Técnica Avanzada",
    "total_comentarios": 2,
    "extra_data": {
      "archivos": [
        {
          "nombre": "error_screenshot_20251210_151355_15949b71.png",
          "nombre_original": "error_screenshot.png",
          "extension": "png",
          "tipo": "images",
          "tamano": 125460,
          "tamano_mb": 0.12,
          "fecha_subida": "2025-12-10T15:13:55-05:00",
          "ruta_relativa": "tickets/42/error_screenshot_20251210_151355_15949b71.png"
        }
      ]
    },
    "comentarios": [
      {
        "id": 45,
        "comentario": "Hemos identificado el problema, estamos trabajando en la solución",
        "es_admin": true,
        "usuario_id": 18,
        "fecha_creacion": "2025-12-10T15:18:46-05:00",
        "admin": {
          "id": 18,
          "nombre": "Administrador Soporte"
        },
        "archivos": []
      },
      {
        "id": 44,
        "comentario": "Adjunto captura de pantalla del error",
        "es_admin": false,
        "usuario_id": 123,
        "fecha_creacion": "2025-12-10T15:15:30-05:00",
        "archivos": [
          {
            "nombre": "error_detail_20251210_151530_abc123.png",
            "nombre_original": "error_detail.png",
            "tamano_mb": 0.08
          }
        ]
      }
    ]
  }
}
```

### Errores
- **403 Forbidden**: No tiene permisos para acceder a este ticket
- **404 Not Found**: Ticket no encontrado

---

## 6. Agregar Comentario al Ticket

### Endpoint
```http
POST /api/internal/support/tickets/{ticket_id}/comentarios
```

### Descripción
Agrega un comentario a un ticket existente. Opcionalmente puede incluir archivos adjuntos.

### Headers

**Para JSON (sin archivos):**
```http
X-API-Key: {TU_API_KEY_SECRETA}
X-Empresa-Id: {EMPRESA_ID}
Content-Type: application/json
```

**Para FormData (con archivos):**
```http
X-API-Key: {TU_API_KEY_SECRETA}
X-Empresa-Id: {EMPRESA_ID}
Content-Type: multipart/form-data
```

### Parámetros de Ruta
- `ticket_id` (integer): ID del ticket

### Body (JSON sin archivos)
```json
{
  "comentario": "Sigue presentándose el error después del último cambio",
  "usuario_id": 123,
  "es_interno": false
}
```

### Body (FormData con archivos)
```
comentario: "Adjunto evidencia adicional del error"
usuario_id: 123
es_interno: false
files: [archivo1.png, archivo2.pdf]
```

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| comentario | string | Sí | Texto del comentario |
| usuario_id | integer | Sí | ID del usuario que comenta |
| es_interno | boolean | No | Si es comentario interno (no visible para cliente) |
| files | File[] | No | Archivos adjuntos (máx 10, 10MB c/u) |

### Archivos Permitidos
- **Imágenes**: png, jpg, jpeg, gif, webp
- **Documentos**: pdf, doc, docx, xls, xlsx, txt, csv
- **Comprimidos**: zip, rar, 7z
- **Otros**: log, json

### Respuesta Exitosa (201)
```json
{
  "success": true,
  "message": "Comentario agregado exitosamente",
  "comentario": {
    "id": 46,
    "ticket_id": 42,
    "comentario": "Sigue presentándose el error después del último cambio",
    "es_admin": false,
    "usuario_id": 123,
    "fecha_creacion": "2025-12-10T16:30:00-05:00",
    "archivos": []
  }
}
```

### Respuesta con Archivos (201)
```json
{
  "success": true,
  "message": "Comentario agregado exitosamente",
  "comentario": {
    "id": 47,
    "ticket_id": 42,
    "comentario": "Adjunto evidencia adicional del error",
    "es_admin": false,
    "usuario_id": 123,
    "fecha_creacion": "2025-12-10T16:35:00-05:00",
    "archivos": [
      {
        "nombre": "evidencia1_20251210_163500_xyz789.png",
        "nombre_original": "evidencia1.png",
        "tamano_mb": 0.15
      },
      {
        "nombre": "log_error_20251210_163500_abc456.txt",
        "nombre_original": "log_error.txt",
        "tamano_mb": 0.02
      }
    ]
  }
}
```

### Errores
- **400 Bad Request**: Comentario vacío o archivo muy grande
- **403 Forbidden**: No tiene permisos para comentar en este ticket
- **404 Not Found**: Ticket no encontrado

---

## 7. Subir Archivos al Ticket

### Endpoint
```http
POST /api/internal/support/tickets/{ticket_id}/upload
```

### Descripción
Sube archivos adjuntos directamente al ticket (no a un comentario). Útil al crear el ticket desde la UI del cliente.

### Headers
```http
X-API-Key: {TU_API_KEY_SECRETA}
X-Empresa-Id: {EMPRESA_ID}
Content-Type: multipart/form-data
```

### Parámetros de Ruta
- `ticket_id` (integer): ID del ticket

### Body (FormData)
```
files: [archivo1.png, archivo2.pdf, ...]
```

### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "2 archivo(s) subido(s) exitosamente",
  "archivos_subidos": [
    {
      "nombre": "captura_20251210_151355_abc123.png",
      "nombre_original": "captura.png",
      "extension": "png",
      "tipo": "images",
      "tamano": 245680,
      "tamano_mb": 0.23,
      "fecha_subida": "2025-12-10T15:13:55-05:00"
    },
    {
      "nombre": "log_20251210_151355_xyz789.txt",
      "nombre_original": "app.log",
      "extension": "txt",
      "tipo": "documents",
      "tamano": 12450,
      "tamano_mb": 0.01,
      "fecha_subida": "2025-12-10T15:13:55-05:00"
    }
  ],
  "total": 2,
  "errores": []
}
```

### Respuesta con Errores Parciales (200)
```json
{
  "success": true,
  "message": "1 archivo(s) subido(s) exitosamente, 1 error(es)",
  "archivos_subidos": [
    {
      "nombre": "captura_20251210_151355_abc123.png",
      "nombre_original": "captura.png",
      "tamano_mb": 0.23
    }
  ],
  "total": 1,
  "errores": [
    "archivo_grande.zip: El archivo excede el tamaño máximo de 10 MB"
  ]
}
```

---

## 8. Descargar Archivo Adjunto

### Endpoint
```http
GET /api/internal/support/tickets/{ticket_id}/archivos/{filename}
```

### Descripción
Descarga un archivo adjunto de un ticket o comentario.

### Headers
```http
X-API-Key: {TU_API_KEY_SECRETA}
X-Empresa-Id: {EMPRESA_ID}
```

### Parámetros de Ruta
- `ticket_id` (integer): ID del ticket
- `filename` (string): Nombre del archivo guardado en el servidor

### Ejemplo de Petición
```http
GET /api/internal/support/tickets/42/archivos/captura_20251210_151355_abc123.png
X-API-Key: tu-api-key-secreta
X-Empresa-Id: 1
```

### Respuesta Exitosa (200)
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="captura.png"

[BINARY FILE DATA]
```

### Errores
- **403 Forbidden**: No tiene permisos para acceder a este archivo
- **404 Not Found**: Archivo no encontrado

---

## Estados del Ticket

| Estado | Descripción | Puede Agregar Comentarios |
|--------|-------------|---------------------------|
| `abierto` | Ticket recién creado, esperando asignación | ✅ Sí |
| `en_proceso` | Ticket asignado y siendo atendido | ✅ Sí |
| `pendiente_respuesta` | Esperando respuesta del cliente | ✅ Sí |
| `cerrado` | Ticket resuelto y cerrado | ❌ No |
| `cancelado` | Ticket cancelado (no consume cupo) | ❌ No |

---

## Prioridades

| Prioridad | Nivel | Tiempo Respuesta Esperado* |
|-----------|-------|---------------------------|
| `baja` | 1 | 72 horas hábiles |
| `media` | 2 | 48 horas hábiles |
| `alta` | 3 | 24 horas hábiles |
| `critica` | 4 | 4 horas (incluso fines de semana) |

*Los tiempos varían según el tipo de suscripción.

---

## Códigos de Error HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Petición exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Datos inválidos o faltantes |
| 401 | Unauthorized - API Key inválida o faltante |
| 403 | Forbidden - No tiene permisos para acceder al recurso |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

---

## Límites y Restricciones

### Archivos
- **Tamaño máximo por archivo**: 10 MB
- **Archivos máximos por petición**: 10
- **Tipos permitidos**: Ver sección "Archivos Permitidos"

### Paginación
- **Mínimo per_page**: 10
- **Máximo per_page**: 100
- **Default per_page**: 20

---

## Ejemplos de Uso

### Configuración Inicial (JavaScript)

```javascript
// config.js
const API_BASE_URL = 'https://tu-servidor.com/api/internal/support';
const API_KEY = process.env.SAAS_API_KEY;  // Tu API Key
const EMPRESA_ID = process.env.EMPRESA_ID;  // ID de tu empresa

const headers = {
  'X-API-Key': API_KEY,
  'X-Empresa-Id': EMPRESA_ID.toString(),
  'Content-Type': 'application/json'
};
```

### Ejemplo 1: Verificar Estado y Crear Ticket

```javascript
async function crearTicketConValidacion() {
  // 1. Verificar estado del soporte
  const statusResponse = await fetch(`${API_BASE_URL}/status`, { headers });
  const statusData = await statusResponse.json();
  
  if (!statusData.success || !statusData.tiene_soporte) {
    console.error('No tiene soporte activo');
    return;
  }
  
  if (!statusData.soporte.puede_crear_ticket) {
    console.error('No tiene disponibilidad para crear tickets');
    return;
  }
  
  // 2. Crear el ticket
  const ticketResponse = await fetch(`${API_BASE_URL}/create_tickets`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      soporte_suscripcion_id: 4,
      usuario_id: 123,
      titulo: 'Error al generar reporte',
      descripcion: 'Descripción detallada del problema',
      prioridad: 'alta'
    })
  });
  
  const ticketData = await ticketResponse.json();
  
  if (ticketData.success) {
    console.log(`Ticket creado: ${ticketData.ticket_id}`);
    return ticketData.ticket;
  } else {
    console.error(`Error: ${ticketData.message}`);
  }
}
```

### Ejemplo 2: Listar Tickets con Filtros

```javascript
async function listarTicketsAbiertos() {
  const params = new URLSearchParams({
    estado: 'abierto',
    prioridad: 'alta',
    page: 1,
    per_page: 10
  });
  
  const response = await fetch(`${API_BASE_URL}/tickets?${params}`, { headers });
  const data = await response.json();
  
  if (data.success) {
    console.log(`Total de tickets: ${data.total}`);
    console.log(`Activos: ${data.estadisticas.activos}`);
    
    data.tickets.forEach(ticket => {
      console.log(`#${ticket.id}: ${ticket.titulo} - ${ticket.estado}`);
    });
  }
}
```

### Ejemplo 3: Agregar Comentario con Archivos

```javascript
async function agregarComentarioConArchivos(ticketId, comentario, archivos) {
  const formData = new FormData();
  formData.append('usuario_id', '123');
  formData.append('comentario', comentario);
  formData.append('es_interno', 'false');
  
  // Agregar archivos
  archivos.forEach(file => {
    formData.append('files', file);
  });
  
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/comentarios`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'X-Empresa-Id': EMPRESA_ID.toString()
      // NO incluir Content-Type, FormData lo maneja automáticamente
    },
    body: formData
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('Comentario agregado exitosamente');
    return data.comentario;
  } else {
    console.error(`Error: ${data.message}`);
  }
}

// Uso en navegador
const fileInput = document.getElementById('files');
const archivos = Array.from(fileInput.files);
await agregarComentarioConArchivos(42, 'Adjunto evidencia', archivos);
```

### Ejemplo 4: Clase Helper Completa

```javascript
class SoporteClient {
  constructor(apiKey, empresaId) {
    this.baseURL = 'https://tu-servidor.com/api/internal/support';
    this.headers = {
      'X-API-Key': apiKey,
      'X-Empresa-Id': empresaId.toString(),
      'Content-Type': 'application/json'
    };
  }
  
  async verificarEstado() {
    const response = await fetch(`${this.baseURL}/status`, {
      headers: this.headers
    });
    return await response.json();
  }
  
  async crearTicket(datos) {
    const response = await fetch(`${this.baseURL}/create_tickets`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(datos)
    });
    return await response.json();
  }
  
  async listarTickets(filtros = {}) {
    const params = new URLSearchParams(filtros);
    const response = await fetch(`${this.baseURL}/tickets?${params}`, {
      headers: this.headers
    });
    return await response.json();
  }
  
  async obtenerTicket(ticketId) {
    const response = await fetch(`${this.baseURL}/ticket_id/${ticketId}`, {
      headers: this.headers
    });
    return await response.json();
  }
  
  async agregarComentario(ticketId, usuarioId, comentario, archivos = []) {
    if (archivos.length > 0) {
      const formData = new FormData();
      formData.append('usuario_id', usuarioId.toString());
      formData.append('comentario', comentario);
      formData.append('es_interno', 'false');
      archivos.forEach(file => formData.append('files', file));
      
      const response = await fetch(`${this.baseURL}/tickets/${ticketId}/comentarios`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.headers['X-API-Key'],
          'X-Empresa-Id': this.headers['X-Empresa-Id']
        },
        body: formData
      });
      return await response.json();
    } else {
      const response = await fetch(`${this.baseURL}/tickets/${ticketId}/comentarios`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          usuario_id: usuarioId,
          comentario,
          es_interno: false
        })
      });
      return await response.json();
    }
  }
  
  async subirArchivos(ticketId, archivos) {
    const formData = new FormData();
    archivos.forEach(file => formData.append('files', file));
    
    const response = await fetch(`${this.baseURL}/tickets/${ticketId}/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.headers['X-API-Key'],
        'X-Empresa-Id': this.headers['X-Empresa-Id']
      },
      body: formData
    });
    return await response.json();
  }
}

// Uso
const cliente = new SoporteClient(API_KEY, EMPRESA_ID);

async function flujoCompleto() {
  try {
    // Verificar soporte
    const estado = await cliente.verificarEstado();
    if (!estado.success || !estado.tiene_soporte) {
      console.log('No hay soporte disponible');
      return;
    }
    
    // Crear ticket
    const ticket = await cliente.crearTicket({
      soporte_suscripcion_id: 4,
      usuario_id: 123,
      titulo: 'Error crítico en producción',
      descripcion: 'La aplicación no responde',
      prioridad: 'critica'
    });
    
    if (!ticket.success) {
      console.error('Error al crear ticket:', ticket.message);
      return;
    }
    
    console.log(`Ticket creado: ${ticket.ticket_id}`);
    
    // Agregar comentario
    await cliente.agregarComentario(
      ticket.ticket_id,
      123,
      'Logs del servidor adjuntos'
    );
    
    // Listar tickets activos
    const tickets = await cliente.listarTickets({ estado: 'abierto' });
    console.log(`Tickets abiertos: ${tickets.total}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

flujoCompleto();
```

---

## Manejo de Errores

Todas las respuestas incluyen el campo `success` (boolean):

```javascript
// Respuesta exitosa
{
  "success": true,
  "data": { ... }
}

// Respuesta con error
{
  "success": false,
  "message": "Descripción del error"
}
```

### Ejemplo de Manejo de Errores

```javascript
async function crearTicketConManejo(datos) {
  try {
    const response = await fetch(`${API_BASE_URL}/create_tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(datos)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      switch (response.status) {
        case 400:
          console.error('Datos inválidos:', result.message);
          break;
        case 403:
          console.error('Sin disponibilidad:', result.message);
          break;
        case 401:
          console.error('Autenticación fallida');
          break;
        default:
          console.error('Error desconocido:', result.message);
      }
      return null;
    }
    
    return result;
    
  } catch (error) {
    console.error('Error de conexión:', error);
    return null;
  }
}
```

---

## Notas Finales

- **Seguridad**: Mantén tu `X-API-Key` en variables de entorno, NUNCA en código fuente
- **Archivos**: Máximo 10MB por archivo, 10 archivos por petición
- **Paginación**: Usa `page` y `per_page` para manejar listas grandes
- **Filtros**: Los tickets se filtran automáticamente por `empresa_id` del header

Para soporte técnico de la API, contacta a tu proveedor SaaS.
