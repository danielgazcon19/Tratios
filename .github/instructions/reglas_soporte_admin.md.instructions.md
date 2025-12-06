# Administración de Soporte para Tratios (SaaS)
Documento para crear la administración del soporte (soporte_tipo, soporte_suscripcion, soporte_pagos y soporte_tickets) y exponer un API privado que el SaaS consumirá para registrar tickets cuando exista una suscripción de soporte activa.

---
## Resumen
Se introducirán 4 objetos principales en la base de datos y el backend:
- `soporte_tipo`: Catálogo de tipos de soporte (básico, premium, por tickets, por horas, etc.).
- `soporte_suscripcion`: Vincula un soporte a una suscripción/empresa.
- `soporte_pagos`: Registra pagos asociados al soporte.
- `soporte_tickets`: Registra tickets abiertos por clientes que tienen soporte activo.

El backend expondrá endpoints privados para que las instancias del SaaS (clientes) puedan crear tickets y consultar el estado, siempre verificando que la empresa tenga una suscripción de soporte activa.

---
## Reglas de negocio principales
1. **Solo empresas con `soporte_suscripcion` en estado `activo` pueden crear `soporte_tickets`.**
2. **El precio del soporte se captura en `soporte_suscripcion.precio_actual`** al momento de contratar (para auditoría).
3. **Soporte por tickets** consumirá `max_tickets` del tipo `soporte_tipo`. Si se excede, el sistema debe impedir la creación de más tickets o forzar compra de paquete adicional.
4. **Soporte por horas** deberá llevar un registro de horas consumidas (puede añadirse una tabla `soporte_consumo_horas` si se requiere).
5. **Los pagos de soporte se registran en `soporte_pagos`.** Si el pago está `pendiente` no se debe considerar el soporte como activo hasta confirmación.
6. **Auditoría**: Todo cambio de estado (activación/cancelación) debe registrar usuario, fecha y motivo.
7. **API privada**: El endpoint de creación de tickets debe validar API key o JWT con claim que identifique la `empresa_id` y `instancia_id` para evitar abuso.

---
## Esquema SQL propuesto (MySQL)

-- Tabla: soporte_tipo
```sql
CREATE TABLE IF NOT EXISTS soporte_tipo (
  id_soporte_tipo BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  modalidad ENUM('mensual','anual','por_tickets','por_horas') NOT NULL,
  precio DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  max_tickets INT DEFAULT NULL,
  max_horas INT DEFAULT NULL,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

-- Tabla: soporte_suscripcion
```sql
CREATE TABLE IF NOT EXISTS soporte_suscripcion (
  id_soporte_suscripcion BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_suscripcion BIGINT NOT NULL,
  id_empresa BIGINT NOT NULL,
  id_soporte_tipo BIGINT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE DEFAULT NULL,
  estado ENUM('activo','vencido','cancelado','pendiente_pago') DEFAULT 'activo',
  precio_actual DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  tickets_consumidos INT DEFAULT 0,
  horas_consumidas DECIMAL(10,2) DEFAULT 0.00,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_soporte_tipo) REFERENCES soporte_tipo(id_soporte_tipo)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

