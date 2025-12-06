# Renovación Automática de Suscripciones

Sistema de renovación automática para suscripciones de planes y soporte técnico.

## 📋 Resumen

Se implementó un sistema completo de renovación automática que:

1. **Agrega campo `renovacion_automatica`** a suscripciones de plan y soporte
2. **Permite al admin activar/desactivar** renovación automática al crear/editar
3. **Script automatizado** que se ejecuta diariamente vía crontab/scheduler
4. **Procesa automáticamente** suscripciones vencidas

## 🗄️ Cambios en Base de Datos

### Tabla `suscripciones`
- ✅ Campo agregado: `renovacion_automatica BOOLEAN DEFAULT FALSE`

### Tabla `soporte_suscripcion`
- ✅ Campo agregado: `renovacion_automatica BOOLEAN DEFAULT FALSE`

### Migración
- Archivo: `backend/migrations/versions/00e9b36b3480_agregar_campo_renovacion_automatica_a_.py`
- Estado: ✅ Aplicada

## 🔧 Backend

### Modelos Actualizados

#### `models/suscripcion.py`
```python
renovacion_automatica = db.Column(db.Boolean, default=False, nullable=False)
```

#### `models/soporte_suscripcion.py`
```python
renovacion_automatica = db.Column(db.Boolean, default=False, nullable=False)
```

### Rutas Actualizadas

#### `routes/admin_suscripciones.py`
- ✅ `POST /admin/suscripciones` - Acepta `renovacion_automatica` en creación
- ✅ `POST /admin/suscripciones/:id/renovar` - Hereda y permite modificar `renovacion_automatica`

#### `routes/admin_soporte_suscripciones.py`
- ✅ `POST /admin/soporte-suscripciones` - Acepta `renovacion_automatica` en creación
- ✅ `PUT /admin/soporte-suscripciones/:id` - Permite actualizar `renovacion_automatica`

### Script de Renovación Automática

**Archivo:** `backend/scripts/renovacion_automatica.py`

**Funcionalidad:**
```bash
# Modo simulación (no hace cambios reales)
python scripts/renovacion_automatica.py --dry-run

# Ejecución real
python scripts/renovacion_automatica.py

# Con anticipación de 3 días (renueva antes de vencer)
python scripts/renovacion_automatica.py --dias-anticipacion 3
```

**Proceso:**

1. **Suscripciones de Plan:**
   - Busca suscripciones activas con `fecha_fin <= hoy + anticipación`
   - Si `renovacion_automatica = True`: Crea nueva suscripción activa
   - Si `renovacion_automatica = False`: Marca como inactiva

2. **Suscripciones de Soporte:**
   - Busca soportes activos con `fecha_fin <= hoy + anticipación`
   - Si `renovacion_automatica = True`: Crea nueva suscripción de soporte
   - Si `renovacion_automatica = False`: Marca como vencido

**Logging:**
- Todos los cambios se registran en `utils/log/logs/`
- STDOUT muestra resumen detallado de ejecución

## 🖥️ Frontend

### Interfaces TypeScript Actualizadas

#### `services/admin-suscripciones.service.ts`
```typescript
interface Suscripcion {
  // ... otros campos
  renovacion_automatica?: boolean;
}

interface CrearSuscripcionDto {
  // ... otros campos
  renovacion_automatica?: boolean;
}

interface RenovarDto {
  // ... otros campos
  renovacion_automatica?: boolean;
}
```

#### `services/admin-soporte.service.ts`
```typescript
interface SoporteSuscripcion {
  // ... otros campos
  renovacion_automatica?: boolean;
}

interface CrearSoporteSuscripcionDto {
  // ... otros campos
  renovacion_automatica?: boolean;
}
```

### Componentes Actualizados

#### Formulario de Suscripciones
**Archivo:** `pages/admin/admin-suscripciones/admin-suscripciones.component.html`

