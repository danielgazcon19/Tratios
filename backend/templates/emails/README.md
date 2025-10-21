# Plantillas de Email

Este directorio contiene las plantillas HTML para los emails del sistema.

## 📁 Estructura

```
templates/emails/
├── README.md           # Este archivo
└── otp_code.html       # Plantilla para códigos OTP de verificación
```

## 📧 Plantillas Disponibles

### `otp_code.html`
**Propósito:** Email con código de verificación OTP (6 dígitos)

**Variables soportadas:**
- `{{ greeting }}` - Saludo personalizado (ej: "Hola Juan,")
- `{{ subject_text }}` - Descripción del propósito (ej: "cambio de contraseña")
- `{{ code }}` - Código OTP de 6 dígitos
- `{{ action_text }}` - Acción a realizar (ej: "cambiar tu contraseña")

**Usos:**
- Cambio de contraseña sin 2FA
- Verificación de email
- Recuperación de cuenta
- Verificación de identidad

**Ejemplo de uso en código:**
```python
from utils.otp_email_service import OTPEmailService

# Generar y enviar código
success, error = OTPEmailService.generate_and_send_code(
    recipient_email="usuario@ejemplo.com",
    user_name="Juan Pérez",
    purpose='password_change',
    expires_minutes=10
)
```

## 🎨 Diseño

### Características:
- ✅ **Responsive**: Se adapta a móvil y desktop
- ✅ **Moderno**: Gradiente azul-morado en header
- ✅ **Accesible**: Colores de alto contraste
- ✅ **Profesional**: Diseño limpio y corporativo

### Colores principales:
- Header: `linear-gradient(135deg, #3b82f6, #8b5cf6)`
- Código: `#3b82f6` (azul)
- Advertencia: `#ffc107` (amarillo)
- Texto: `#333` (gris oscuro)

## 🔧 Personalización

### Cambiar colores del header:
```css
.header {
    background: linear-gradient(135deg, #TU_COLOR_1, #TU_COLOR_2);
}
```

### Cambiar tamaño del código:
```css
.code {
    font-size: 40px;        /* Default: 32px */
    letter-spacing: 10px;   /* Default: 8px */
}
```

### Agregar logo:
```html
<div class="header">
    <img src="https://tu-dominio.com/logo.png" alt="Logo" style="height: 50px; margin-bottom: 10px;">
    <h1>🔐 Tratios Compraventa</h1>
</div>
```

## 🧪 Testing

### Preview sin enviar email:
```bash
cd backend
python scripts/preview_email_template.py
```

Esto genera un archivo HTML que puedes abrir en el navegador para ver el diseño.

### Probar envío real:
```bash
cd backend
python scripts/test_email_service.py
```

Esto envía un email de prueba real a la dirección que especifiques.

## 📱 Responsive Design

La plantilla está optimizada para:
- 📧 **Clientes de email**: Gmail, Outlook, Apple Mail, etc.
- 📱 **Móvil**: iPhone, Android
- 💻 **Desktop**: Todos los navegadores modernos

### Breakpoints:
```css
@media only screen and (max-width: 600px) {
    /* Ajustes para móvil */
}
```

## ⚡ Performance

### Tamaño del HTML:
- **Sin comprimir**: ~4 KB
- **Con CSS inline**: Óptimo para clientes de email
- **Sin imágenes externas**: Carga instantánea

### Compatibilidad:
- ✅ Gmail (web, iOS, Android)
- ✅ Outlook (2016+, web, iOS, Android)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ ProtonMail

## 🔐 Seguridad

### Best Practices:
- ✅ No incluir enlaces externos sospechosos
- ✅ Usar HTTPS para todas las imágenes
- ✅ No solicitar información sensible en el email
- ✅ Incluir advertencia de "no compartir el código"

### Variables sanitizadas:
Todas las variables se insertan como texto plano (sin HTML), previniendo XSS.

## 📚 Recursos

### Herramientas útiles:
- **Litmus**: Testing en múltiples clientes de email
- **Email on Acid**: Testing y validación
- **Can I Email**: Soporte de CSS en clientes de email
- **Mailtrap**: Testing de emails en desarrollo

### Referencias de diseño:
- [Really Good Emails](https://reallygoodemails.com/)
- [Milled](https://milled.com/)
- [Email Love](http://emaillove.com/)

## 🚀 Próximas Plantillas

Plantillas planeadas para el futuro:
- [ ] `welcome.html` - Email de bienvenida
- [ ] `password_reset.html` - Reset de contraseña completo
- [ ] `subscription_confirmed.html` - Confirmación de suscripción
- [ ] `invoice.html` - Factura de compra
- [ ] `notification.html` - Notificaciones generales

## 💡 Tips

### 1. Previsualiza siempre antes de enviar:
```bash
python scripts/preview_email_template.py
```

### 2. Prueba en diferentes dispositivos:
- Desktop: Chrome, Firefox, Safari
- Móvil: iOS, Android
- Email: Gmail app, Outlook app

### 3. Mantén el diseño simple:
- Menos es más en emails
- Evita JavaScript (no funciona en la mayoría de clientes)
- Usa CSS inline para máxima compatibilidad

### 4. Texto alternativo siempre:
Incluye versión de texto plano para clientes que no soportan HTML.

---

**Última actualización:** 18 de Octubre, 2025  
**Mantenedor:** Equipo de Desarrollo Tratios
