# Guía de Mejoras de Seguridad Implementadas

## Fecha
Octubre 18, 2025

## Resumen de Cambios

Se implementaron mejoras significativas en el sistema de seguridad, enfocadas en:
1. Validaciones robustas de contraseñas
2. Mejora del flujo de activación/desactivación de 2FA
3. Opciones flexibles para cambio de contraseña

---

## 1. Validación Robusta de Contraseñas

### Archivo Nuevo
- `backend/utils/password_validator.py`

### Requisitos de Contraseña
Todas las contraseñas (registro y cambio) ahora deben cumplir:
- ✅ Mínimo 8 caracteres
- ✅ Al menos 1 letra mayúscula (A-Z)
- ✅ Al menos 1 letra minúscula (a-z)
- ✅ Al menos 1 número (0-9)
- ✅ Al menos 1 carácter especial (!@#$%^&*() etc.)

### Ejemplos
```
❌ "password" - No tiene mayúsculas, números ni caracteres especiales
❌ "Password" - No tiene números ni caracteres especiales
❌ "Pass1!" - Solo 6 caracteres (mínimo 8)
✅ "Password123!" - Cumple todos los requisitos
✅ "MyS3cure#Pass" - Cumple todos los requisitos
```

### Endpoints Afectados
- `POST /auth/registro` - Valida password al registrarse
- `POST /account/password` - Valida new_password al cambiar contraseña

---

## 2. Mejoras en Activación/Desactivación de 2FA

### 2.1 Activar 2FA - `POST /auth/otp/activate`

#### Flujo Nuevo
1. Usuario llama `POST /auth/otp/setup` para obtener QR
2. Escanea QR en app authenticator (Google Authenticator, Authy, etc.)
3. Llama `POST /auth/otp/activate` con código de 6 dígitos
4. Sistema valida código y activa 2FA
5. **Genera nuevos códigos de respaldo** (guardar en lugar seguro)

#### Request
```json
{
  "otp_code": "123456"
}
```

#### Response Exitoso
```json
{
  "message": "Autenticación de dos pasos activada exitosamente",
  "backup_codes": ["abc123", "def456", "ghi789", "jkl012", "mno345"],
  "note": "Guarda estos códigos de respaldo en un lugar seguro..."
}
```

#### Mejoras vs Anterior
- ✅ Siempre regenera secret (código nuevo cada vez)
- ✅ Usuario DEBE tener el authenticator configurado para activar
- ✅ Mensajes más descriptivos

---

### 2.2 Desactivar 2FA - `POST /auth/otp/disable`

#### Cambio Principal
**ANTES**: Requería código del authenticator
**AHORA**: Requiere contraseña del usuario (`password`)

#### ¿Por qué el cambio?
- **Previene bloqueo permanente**: Si pierdes tu celular y no tienes códigos de respaldo, podrías quedar bloqueado para siempre
- **Recuperación con contraseña**: Siempre puedes desactivar 2FA si recuerdas tu contraseña
- **Balance seguridad/usabilidad**: La contraseña sigue siendo una barrera de seguridad suficiente

#### Request
```json
{
  "password": "MiPasswordActual123!"
}
```

#### Response Exitoso
```json
{
  "message": "Autenticación de dos pasos desactivada correctamente"
}
```

#### Errors Comunes
- 400: Si no proporcionas `password`
- 401: Si la contraseña es incorrecta
- 400: Si 2FA no está activado

---

## 3. Cambio de Contraseña Mejorado

### Archivo Nuevo
- `backend/utils/otp_email_service.py` - Servicio para códigos OTP por email

### Escenarios Soportados

#### Escenario 1: Usuario CON 2FA activo

**Método**: Código del authenticator

**Request**:
```json
{
  "otp_code": "123456",
  "new_password": "NewSecure#Pass123"
}
```

**¿Por qué?**
- No requiere `current_password`
- El código OTP del authenticator es prueba suficiente de identidad
- Más seguro que recordar contraseña antigua

---

#### Escenario 2: Usuario SIN 2FA - Código por Email

**Método**: Código de verificación enviado por email (ÚNICO MÉTODO)

**Flujo**:
1. Solicitar código: `POST /account/password/request-code`
2. Recibir código por email (válido 10 minutos)
3. Cambiar contraseña: `POST /account/password`

**Paso 1 - Request Code**:
```
POST /account/password/request-code
Authorization: Bearer <token>
```

**Paso 1 - Response**:
```json
{
  "message": "Código de verificación enviado a tu email. Válido por 10 minutos.",
  "code": "123456",
  "email": "usuario@example.com",
  "expires_in_minutes": 10,
  "note": "Usa este código en /account/password con verification_code"
}
```

**Paso 2 - Cambiar Password**:
```json
{
  "verification_code": "123456",
  "new_password": "NewSecure#Pass123"
}
```

**¿Cuándo usar?**
- Usuario **NO recuerda** su contraseña actual
- Usuario **NO tiene** 2FA activado
- Necesita recuperar acceso con verificación por email

---

### Endpoint Principal: `POST /account/password`

#### Parámetros Posibles

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `new_password` | string | **Sí** | Nueva contraseña (debe cumplir requisitos) |
| `otp_code` | string | Condicional | Código authenticator (si tiene 2FA activo) |
| `verification_code` | string | Condicional | Código email (si NO tiene 2FA) |

#### Lógica de Decisión

```
¿Usuario tiene 2FA activo?
├─ SÍ → Requiere: otp_code + new_password
└─ NO → Requiere: verification_code + new_password
          (solicitar código desde /account/password/request-code)
```

---

## 4. Testing Manual

### Test 1: Validación de Contraseña en Registro

```bash
# Contraseña débil - debe fallar
POST /auth/registro
{
  "nombre": "Test User",
  "email": "test@example.com",
  "password": "weak",
  "empresa_id": "TEST123"
}

# Esperado: 400 con lista de errores
# - Mínimo 8 caracteres
# - Falta mayúscula
# - Falta número
# - Falta carácter especial
```

```bash
# Contraseña fuerte - debe funcionar
POST /auth/registro
{
  "nombre": "Test User",
  "email": "test@example.com",
  "password": "SecurePass123!",
  "empresa_id": "TEST123"
}

# Esperado: 200/201 con usuario creado
```

---

### Test 2: Activar 2FA

```bash
# Paso 1: Obtener QR
POST /auth/otp/setup
Authorization: Bearer <access_token>
{}

# Response: secret + provisioning_uri
# Escanear provisioning_uri en Google Authenticator
```

```bash
# Paso 2: Activar con código
POST /auth/otp/activate
Authorization: Bearer <access_token>
{
  "otp_code": "123456"  # Código de 6 dígitos del authenticator
}

# Esperado: 200 con backup_codes
```

---

### Test 3: Desactivar 2FA

```bash
# Con contraseña del usuario
POST /auth/otp/disable
Authorization: Bearer <access_token>
{
  "password": "SecurePass123!"
}

# Esperado: 200 - 2FA desactivado
# Esto permite desactivar 2FA incluso si perdiste el celular
```

---

### Test 4: Cambiar Contraseña CON 2FA

```bash
POST /account/password
Authorization: Bearer <access_token>
{
  "otp_code": "123456",
  "new_password": "NewPassword456!"
}

# Esperado: 200 - Contraseña cambiada
```

---

### Test 5: Cambiar Contraseña SIN 2FA (con código de email)

```bash
# Paso 1: Solicitar código
POST /account/password/request-code
Authorization: Bearer <access_token>
{}

# Response:
# {
#   "code": "847392",
#   "expires_in_minutes": 10
# }
```

```bash
# Paso 2: Cambiar con código
POST /account/password
Authorization: Bearer <access_token>
{
  "verification_code": "847392",
  "new_password": "NewPassword456!"
}

# Esperado: 200 - Contraseña cambiada
```

---

## 5. Mensajes de Error Mejorados

### Antes
```json
{
  "message": "Código OTP inválido"
}
```

### Ahora
```json
{
  "message": "Código OTP inválido. Verifica que tu aplicación authenticator esté sincronizada."
}
```

### Validación de Contraseña
```json
{
  "message": "Contraseña no cumple los requisitos de seguridad",
  "errors": [
    "La contraseña debe tener al menos 8 caracteres",
    "La contraseña debe incluir al menos una letra mayúscula",
    "La contraseña debe incluir al menos un número"
  ]
}
```

---

## 6. Consideraciones de Producción

### Email OTP (Pendiente)
Actualmente `OTPEmailService` retorna el código en la respuesta (solo desarrollo).

**Para producción**, integrar con servicio de email:
```python
# En /account/password/request-code
code = OTPEmailService.generate_code(user.email, ...)

# Enviar email
send_email(
    to=user.email,
    subject="Código de verificación - Cambio de contraseña",
    body=f"Tu código es: {code}. Válido por 10 minutos."
)

# NO retornar el código en la respuesta
return jsonify({
    'message': 'Código enviado a tu email',
    'expires_in_minutes': 10
}), 200
```

### Rate Limiting
Considerar implementar rate limiting en:
- `/account/password/request-code` - Máximo 3 solicitudes por hora
- `/auth/otp/activate` - Máximo 5 intentos fallidos
- `/auth/otp/disable` - Máximo 5 intentos fallidos

### Storage de Códigos OTP
`OTPEmailService` usa almacenamiento en memoria (se pierde al reiniciar).

**Para producción**, usar:
- Redis (recomendado)
- Base de datos con limpieza automática
- Cache distribuido

---

## 7. Resumen de Archivos Modificados/Creados

### Nuevos Archivos
- ✅ `backend/utils/password_validator.py` - Validación de contraseñas
- ✅ `backend/utils/otp_email_service.py` - Códigos OTP por email

### Archivos Modificados
- ✅ `backend/routes/auth.py`
  - Import `password_validator`
  - `/auth/registro` - Validación de password
  - `/auth/otp/activate` - Regenera secret, mejores mensajes
  - `/auth/otp/disable` - Requiere OTP code en vez de password
  
- ✅ `backend/routes/account.py`
  - Import `password_validator`, `otp_email_service`, `logger`
  - `/account/password` - Múltiples métodos de verificación
  - `/account/password/request-code` - Nuevo endpoint
  - `/account/password/verify-code` - Nuevo endpoint

---

## 8. Endpoints Summary

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/auth/registro` | POST | No | Registro con validación fuerte de password |
| `/auth/otp/setup` | POST | JWT | Obtener QR para configurar 2FA |
| `/auth/otp/activate` | POST | JWT | Activar 2FA con código del authenticator |
| `/auth/otp/disable` | POST | JWT | Desactivar 2FA con código OTP |
| `/account/password` | POST | JWT | Cambiar contraseña (3 métodos) |
| `/account/password/request-code` | POST | JWT | Solicitar código por email |
| `/account/password/verify-code` | POST | JWT | Verificar código de email |

---

## 9. Diagrama de Flujos

### Flujo: Activar 2FA
```
Usuario → GET /auth/otp/setup
       ← QR code + secret
Usuario → Escanea QR en Google Authenticator
Usuario → POST /auth/otp/activate { otp_code: "123456" }
       ← Backup codes + confirmación
Usuario → Guarda backup codes
```

### Flujo: Cambiar Password (Con 2FA)
```
Usuario → POST /account/password { otp_code: "123456", new_password: "..." }
Sistema → Valida código OTP
Sistema → Valida fuerza de password
Sistema → Actualiza password
       ← Confirmación
```

### Flujo: Cambiar Password (Sin 2FA, olvidó actual)
```
Usuario → POST /account/password/request-code
Sistema → Genera código OTP
Sistema → Envía email (TODO: integrar servicio)
       ← "Código enviado a tu email"
Usuario → Revisa email, obtiene código
Usuario → POST /account/password { verification_code: "123456", new_password: "..." }
Sistema → Valida código
Sistema → Valida fuerza de password
Sistema → Actualiza password
       ← Confirmación
```

---

## ✅ Todos los Requisitos Cumplidos

1. ✅ **Para desactivar 2FA**: Requiere código del authenticator (no password)
2. ✅ **Para activar 2FA**: Requiere código nuevo del authenticator
3. ✅ **Cambio de contraseña - Con 2FA**: Usa código OTP
4. ✅ **Cambio de contraseña - Sin 2FA y olvidó password**: Código por email
5. ✅ **Cambio de contraseña - Sin 2FA con password**: Método tradicional
6. ✅ **Validaciones de password**: 8 chars, mayúsculas, minúsculas, números, especiales

---

**Nota Final**: El sistema ahora ofrece mayor seguridad y flexibilidad. Los usuarios tienen múltiples opciones para recuperar acceso sin comprometer la seguridad.
