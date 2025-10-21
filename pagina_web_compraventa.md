# Requisitos para el Sistema Web de Ofrecimiento del Aplicativo Compraventa

## 🌐 Objetivo del Sistema
Construir un sitio web institucional que permita ofrecer el aplicativo de Compraventa OroSoft como servicio SaaS (Software as a Service). Este sistema tendrá:

- Página principal de presentación del software.
- Módulo de suscripción para nuevos clientes.
- Control de servicios activos por cliente/empresa.
- Panel administrativo para gestión de suscripciones y servicios.
- Exposición de APIs que serán consumidas por el aplicativo de Compraventa.

---

## 🧱 Arquitectura General

### Frontend
- **Framework:** Angular 17+
- **Estilos:** Tailwind CSS (preferido).
- **Diseño:** Estilo moderno, minimalista con colores claros, grises y sombras suaves.
- **Responsive:** Adaptable para escritorio, tablet y móvil.
- **Autenticación:** Módulo de login/register para administradores y clientes.
- **Rutas públicas:**
  - `/` Inicio (landing)
  - `/funcionalidades`
  - `/precios`
  - `/acerca-de`
  - `/preguntas`
  - `/login`, `/registro`


### Backend
- **Lenguaje:** Python
- **Framework:** Flask
- **Base de Datos:** MySQL 8+
- **ORM:** SQLAlchemy o raw SQL (según preferencia del equipo)
- **Seguridad:** JWT para autenticación y autorización
- **APIs REST:** Se expondrán endpoints para consumo del frontend y del sistema Compraventa
- **Gestión de suscripciones:** CRUD de servicios, control de pagos, vencimientos y validaciones

---

## 🗂️ Módulos del Frontend

### 1. Página de Inicio
- Banner atractivo con CTA (Call to Action)
- Beneficios del sistema
- Testimonios (opcional)
- CTA para suscribirse o pedir demo

### 2. Funcionalidades
- Detalle de módulos del sistema de compraventa (contratos, inventario, remates, reportes, CRM, etc.)
- Ilustraciones o diagramas por funcionalidad

### 3. Precios
- Tabla con los planes (Básico, Pro, Empresarial)
- Cada plan muestra:
  - Precio mensual/anual
  - Servicios incluidos
- Botón de "Suscribirse"
#### 3.1 Planes
- **Básico:**
  - Precio mensual: $249.900
  - Precio anual: $2.700.000
  - Servicios incluidos:
    - Gestión de contratos
    - Gestion Entregas
    - Gestion de Devoluciones
    - Gestión de inventario
    - Gestión de remates
    - Reportes básicos
    - Notificaciones
    - Conexiones Multiusuario

- **Pro:**
  - Precio mensual: $390.000
  - Precio anual: $4.200.000
  - Servicios incluidos:
    - Todo lo del Plan Basico
    - Gestion de Caja
    - Reportes avanzados y Constructor de Reportes
    - CRM avanzado
    - Gestion de Infracciones(Black List)
    - Pasarela de Pagos

- 

### 4. Registro/Suscripción
- Formulario con datos de contacto y empresa
- Plan seleccionado
- Integración con pasarela de pagos (fase 2)
- Confirmación por correo

### 5. Panel Administrativo (Dashboard)
- Ver clientes registrados
- Servicios activos/inactivos
- Control de pagos, fechas de renovación
- Generación de códigos/licencias/API Keys por cliente

---

## 🧩 Backend: Endpoints y Modelos sugeridos

### Modelos principales
- `Usuario`: nombre, email, contraseña hash, rol
- `Empresa`: nombre, contacto, NIT, plan, estado
- `Plan`: nombre, descripción, activo, precio_mensual, precio_anual,
- `Servicio`: nombre, descripción, activo, url_api (opcional), id_plan
- `Suscripcion`: empresa_id, id_plan, fecha_inicio, fecha_fin, estado, forma_pago
- `LogAcceso`: fecha, empresa_id, tipo_evento, ip

### Endpoints públicos
- `POST /api/registro`
- `POST /api/login`
- `GET /api/planes`
- `POST /api/suscripcion`

### Endpoints protegidos (admin/clientes)
- `GET /api/empresa/:id`
- `GET /api/servicios`
- `GET /api/suscripciones`
- `PUT /api/suscripcion/:id`
- `POST /api/verificar-licencia`

### Endpoint consumido por el sistema Compraventa
- `POST /api/verificar-servicios-activos`
  - Entrada: token o id_empresa
  - Salida: JSON con servicios habilitados

---

## 🎨 Estilo Visual (Frontend)
- **Paleta base:**
  - Blanco (#ffffff)
  - Gris Claro (#f9fafb)
  - Gris Medio (#d1d5db)
  - Gris Oscuro (#374151)
  - Azul tenue (#3b82f6)

- **Tipografía:** Inter, Roboto o similar
- **Sombra:** Suave para tarjetas y botones (`shadow-md` / `shadow-lg`)
- **Componentes recomendados:** Tailwind UI, shadcn/ui, CoreUI adaptado

---

## 🚀 Recomendaciones Finales
- Separar claramente lógica de negocio y presentación
- Exponer una API para validación de suscripciones en tiempo real
- Documentar los endpoints (Swagger o Redoc)
- Utilizar migraciones para gestión de base de datos (`Flask-Migrate` o `Alembic`)
- Establecer logs y monitoreo básico del backend
- Contenerizar la aplicación con Docker compose para facilidad de despliegue

---

## 📅 Fecha de generación
2025-08-07 18:17:19
