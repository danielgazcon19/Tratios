# Instalación de Angular CDK para Drag & Drop

## Componentes Creados

Se han creado 3 nuevos módulos CRUD para el panel administrativo:

### 1. **Admin Planes** (`/admin/planes`)
- ✅ Crear planes
- ✅ Listar planes
- ✅ Editar planes
- ✅ Eliminar planes

### 2. **Admin Servicios** (`/admin/servicios`)
- ✅ Crear servicios
- ✅ Listar servicios con filtro (activos/inactivos)
- ✅ Editar servicios
- ✅ Activar/Desactivar servicios (toggle)
- ✅ Eliminar servicios

### 3. **Admin Plan-Servicios** (`/admin/plan-servicios`)
- ✅ Panel innovador con **Drag & Drop**
- ✅ Asociar servicios a planes arrastrando y soltando
- ✅ Eliminar servicios de planes
- ✅ Vista visual con cards de planes y lista de servicios disponibles

---

## 📦 Instalación Requerida

Para que el componente de **Drag & Drop** funcione, necesitas instalar **Angular CDK**:

```bash
cd frontend
npm install @angular/cdk
```

---

## 🚀 Cómo Probar

### 1. **Iniciar Backend**
```bash
cd backend
python app.py
```

### 2. **Iniciar Frontend**
```bash
cd frontend
npm install @angular/cdk  # Solo la primera vez
npm run start -- --open --port 4201
```

### 3. **Navegar a:**
- **Planes:** http://localhost:4201/admin/planes
- **Servicios:** http://localhost:4201/admin/servicios
- **Asociar:** http://localhost:4201/admin/plan-servicios

---

## 🎨 Características del Drag & Drop

### Panel Innovador:
- **Lado Izquierdo:** Lista de servicios disponibles (sticky panel)
- **Lado Derecho:** Cards de planes donde puedes soltar servicios
- **Animaciones suaves** al arrastrar y soltar
- **Feedback visual** con placeholders y preview
- **Los servicios se pueden repetir** entre planes (múltiples asociaciones)

### Funcionalidades:
1. **Arrastrar** un servicio desde el panel izquierdo
2. **Soltar** sobre un plan para asociarlo
3. **Click en ×** para eliminar un servicio de un plan
4. **Instrucciones visuales** en la parte inferior

---

## 📋 Endpoints Backend Disponibles

### Planes:
- `GET /admin/planes` - Listar planes
- `POST /admin/planes` - Crear plan
- `PUT /admin/planes/:id` - Actualizar plan
- `DELETE /admin/planes/:id` - Eliminar plan

### Servicios:
- `GET /admin/servicios` - Listar servicios
- `POST /admin/servicios` - Crear servicio
- `PUT /admin/servicios/:id` - Actualizar servicio
- `POST /admin/servicios/:id/toggle` - Activar/Desactivar
- `DELETE /admin/servicios/:id` - Eliminar servicio

### Asociación Plan-Servicios:
- `GET /admin/planes/:id/servicios` - Obtener servicios de un plan
- `POST /admin/planes/:id/servicios` - Asociar múltiples servicios
- `POST /admin/planes/:id/servicios/:servicio_id` - Agregar un servicio
- `DELETE /admin/planes/:id/servicios/:servicio_id` - Eliminar servicio
- `GET /admin/planes-servicios/resumen` - Resumen completo

---

## 🔐 Seguridad

Todos los endpoints están protegidos con:
- `@admin_required` decorator
- Solo usuarios con rol 'admin' pueden acceder
- JWT token validation

---

## 📁 Estructura de Archivos Creados

### Backend:
```
backend/routes/
├── admin_planes.py
├── admin_servicios.py
└── admin_plan_servicios.py
```

### Frontend:
```
frontend/src/app/
├── services/
│   ├── admin-planes.service.ts
│   ├── admin-servicios.service.ts
│   └── admin-plan-servicios.service.ts
└── pages/admin/
    ├── admin-planes/
    │   ├── admin-planes.component.ts
    │   ├── admin-planes.component.html
    │   └── admin-planes.component.css
    ├── admin-servicios/
    │   ├── admin-servicios.component.ts
    │   ├── admin-servicios.component.html
    │   └── admin-servicios.component.css
    └── admin-plan-servicios/
        ├── admin-plan-servicios.component.ts
        ├── admin-plan-servicios.component.html
        └── admin-plan-servicios.component.css
```

---

## ✨ Próximos Pasos

1. Instalar Angular CDK: `npm install @angular/cdk`
2. Probar crear planes en `/admin/planes`
3. Probar crear servicios en `/admin/servicios`
4. Probar asociar servicios a planes en `/admin/plan-servicios` (**¡El más innovador!**)

---

## 🎯 Notas Importantes

- Los servicios pueden estar en múltiples planes
- Los servicios inactivos no aparecen en el panel de asociación
- El drag & drop tiene animaciones suaves y feedback visual
- La navegación está actualizada en todos los componentes admin
- Todos los formularios tienen validación
- SweetAlert2 para confirmaciones y mensajes

---

¡Disfruta del nuevo panel administrativo! 🚀