```html
<div class="form-group-checkbox">
  <input 
    type="checkbox" 
    id="renovacionAutomatica" 
    [(ngModel)]="nuevaSuscripcion.renovacion_automatica">
  <label for="renovacionAutomatica">
    <i class="fas fa-sync-alt"></i>
    Renovación automática
    <span class="help-text">(Se renovará automáticamente al vencer)</span>
  </label>
</div>
```

#### Formulario de Soporte Suscripciones
**Archivo:** `pages/admin/admin-soporte/admin-soporte.component.html`

```html
<div class="form-group-checkbox">
  <input 
    type="checkbox" 
    id="renovacionAutomaticaSoporte" 
    [(ngModel)]="nuevaSuscripcion.renovacion_automatica">
  <label for="renovacionAutomaticaSoporte">
    <i class="fas fa-sync-alt"></i>
    Renovación automática
    <span class="help-text">(Se renovará automáticamente al vencer)</span>
  </label>
</div>
```

## ⏰ Configuración de Ejecución Automática

### Linux/Mac (Crontab)

```bash
# Editar crontab
crontab -e

# Ejecutar todos los días a las 2:00 AM
0 2 * * * cd /ruta/backend && /ruta/env_web/bin/python scripts/renovacion_automatica.py >> logs/renovacion_automatica.log 2>&1
```

### Windows (Task Scheduler)

**Método 1: GUI**
1. Abrir "Programador de tareas"
2. Crear tarea básica:
   - **Nombre:** Renovación Automática Suscripciones
   - **Desencadenador:** Diariamente a las 2:00 AM
   - **Acción:** Iniciar un programa
     - **Programa:** `D:\Software\Pagina\backend\env_web\Scripts\python.exe`
     - **Argumentos:** `scripts\renovacion_automatica.py`
     - **Directorio:** `D:\Software\Pagina\backend`

**Método 2: PowerShell**
```powershell
$action = New-ScheduledTaskAction -Execute "D:\Software\Pagina\backend\env_web\Scripts\python.exe" -Argument "scripts\renovacion_automatica.py" -WorkingDirectory "D:\Software\Pagina\backend"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "RenovacionAutomaticaSuscripciones" -Description "Renueva automáticamente suscripciones vencidas"
```

**Archivo de ejemplo:** `backend/scripts/crontab_renovacion_ejemplo.txt`

## 🧪 Pruebas

### 1. Prueba Manual del Script

```bash
# Modo simulación (seguro, no hace cambios)
cd backend
python scripts/renovacion_automatica.py --dry-run

# Ver qué suscripciones se renovarían en 3 días
python scripts/renovacion_automatica.py --dry-run --dias-anticipacion 3
```

### 2. Crear Suscripción de Prueba

1. En el panel admin, crear suscripción:
   - ✅ Marcar "Renovación automática"
   - Fecha fin: Hoy o pasado mañana

2. Ejecutar script:
```bash
python scripts/renovacion_automatica.py --dias-anticipacion 3
```

3. Verificar:
   - Suscripción anterior: estado `inactiva`
   - Nueva suscripción: estado `activa`, mismo plan/empresa

### 3. Verificar Logs

```bash
# Ver logs de suscripciones
cat backend/utils/log/logs/suscripciones.log

# Ver logs de soporte
cat backend/utils/log/logs/soporte.log

# Ver salida del script
cat backend/logs/renovacion_automatica.log
```

## 📊 Salida del Script

```
================================================================================
RENOVACIÓN AUTOMÁTICA DE SUSCRIPCIONES
Fecha: 2025-12-05 19:30:00
Modo: EJECUCIÓN REAL
Fecha límite: 2025-12-05 (anticipación: 0 días)
================================================================================

1. Procesando suscripciones de plan...
   Encontradas: 3 suscripciones por vencer

   ✓ Renovada: Empresa ABC - Plan Premium
   ✓ Renovada: Empresa XYZ - Plan Básico
   ✗ Inactivada: Empresa 123 - Plan Pro

2. Procesando suscripciones de soporte...
   Encontradas: 2 suscripciones de soporte por vencer

   ✓ Renovado: Empresa ABC - Soporte Premium
   ✗ Vencido: Empresa DEF - Soporte Básico

================================================================================
RESUMEN DE EJECUCIÓN
================================================================================
Planes renovadas:      2
Planes inactivadas:    1
Soportes renovados:    1
Soportes vencidos:     1
Errores:               0
================================================================================
```