-- Tabla: soporte_pagos
```sql
CREATE TABLE IF NOT EXISTS soporte_pagos (
  id_pago_soporte BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_soporte_suscripcion BIGINT NOT NULL,
  fecha_pago DATETIME NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  metodo_pago VARCHAR(100),
  referencia_pago VARCHAR(255),
  estado ENUM('exitoso','fallido','pendiente') DEFAULT 'exitoso',
  detalle JSON NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_soporte_suscripcion) REFERENCES soporte_suscripcion(id_soporte_suscripcion)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

-- Tabla: soporte_tickets
```sql
CREATE TABLE IF NOT EXISTS soporte_tickets (
  id_ticket BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_soporte_suscripcion BIGINT NOT NULL,
  id_empresa BIGINT NOT NULL,
  id_usuario_creador BIGINT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estado ENUM('abierto','en_proceso','pendiente_respuesta','cerrado','cancelado') DEFAULT 'abierto',
  prioridad ENUM('baja','media','alta','critica') DEFAULT 'media',
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fecha_cierre DATETIME NULL,
  metadata JSON NULL,
  FOREIGN KEY (id_soporte_suscripcion) REFERENCES soporte_suscripcion(id_soporte_suscripcion)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

-- (Opcional) Tabla: soporte_tickets_comentarios
```sql
CREATE TABLE IF NOT EXISTS soporte_tickets_comentarios (
  id_comentario BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_ticket BIGINT NOT NULL,
  id_usuario BIGINT NULL,
  comentario TEXT NOT NULL,
  archivos JSON NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_ticket) REFERENCES soporte_tickets(id_ticket)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---
## Endpoints sugeridos (Backend - Flask)

> Nota: los endpoints listados son **privados** y deben protegerse con API key por instancia o JWT con claim `is_saas_instance` + `empresa_id`.

### 1. Crear ticket (consumido por la instancia SaaS)
- **POST** `/api/internal/support/tickets`
- **Headers**: `Authorization: Bearer <JWT_or_API_KEY>`, `X-Instance-Id: <instance_id>`
- **Body**:
```json
{
  "empresa_id": 123,
  "id_suscripcion": 456,
  "titulo": "No puedo generar factura",
  "descripcion": "Al intentar generar factura me sale error XYZ",
  "usuario_creador_id": 789,
  "metadata": { "origen": "web_sede_1", "version_front": "build_123" }
}
```
- **Validaciones**:
  - La request viene de una instancia autenticada.
  - La `empresa_id` existe.
  - Existe un `soporte_suscripcion` para `empresa_id` con `estado = 'activo'` **y** `fecha_inicio <= hoy <= fecha_fin` (si aplica).
  - Si `modalidad = 'por_tickets'` verificar `tickets_consumidos < max_tickets`.
- **Respuesta 200**:
```json
{ "success": true, "ticket_id": 101, "message": "Ticket creado" }
```

### 2. Consultar tickets de una empresa (privado)
- **GET** `/api/internal/support/tickets?empresa_id=123&estado=abierto`
- **Headers**: Authorization
- **Validaciones**: Solo instancias autorizadas o usuarios admins pueden consultar.
- **Respuesta**: listados de tickets con paginación.

### 3. Agregar comentario al ticket (interno o admin)
- **POST** `/api/internal/support/tickets/{ticket_id}/comentarios`
- **Body**:
```json
{ "id_usuario": 789, "comentario": "Estamos analizando", "archivos": null }
```

### 4. Cambiar estado del ticket (admin)
- **PATCH** `/api/internal/support/tickets/{ticket_id}`
- **Body**:
```json
{ "estado": "en_proceso", "fecha_cierre": null }
```

### 5. Registrar pago manual desde admin
- **POST** `/api/internal/support/pagos`
- **Body**:
```json
{
  "id_soporte_suscripcion": 12,
  "fecha_pago": "2025-12-01T12:00:00",
  "monto": 150000,
  "metodo_pago": "transferencia",
  "referencia_pago": "TRX-98765"
}
```

---
## Validaciones y flujo interno al crear ticket (detallado)

1. **Auth**: Validar API Key/JWT y `X-Instance-Id` en header.
2. **Empresa**: Validar existencia de `empresa_id`.
3. **Suscripción soporte**: Buscar `soporte_suscripcion` activo para la empresa.
4. **Límites**: Si modalidad `por_tickets` -> verificar `tickets_consumidos < max_tickets`.
5. **Crear ticket** en `soporte_tickets` con `id_soporte_suscripcion` correspondiente.
6. **Incrementar contador** (`tickets_consumidos`) en `soporte_suscripcion` si aplica.
7. **Emitir notificación** (correo / webhook) al equipo de soporte y al cliente.
8. **Registrar auditoría** del evento (quién hizo, desde qué instancia, ip, user-agent, etc.).

---
## Consideraciones de seguridad

- **Autenticación**: Endpoints deben ser accesibles únicamente mediante JWT emitido por el servicio principal del SaaS o API keys rotativas por instancia.
- **Rate limiting**: Aplicar límite de peticiones por instancia para evitar abuso (ej. 60 requests/minuto).
- **Validación de archivo**: Si se aceptan archivos en comentarios, validar tamaño, tipo y escanear por malware.
- **Auditoría**: Registrar todos los endpoints consumidos desde instancias externas en tabla `auditoria_integracion` (fecha, instancia_id, endpoint, payload_hash, resultado).
- **CORS / HTTPS**: El API privado solo sobre HTTPS y con CORS restringido a las IPs/hosts de tus instancias SaaS si aplicable.
- **Encriptación**: Si se envían datos sensibles, usar cifrado a nivel de aplicación (opcional).

---
## Mensajería / Notificaciones
- Al crear ticket: correo automático al equipo de soporte + webhook opcional a Slack / Teams.
- Al cambiar estado: notificar al usuario creador y al email de la empresa.
- Resumen diario: enviar digest con tickets nuevos y pendientes.

---
## Endpoints Admin (Front-Back panel de la plataforma)
- CRUD soporte_tipo (CREATE, READ, UPDATE, DELETE/ACTIVAR-DESACTIVAR)
- CRUD soporte_suscripcion (LISTAR, ACTIVAR, CANCELAR, RENOVAR)
- CRUD soporte_pagos (LISTAR, CONFIRMAR PAGO, REVERTIR)
- LISTADO y gestión de tickets (ASIGNAR, COMENTAR, CAMBIAR ESTADO, CERRAR)

---
## Ejemplos de código (Flask - snippets)

**Validar suscripción activa antes de crear ticket**:
```python
def obtener_soporte_activo(empresa_id):
    hoy = datetime.utcnow().date()
    ss = db.session.query(SoporteSuscripcion).filter_by(id_empresa=empresa_id, estado='activo').filter(
        SoporteSuscripcion.fecha_inicio <= hoy
    ).filter(
        (SoporteSuscripcion.fecha_fin.is_(None)) | (SoporteSuscripcion.fecha_fin >= hoy)
    ).first()
    return ss

@app.route('/api/internal/support/tickets', methods=['POST'])
def crear_ticket():
    auth_ok = validar_api_key(request.headers.get('Authorization'), request.headers.get('X-Instance-Id'))
    if not auth_ok:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    body = request.get_json()
    empresa_id = body.get('empresa_id')
    ss = obtener_soporte_activo(empresa_id)
    if not ss:
        return jsonify({'success': False, 'message': 'No active support subscription'}), 403

    # verificar limites por tickets
    if ss.modalidad == 'por_tickets' and ss.tickets_consumidos >= ss_max_tickets(ss.id_soporte_tipo):
        return jsonify({'success': False, 'message': 'Ticket limit exceeded'}), 403

    # crear ticket...
```

---
## Migración e índices recomendados
- Indexar `soporte_suscripcion(id_empresa)`, `soporte_suscripcion(estado)`.
- Indexar `soporte_tickets(id_soporte_suscripcion)`, `soporte_tickets(estado)`.
- Añadir `FULLTEXT` en título/descripcion si permitirás búsquedas por texto.
- Si esperas gran volumen de integraciones, particionar `soporte_tickets` por `id_empresa`.

---
## Notas finales
- El API privado permite que cada instancia SaaS (empresa) deje tickets sincronizados en la plataforma madre.
- El diseño separa claramente facturación (pagos), producto (tipos de soporte) y uso (tickets / consumo).
- Si lo deseas, puedo generar los modelos SQLAlchemy, rutas Flask completas y los componentes Angular para el panel administrativo.

---
# FIN
