# 🚀 Inicio Rápido - Sistema de Emails OTP

## ⚡ Quick Start (3 pasos)

### 1️⃣ **Verificar Configuración**
```bash
cd backend
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('✅ SMTP OK' if os.getenv('SMTP_USERNAME') else '❌ Falta config')"
```

### 2️⃣ **Preview de Plantilla**
```bash
python scripts/preview_email_template.py
# Opción 1 → Ver preview_email.html en navegador
```

### 3️⃣ **Probar Envío Real**
```bash
python scripts/test_email_service.py
# Ingresa tu email → Revisa bandeja de entrada
```

---

## 📋 Comandos Útiles

### Ver preview sin enviar:
```bash
cd backend
python scripts/preview_email_template.py
```

### Probar envío completo:
```bash
cd backend
python scripts/test_email_service.py
```

### Iniciar servidores (desarrollo):
```bash
# Terminal 1 - Backend
cd backend
python app.py

# Terminal 2 - Frontend
cd frontend
npm start
```

---

## 🔧 Archivos Importantes

| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| **Plantilla HTML** | `backend/templates/emails/otp_code.html` | Email OTP |
| **Servicio OTP** | `backend/utils/otp_email_service.py` | Lógica de negocio |
| **Configuración SMTP** | `backend/.env` | Credenciales Gmail |
| **Endpoint cambio password** | `backend/routes/account.py` | API |

---

## 🎯 Flujo de Usuario

1. Usuario va a `/cuenta` → Seguridad
2. Click "Cambiar contraseña"
3. Si NO tiene 2FA → Click "Solicitar código"
4. Recibe email con código de 6 dígitos
5. Ingresa código + nueva contraseña
6. ✅ Contraseña actualizada

---

## 🐛 Troubleshooting

### Email no llega:
```bash
# 1. Verificar config SMTP
grep SMTP backend/.env

# 2. Revisar logs
tail -f backend/logs/app.log

# 3. Probar autenticación
python -c "import smtplib; s=smtplib.SMTP('smtp.gmail.com',587); s.starttls(); s.login('TU_EMAIL','TU_APP_PASSWORD'); print('✅ OK')"
```

### Error "App Password":
1. Ir a https://myaccount.google.com/apppasswords
2. Generar nueva contraseña para "Correo"
3. Actualizar `SMTP_PASSWORD` en `.env`

---

**Última actualización:** 18 de Octubre, 2025
