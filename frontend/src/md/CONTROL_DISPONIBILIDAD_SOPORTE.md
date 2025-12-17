# Sistema de Control de Disponibilidad de Soporte

## Resumen de Implementación

Se ha implementado un sistema completo de control de disponibilidad de soporte que valida y gestiona el consumo de tickets y horas según el tipo de suscripción contratada.

---

## 🎯 Funcionalidades Implementadas

### 1. **Validación de Disponibilidad al Crear Tickets**

El sistema verifica automáticamente:
- ✅ Si el cliente tiene tickets/horas disponibles según su plan
- ✅ Si la suscripción está dentro del periodo vigente
- ✅ Horario laboral para soporte básico
- ✅ Mensajes específicos según tipo de soporte (24/7, básico, etc.)

### 2. **Actualización Automática de Consumo**

Cuando se cierra un ticket:
- ✅ Se incrementa el contador de `tickets_consumidos` (modalidad por_tickets)
- ✅ Se calculan y acumulan las `horas_consumidas` (modalidad por_horas)
- ✅ Se registra en logs para auditoría

### 3. **Visualización en Frontend**

El formulario de creación de tickets muestra:
- ✅ Tickets/horas disponibles vs consumidos
- ✅ Periodo de vigencia de la suscripción
- ✅ Tipo de respuesta esperada
- ✅ Alertas de horario (para soporte básico)
- ✅ Indicadores visuales con colores (verde=disponible, naranja=sin disponibilidad)

---

## 📋 Detalles por Modalidad

### **Modalidad: por_tickets**
- Cuenta tickets consumidos contra `max_tickets` del tipo de soporte
- Al cerrar ticket: incrementa `tickets_consumidos` en la suscripción
- Valida antes de crear: `disponibles = max_tickets - tickets_consumidos`
- Bloquea creación si `disponibles <= 0`

**Ejemplo:**
```
Soporte por Evento: max_tickets = 2
Tickets consumidos: 0
Disponibles: 2 ✅
```

### **Modalidad: por_horas**
- Calcula horas transcurridas entre creación y cierre del ticket
- Al cerrar ticket: suma horas al campo `horas_consumidas`
- Valida antes de crear: `disponibles = max_horas - horas_consumidas`
- Bloquea creación si `disponibles <= 0`

**Ejemplo:**
```
Asesoría Técnica: max_horas = 100
Horas consumidas: 0.00
Disponibles: 100.00 ✅
```

### **Modalidad: mensual/anual**
- Sin límite de tickets/horas
- Validación especial según tipo:

#### **Soporte Básico**
- Valida día laboral (Lunes a Viernes)
- Valida horario (8:00 AM - 6:00 PM Colombia)
- Mensaje: *"Atención por correo y chat, en horario laboral. Respuesta en máximo 24 horas."*
- Si está fuera de horario: muestra advertencia pero permite crear ticket

#### **Soporte 24/7 / Premium**
- Sin restricciones de horario
- Mensaje: *"Atención inmediata todos los días del año. Línea prioritaria."*
- Permite crear tickets en cualquier momento

---

## 🔧 Archivos Modificados

### Backend

#### **`backend/routes/admin_soporte_tickets.py`**

**Funciones agregadas:**

1. **`calcular_disponibilidad_soporte(suscripcion)`**
   - Calcula disponibilidad según modalidad
   - Valida periodo de vigencia
   - Verifica horario laboral (soporte básico)
   - Retorna objeto con toda la información

2. **`actualizar_consumo_ticket_cerrado(ticket)`**
   - Se ejecuta al cerrar un ticket
   - Actualiza `tickets_consumidos` o `horas_consumidas`
   - Registra en logs

**Endpoint agregado:**

```python
GET /admin/soporte-tickets/disponibilidad/:suscripcion_id
```

Retorna:
```json
{
  "tiene_disponible": true,
  "mensaje": "Tiene 2 tickets disponibles de 2",
  "consumido": 0,
  "maximo": 2,
  "disponible": 2,
  "modalidad": "por_tickets",
  "periodo_inicio": "2025-12-06",
  "periodo_fin": "2026-01-06",
  "requiere_horario_laboral": false,
  "respuesta_esperada": "",
  "tipo_soporte": {...},
  "empresa": {...}
}
```

**Modificaciones:**

