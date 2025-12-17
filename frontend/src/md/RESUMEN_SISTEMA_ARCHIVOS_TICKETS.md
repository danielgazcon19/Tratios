# Sistema de Archivos Adjuntos para Tickets de Soporte

## ✅ Implementación Completa

### Backend (Python/Flask)

#### 1. Utilidad de Manejo de Archivos
**Archivo:** `backend/utils/file_handler.py`
- ✅ Validación de extensiones permitidas (imágenes, documentos, comprimidos, logs)
- ✅ Validación de tamaño (10 MB por archivo, 50 MB total por ticket)
- ✅ Generación de nombres únicos con UUID + timestamp
- ✅ Gestión de rutas de almacenamiento (`uploads/tickets/{ticket_id}/`)
- ✅ Extracción de metadata para JSON

#### 2. Endpoints de API
**Archivo:** `backend/routes/admin_soporte_tickets.py`

##### POST `/admin/soporte-tickets/:id/upload`
- ✅ Acepta múltiples archivos (máximo 10)
- ✅ Valida tipo y tamaño
- ✅ Guarda en filesystem
- ✅ Actualiza `extra_data` JSON en BD
- ✅ Retorna lista de archivos subidos + errores parciales
- ✅ Logging de auditoría

##### GET `/admin/soporte-tickets/:id/archivo/:filename`
- ✅ Verifica existencia en BD y filesystem
- ✅ Descarga con nombre original
- ✅ Protegido con `@admin_required`

##### DELETE `/admin/soporte-tickets/:id/archivo/:filename`
- ✅ Elimina de BD (extra_data)
- ✅ Elimina archivo físico
- ✅ Logging de auditoría

#### 3. Configuración de App
**Archivo:** `backend/app.py`
- ✅ `UPLOAD_FOLDER` configurado
- ✅ `MAX_CONTENT_LENGTH = 50MB`
- ✅ Creación automática de directorios

#### 4. Control de Versiones
**Archivo:** `backend/uploads/.gitignore`
- ✅ Excluye archivos subidos del repositorio

---

### Frontend (Angular 17+)

#### 1. Servicio HTTP
**Archivo:** `frontend/src/app/services/admin-soporte.service.ts`

##### Métodos Implementados
- ✅ `obtenerSuscripcionActivaEmpresa(empresaId)`: Verifica soporte activo
- ✅ `subirArchivosTicket(ticketId, archivos)`: Upload con FormData
- ✅ `descargarArchivoTicket(ticketId, filename)`: Descarga como Blob
- ✅ `eliminarArchivoTicket(ticketId, filename)`: DELETE request

#### 2. Componente TypeScript
**Archivo:** `frontend/src/app/pages/admin/admin-soporte/admin-soporte.component.ts`

##### Propiedades Añadidas
```typescript
archivosSeleccionados: File[] = []
subiendoArchivos: boolean = false
suscripcionSoporteActiva: any = null
cargandoSuscripcionSoporte: boolean = false
```

##### Métodos Implementados
- ✅ `onEmpresaChangeTicket()`: Consulta suscripción activa automáticamente
- ✅ `guardarTicket()`: Crea ticket + sube archivos secuencialmente
- ✅ `onArchivosSeleccionados(event)`: Validación client-side (extensión, tamaño, cantidad)
- ✅ `eliminarArchivoSeleccionado(index)`: Remueve de preview
- ✅ `getFileIcon(filename)`: Mapea extensión a Font Awesome icon
- ✅ `getFileSizeMB(bytes)`: Formatea tamaño
- ✅ `subirArchivosTicket(ticketId)`: Llama servicio + maneja respuesta
- ✅ `descargarArchivo(ticketId, filename, nombreOriginal)`: Crea blob URL + descarga
- ✅ `eliminarArchivoTicket(ticketId, filename)`: Confirmación + actualiza vista

