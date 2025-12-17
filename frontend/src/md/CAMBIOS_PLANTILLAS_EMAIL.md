# Refactorización del Servicio de Email OTP - Separación de Plantillas HTML

## 📋 Resumen
Se refactorizó el servicio `OTPEmailService` para separar la lógica de negocio del código HTML de las plantillas de email, siguiendo el principio de separación de responsabilidades.

## 🎯 Objetivo
Mover el HTML embebido en el código Python a un archivo de plantilla externo para:
- ✅ **Mejor mantenibilidad**: Editar el diseño del email sin tocar el código Python
- ✅ **Reutilización**: Usar la misma plantilla para diferentes propósitos
- ✅ **Claridad**: Código Python más limpio y legible
- ✅ **Colaboración**: Diseñadores pueden trabajar en el HTML sin conocer Python

## 📁 Estructura de Archivos

### Nuevos Archivos Creados:

```
backend/
├── templates/
│   └── emails/
│       └── otp_code.html    # 👈 Plantilla HTML del email OTP
└── utils/
    └── otp_email_service.py  # ✅ Refactorizado
```

### Plantilla HTML: `templates/emails/otp_code.html`

**Ubicación:** `D:\Software\Pagina\backend\templates\emails\otp_code.html`

**Características:**
- Diseño responsive (móvil y desktop)
- Gradiente moderno en el header (azul → morado)
- Código resaltado en caja con borde punteado
- Sección de advertencia con ícono de reloj
- Footer con información de la empresa
- Variables de plantilla: `{{ variable }}`

**Variables soportadas:**
- `{{ greeting }}` - Saludo personalizado ("Hola Juan," o "Hola,")
- `{{ subject_text }}` - Propósito del código ("cambio de contraseña", "verificación de email")
- `{{ code }}` - Código OTP de 6 dígitos
- `{{ action_text }}` - Acción a realizar ("cambiar tu contraseña", "verificar tu correo")

## 🔧 Cambios en `otp_email_service.py`

### 1. **Nuevas Importaciones**
```python
from pathlib import Path  # Para manejar rutas de archivos multiplataforma
```

### 2. **Nueva Constante de Clase**
```python
# Ruta a las plantillas de email
TEMPLATES_DIR = Path(__file__).parent.parent / 'templates' / 'emails'
```

### 3. **Nuevo Método: `_load_email_template()`**
Carga una plantilla HTML desde el directorio de templates.

### 4. **Nuevo Método: `_render_template()`**
Renderiza una plantilla reemplazando variables `{{ variable }}`.

### 5. **Método Refactorizado: `send_otp_email()`**

**Antes:** 264 líneas con HTML embebido  
**Ahora:** 80 líneas con HTML externo (reducción del 70%)

## 📊 Comparación

| Aspecto | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Líneas de código | 264 | 80 | -70% |
| HTML en Python | 200+ | 0 | -100% |
| Mantenibilidad | Baja | Alta | ✅ |
| Testabilidad | Difícil | Fácil | ✅ |

## 🧪 Testing

```bash
cd backend
python scripts/test_email_service.py
```

---

**Fecha:** 18 de Octubre, 2025  
**Resultado:** Código más limpio, mantenible y profesional