- **`crear_ticket()`**: Agregada validación de disponibilidad antes de crear
- **`actualizar_ticket()`**: Agregada llamada a `actualizar_consumo_ticket_cerrado()` al cerrar

### Frontend

#### **`frontend/src/app/services/admin-soporte.service.ts`**

**Interfaz agregada:**
```typescript
export interface DisponibilidadSoporte {
  tiene_disponible: boolean;
  mensaje: string;
  consumido: number;
  maximo: number;
  disponible: number;
  modalidad: 'mensual' | 'anual' | 'por_tickets' | 'por_horas';
  periodo_inicio: string;
  periodo_fin?: string;
  requiere_horario_laboral: boolean;
  respuesta_esperada: string;
  tipo_soporte?: {...};
  empresa?: {...};
}
```

**Método agregado:**
```typescript
consultarDisponibilidadSoporte(suscripcionId: number): Observable<DisponibilidadSoporte>
```

#### **`frontend/src/app/pages/admin/admin-soporte/admin-soporte.component.ts`**

**Propiedades agregadas:**
```typescript
disponibilidadSoporte: any = null;
cargandoDisponibilidad = false;
```

**Métodos agregados/modificados:**

1. **`consultarDisponibilidadSoporte(suscripcionId)`**
   - Consulta disponibilidad al seleccionar empresa
   - Muestra alerta si no hay disponibilidad
   - Actualiza UI con información visual

2. **`getModalidadLabel(modalidad)`**
   - Formatea etiquetas de modalidad para mostrar

3. **`onEmpresaChangeTicket()`**
   - Modificado para consultar disponibilidad automáticamente

4. **`guardarTicket()`**
   - Modificado para validar disponibilidad antes de enviar
   - Maneja errores de disponibilidad del backend

#### **`frontend/src/app/pages/admin/admin-soporte/admin-soporte.component.html`**

**Sección agregada:**
```html
<div *ngIf="disponibilidadSoporte" class="disponibilidad-info">
  <!-- Encabezado con icono -->
  <!-- Mensaje principal -->
  <!-- Detalles de consumo (tickets/horas) -->
  <!-- Periodo de vigencia -->
  <!-- Respuesta esperada -->
  <!-- Alerta de horario (si aplica) -->
</div>
```

#### **`frontend/src/app/pages/admin/admin-soporte/admin-soporte.component.css`**

**Estilos agregados:**
- `.disponibilidad-info` - Contenedor principal
- `.disponibilidad-info.disponible` - Fondo verde cuando hay disponibilidad
- `.disponibilidad-info.sin-disponible` - Fondo naranja cuando no hay
- `.disponibilidad-header` - Encabezado con icono
- `.disponibilidad-mensaje` - Mensaje principal destacado
- `.disponibilidad-detalles` - Grid de información
- `.detalle-row` - Fila de detalle (consumido/máximo)
- `.respuesta-esperada` - Caja azul con mensaje de SLA
- `.alerta-horario` - Alerta naranja para horario laboral
- Animación `pulse-clock` para icono de reloj

---

## 🎨 Interfaz de Usuario

### Estado: Disponibilidad OK ✅
```
┌─────────────────────────────────────────────────┐
│ ✓ Soporte por Evento                            │
│                                                  │
│ Tiene 2 tickets disponibles de 2                │
│                                                  │
│ 🎟️ Tickets:   2 disponibles (0 / 2 usados)     │
│ 📅 Periodo:   06/dic/2025 - 06/ene/2026        │
└─────────────────────────────────────────────────┘
(Fondo verde claro)
```

### Estado: Sin Disponibilidad ⚠️
```
┌─────────────────────────────────────────────────┐
│ ⚠ Soporte por Evento                            │
│                                                  │
│ Ha consumido todos los tickets disponibles      │
│ (2 tickets) para este periodo                   │
│                                                  │
│ 🎟️ Tickets:   0 disponibles (2 / 2 usados)     │
│ 📅 Periodo:   06/dic/2025 - 06/ene/2026        │
└─────────────────────────────────────────────────┘
(Fondo naranja claro)
```