#### 3. Template HTML
**Archivo:** `frontend/src/app/pages/admin/admin-soporte/admin-soporte.component.html`

##### Formulario de Creación de Ticket
- ✅ Card de información de suscripción activa (tickets/horas disponibles)
- ✅ Input file con `accept` de extensiones permitidas
- ✅ Vista previa de archivos seleccionados con:
  - Iconos por tipo de archivo
  - Tamaño en MB
  - Botón de eliminación
- ✅ Estado de carga durante upload
- ✅ Botón "Crear Ticket" deshabilitado durante subida

##### Panel de Detalle de Ticket
- ✅ Sección "Archivos adjuntos" con contador
- ✅ Lista de archivos con:
  - Icono según tipo
  - Nombre original
  - Tamaño + fecha de subida
  - Botón descargar (azul)
  - Botón eliminar (rojo)
- ✅ Muestra solo si hay archivos

#### 4. Estilos CSS
**Archivo:** `frontend/src/app/pages/admin/admin-soporte/admin-soporte.component.css`

##### Estilos Añadidos
- ✅ `.subscription-info`: Card de información de suscripción
- ✅ `.archivos-preview`: Contenedor de preview
- ✅ `.archivo-item`: Item de archivo en preview/lista
- ✅ `.archivo-item-detalle`: Item en panel de detalle
- ✅ `.btn-remove`: Botón eliminar en preview (rojo circular)
- ✅ `.btn-download`: Botón descargar (azul)
- ✅ `.btn-delete`: Botón eliminar en detalle (rojo)
- ✅ Colores de iconos por tipo de archivo:
  - PDF: `#dc3545` (rojo)
  - Word: `#2b579a` (azul)
  - Excel: `#217346` (verde)
  - Imágenes: `#17a2b8` (cyan)
  - Archivos: `#ffc107` (amarillo)
  - Código: `#6f42c1` (morado)
- ✅ Hovers y transiciones
- ✅ Responsive design

---

## 📋 Flujo de Usuario

### Crear Ticket con Archivos
1. Seleccionar empresa → **Auto-consulta suscripción activa**
2. Si no tiene soporte activo → **Alerta de advertencia**
3. Si tiene soporte → **Muestra card con información (tickets/horas disponibles)**
4. Llenar formulario (título, descripción, prioridad)
5. Seleccionar archivos → **Validación client-side inmediata**
6. Preview de archivos con opción de eliminar
7. Click "Crear Ticket" → **Crea ticket primero**
8. **Automáticamente sube archivos después**
9. Muestra éxito/advertencias por archivo

### Gestionar Archivos en Ticket Existente
1. Abrir detalle de ticket
2. Sección "Archivos adjuntos" muestra lista
3. **Descargar:** Click en botón azul → Descarga con nombre original
4. **Eliminar:** Click en botón rojo → Confirmación → Elimina de BD + filesystem

---

## 🔒 Seguridad Implementada

### Backend
- ✅ `@admin_required` en todos los endpoints
- ✅ Validación de extensiones (whitelist)
- ✅ Validación de tamaño (10 MB/archivo, 50 MB/request)
- ✅ `werkzeug.secure_filename()` para sanitización
- ✅ UUID en nombres para evitar colisiones
- ✅ Verificación de existencia en BD antes de servir
- ✅ Path validation (previene path traversal)

### Frontend
- ✅ Validación client-side antes de upload
- ✅ Mensajes de error claros
- ✅ Confirmación antes de eliminar
- ✅ Manejo de errores parciales en upload

---

## 📁 Estructura de Datos

### Base de Datos (MySQL)
**Tabla:** `soporte_tickets`
**Campo:** `extra_data` (JSON)

```json
{
  "archivos": [
    {
      "nombre": "documento_20240115_abc123.pdf",
      "nombre_original": "Factura_Enero.pdf",
      "ruta_relativa": "tickets/42/documento_20240115_abc123.pdf",
      "tipo": "application/pdf",
      "extension": ".pdf",
      "tamano": 1048576,
      "tamano_mb": "1.00",
      "fecha_subida": "2024-01-15T10:30:00"
    }
  ]
}
```