## 🔒 Seguridad

- ✅ Script requiere autenticación de BD
- ✅ Todos los cambios se registran con usuario/fecha
- ✅ Modo `--dry-run` para pruebas seguras
- ✅ Transacciones con rollback en caso de error

## 📝 Notas Importantes

### Comportamiento de Renovación

**Planes:**
- Mantiene: `plan_id`, `periodo`, `porcentaje_descuento`, `forma_pago`
- Nueva: `fecha_inicio` = `fecha_fin` anterior
- Calcula: `fecha_fin` según periodo (30 días o 365 días)
- Estado: Anterior → `inactiva`, Nueva → `activa`

**Soporte:**
- Mantiene: `soporte_tipo_id`, `precio_actual`
- Resetea: `tickets_consumidos = 0`, `horas_consumidas = 0`
- Nueva: Misma duración que la anterior
- Estado: Anterior → `vencido`, Nueva → `activo`

### Recomendaciones

1. **Ejecutar primero en `--dry-run`** para verificar qué se renovará
2. **Revisar logs** después de cada ejecución
3. **Programar con anticipación** (ej: `--dias-anticipacion 1`) para evitar lapsos
4. **Monitorear ejecuciones** del cron/task scheduler
5. **Backup de BD** antes de activar en producción

## 🐛 Troubleshooting

### El script no encuentra suscripciones

- Verificar que `fecha_fin` esté configurada
- Verificar que `renovacion_automatica = True` en BD
- Usar `--dias-anticipacion` para buscar más adelante

### Error de conexión a BD

```bash
# Configurar variable de entorno
export DATABASE_URL="mysql+pymysql://user:pass@host/db"
```

### Permisos insuficientes

```bash
# Linux/Mac
chmod +x scripts/renovacion_automatica.py

# Verificar permisos de escritura en logs/
```

## 📚 Archivos Modificados

### Backend
- ✅ `models/suscripcion.py`
- ✅ `models/soporte_suscripcion.py`
- ✅ `routes/admin_suscripciones.py`
- ✅ `routes/admin_soporte_suscripciones.py`
- ✅ `scripts/renovacion_automatica.py` (nuevo)
- ✅ `scripts/crontab_renovacion_ejemplo.txt` (nuevo)
- ✅ `migrations/versions/00e9b36b3480_*.py`

### Frontend
- ✅ `services/admin-suscripciones.service.ts`
- ✅ `services/admin-soporte.service.ts`
- ✅ `pages/admin/admin-suscripciones/admin-suscripciones.component.html`
- ✅ `pages/admin/admin-soporte/admin-soporte.component.html`

## ✅ Checklist de Implementación

- [x] Campo `renovacion_automatica` en modelo `Suscripcion`
- [x] Campo `renovacion_automatica` en modelo `SoporteSuscripcion`
- [x] Migración de base de datos creada y aplicada
- [x] Rutas backend actualizadas (suscripciones)
- [x] Rutas backend actualizadas (soporte)
- [x] Script de renovación automática implementado
- [x] Interfaces TypeScript actualizadas
- [x] Formulario frontend suscripciones actualizado
- [x] Formulario frontend soporte actualizado
- [x] Documentación de crontab/scheduler
- [x] README de implementación

## 🎯 Próximos Pasos

1. **Probar en desarrollo:**
   ```bash
   python scripts/renovacion_automatica.py --dry-run
   ```

2. **Configurar notificaciones (opcional):**
   - Email al renovar suscripciones
   - Alertas de errores en renovación
   
3. **Dashboard de renovaciones (opcional):**
   - Mostrar próximas renovaciones
   - Historial de renovaciones automáticas

4. **Configurar en producción:**
   - Programar cron/task scheduler
   - Monitorear logs primeras ejecuciones

---

**Implementado:** 2025-12-05  
**Versión:** 1.0