### Estado: Soporte Básico (fuera de horario) 🕐
```
┌─────────────────────────────────────────────────┐
│ ✓ Soporte Básico                                │
│                                                  │
│ ⚠️ Horario laboral: Lunes a Viernes,            │
│ 8:00 AM - 6:00 PM. Su ticket será atendido     │
│ en el siguiente horario hábil.                  │
│                                                  │
│ 📅 Periodo:   01/dic/2025 - 01/dic/2026        │
│                                                  │
│ ℹ️ Atención por correo y chat, en horario       │
│   laboral. Respuesta en máximo 24 horas.       │
│                                                  │
│ 🕐 Su ticket será procesado en el siguiente     │
│    horario hábil (Lunes a Viernes, 8-6pm)      │
└─────────────────────────────────────────────────┘
```

### Estado: Soporte 24/7 🚀
```
┌─────────────────────────────────────────────────┐
│ ✓ Soporte 24/7                                  │
│                                                  │
│ 🚀 Soporte prioritario 24/7 activo.             │
│    Atención inmediata.                          │
│                                                  │
│ 📅 Periodo:   05/dic/2025 - 05/dic/2026        │
│                                                  │
│ ℹ️ Atención inmediata todos los días del año.   │
│   Línea prioritaria.                            │
└─────────────────────────────────────────────────┘
(Sin límite de tickets/horas)
```

---

## 🧪 Testing

### Script de Prueba
Se creó `backend/scripts/test_disponibilidad_soporte.py` para:
- Listar todos los tipos de soporte
- Mostrar suscripciones activas con su disponibilidad
- Identificar alertas (pocos tickets/horas restantes)
- Contar tickets del periodo

**Ejecución:**
```bash
cd backend
python scripts/test_disponibilidad_soporte.py
```

---

## 📊 Campos de Base de Datos

El modelo `SoporteSuscripcion` ya incluye:
```python
tickets_consumidos = db.Column(db.Integer, default=0)
horas_consumidas = db.Column(db.Numeric(10, 2), default=0.00)
```

Estos campos se actualizan automáticamente al cerrar tickets.

---

## 🔐 Seguridad y Validaciones

1. **Doble validación**: Frontend y Backend
2. **No se puede burlar**: El backend valida siempre antes de crear
3. **Auditoría completa**: Todos los cambios se registran en logs
4. **Manejo de errores**: Mensajes claros al usuario
5. **Periodo de vigencia**: Valida que la suscripción esté activa

---

## 📝 Casos de Uso Cubiertos

### ✅ Caso 1: Cliente con tickets limitados
- Tiene plan "Soporte por Evento" con 2 tickets
- Ya usó 0 tickets
- **Resultado**: Puede crear ticket, se muestra "2 disponibles"

### ✅ Caso 2: Cliente sin tickets disponibles
- Tiene plan "Soporte por Evento" con 2 tickets
- Ya usó 2 tickets
- **Resultado**: No puede crear ticket, mensaje de error

### ✅ Caso 3: Cliente con horas limitadas
- Tiene plan "Asesoría Técnica" con 100 horas
- Ya consumió 95.5 horas
- **Resultado**: Puede crear ticket, se muestra "4.5 horas disponibles"

### ✅ Caso 4: Soporte básico en horario no laboral
- Tiene plan "Soporte Básico" (mensual)
- Son las 10 PM de un sábado
- **Resultado**: Puede crear ticket, muestra advertencia de horario

### ✅ Caso 5: Soporte 24/7
- Tiene plan "Soporte 24/7" (anual)
- Es domingo a las 3 AM
- **Resultado**: Puede crear ticket inmediatamente, sin restricciones

### ✅ Caso 6: Actualización al cerrar ticket
- Se cierra un ticket de "Soporte por Evento"
- Sistema incrementa tickets_consumidos de 0 a 1
- Nueva disponibilidad: 1 ticket disponible

---

## 🚀 Próximos Pasos Sugeridos

1. **Notificaciones automáticas** cuando quedan pocos tickets/horas
2. **Dashboard de consumo** para clientes
3. **Reportes de utilización** por empresa
4. **Alertas preventivas** al 80% de consumo
5. **Renovación automática** al agotar recursos

---

## 📞 Contacto y Soporte

Para consultas sobre esta implementación, revisar:
- Logs en `backend/logs/`
- Documentación de API en `/api/docs`
- Tests en `backend/scripts/test_disponibilidad_soporte.py`

---

**Fecha de implementación:** 10 de Diciembre, 2025
**Estado:** ✅ Completado y funcional