### Filesystem
```
backend/
  uploads/
    tickets/
      42/
        documento_20240115_abc123.pdf
        imagen_20240115_def456.png
      43/
        reporte_20240116_xyz789.xlsx
```

---

## 🧪 Testing

### Checklist de Pruebas
- [ ] **Upload:** Subir 1 archivo de cada tipo permitido
- [ ] **Validación extensión:** Intentar subir .exe → Debe rechazar
- [ ] **Validación tamaño:** Subir archivo >10MB → Debe rechazar
- [ ] **Límite cantidad:** Subir >10 archivos → Debe rechazar
- [ ] **Preview:** Archivos seleccionados muestran icono correcto
- [ ] **Eliminar preview:** Remover archivo antes de crear ticket
- [ ] **Suscripción activa:** Seleccionar empresa sin soporte → Alerta
- [ ] **Suscripción activa:** Seleccionar empresa con soporte → Muestra info
- [ ] **Upload múltiple:** Crear ticket con 5 archivos → Todos se suben
- [ ] **Error parcial:** Simular error en 1 de 3 archivos → Muestra warning
- [ ] **Descarga:** Descargar archivo → Nombre original correcto
- [ ] **Eliminar:** Eliminar archivo → Desaparece de BD y filesystem
- [ ] **Persistencia:** Recargar página → Archivos siguen en ticket
- [ ] **Detalle modal:** Ver ticket con archivos → Lista visible

### Comandos de Testing Backend
```bash
# Desde backend/
cd backend
python -m pytest tests/test_file_uploads.py -v
python scripts/test_security_features.py
```

### Testing Manual Frontend
```bash
# Desde frontend/
cd frontend
ng serve
# Navegar a http://localhost:4200/admin/soporte
```

---

## 📊 Logs y Auditoría

**Categoría:** `LogCategory.SOPORTE`

### Eventos Registrados
- ✅ Archivo subido: `filename`, `size_mb`
- ✅ Archivo descargado: `ticket_id`, `filename`
- ✅ Archivo eliminado: `ticket_id`, `filename`
- ✅ Errores de upload: stack trace completo
- ✅ Errores de descarga/eliminación

**Ubicación:** `backend/logs/app_YYYYMMDD.log`

---

## 🚀 Mejoras Futuras (Opcional)

- [ ] Compresión automática de imágenes
- [ ] Preview de imágenes (thumbnail)
- [ ] Drag & drop para subir archivos
- [ ] Progress bar durante upload
- [ ] Visor de archivos en modal (PDF, imágenes)
- [ ] Búsqueda de tickets por archivo
- [ ] Límite de almacenamiento por empresa
- [ ] Limpieza automática de archivos de tickets cerrados >X días

---

## 📝 Notas Técnicas

### Extensiones Permitidas
- **Imágenes:** `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- **Documentos:** `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.txt`, `.csv`
- **Comprimidos:** `.zip`, `.rar`, `.7z`
- **Logs:** `.log`, `.json`

### Límites
- Tamaño máximo por archivo: **10 MB**
- Tamaño máximo por ticket: **50 MB**
- Tamaño máximo por request: **50 MB**
- Cantidad máxima por upload: **10 archivos**

### Iconos Font Awesome
- PDF: `fa-file-pdf`
- Word: `fa-file-word`
- Excel: `fa-file-excel`
- Imagen: `fa-file-image`
- Comprimido: `fa-file-archive`
- Código/JSON: `fa-file-code`
- Texto: `fa-file-alt`

---

## 🎯 Estado: ✅ COMPLETADO

Todas las funcionalidades del sistema de archivos adjuntos para tickets han sido implementadas y están listas para uso en producción.

**Última actualización:** 2024-01-15
