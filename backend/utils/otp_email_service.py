"""
Servicio para generar y verificar códigos OTP de un solo uso (por email).
Estos códigos son temporales y se almacenan en la sesión del usuario.
"""
import secrets
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional, Dict
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash


class OTPEmailService:
    """
    Servicio para gestionar códigos OTP enviados por email.
    Almacena códigos temporales con expiración.
    """
    
    # Almacenamiento temporal en memoria (en producción usar Redis/cache)
    _active_codes: Dict[str, Dict] = {}
    
    # Configuración SMTP desde variables de entorno
    SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    SENDER_EMAIL = os.getenv('SENDER_EMAIL', '')
    SENDER_NAME = os.getenv('SENDER_NAME', 'Tratios Compraventa')
    
    # Ruta a las plantillas de email
    TEMPLATES_DIR = Path(__file__).parent.parent / 'templates' / 'emails'
    
    @classmethod
    def _load_email_template(cls, template_name: str) -> str:
        """
        Carga una plantilla HTML desde el directorio de templates.
        
        Args:
            template_name: Nombre del archivo de plantilla (ej: 'otp_code.html')
            
        Returns:
            Contenido de la plantilla como string
        """
        template_path = cls.TEMPLATES_DIR / template_name
        
        if not template_path.exists():
            raise FileNotFoundError(f"Plantilla de email no encontrada: {template_path}")
        
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    @classmethod
    def _render_template(cls, template_content: str, **kwargs) -> str:
        """
        Renderiza una plantilla reemplazando variables {{ variable }}.
        
        Args:
            template_content: Contenido de la plantilla
            **kwargs: Variables a reemplazar en la plantilla
            
        Returns:
            Plantilla renderizada
        """
        result = template_content
        for key, value in kwargs.items():
            placeholder = f"{{{{ {key} }}}}"
            result = result.replace(placeholder, str(value))
        return result
    
    @classmethod
    def generate_code(cls, email: str, purpose: str = 'password_reset', length: int = 6, expires_minutes: int = 10) -> str:
        """
        Genera un código OTP numérico y lo almacena temporalmente.
        
        Args:
            email: Email del usuario
            purpose: Propósito del código ('password_reset', 'email_verification', etc.)
            length: Longitud del código (default: 6 dígitos)
            expires_minutes: Minutos hasta expiración (default: 10)
            
        Returns:
            Código OTP generado (plaintext para enviar por email)
        """
        # Generar código numérico aleatorio
        code = ''.join(str(secrets.randbelow(10)) for _ in range(length))
        
        # Crear clave única
        key = f"{email.lower()}:{purpose}"
        
        # Almacenar código hasheado con timestamp de expiración
        cls._active_codes[key] = {
            'code_hash': generate_password_hash(code),
            'expires_at': datetime.utcnow() + timedelta(minutes=expires_minutes),
            'attempts': 0
        }
        
        return code
    
    @classmethod
    def verify_code(cls, email: str, code: str, purpose: str = 'password_reset', max_attempts: int = 3) -> bool:
        """
        Verifica un código OTP.
        
        Args:
            email: Email del usuario
            code: Código a verificar
            purpose: Propósito del código
            max_attempts: Máximo de intentos permitidos
            
        Returns:
            True si el código es válido, False en caso contrario
        """
        key = f"{email.lower()}:{purpose}"
        
        if key not in cls._active_codes:
            return False
        
        stored = cls._active_codes[key]
        
        # Verificar expiración
        if datetime.utcnow() > stored['expires_at']:
            cls._invalidate_code(email, purpose)
            return False
        
        # Verificar intentos
        if stored['attempts'] >= max_attempts:
            cls._invalidate_code(email, purpose)
            return False
        
        # Incrementar intentos
        stored['attempts'] += 1
        
        # Verificar código
        is_valid = check_password_hash(stored['code_hash'], code)
        
        if is_valid:
            # Código válido: invalidar para que no se pueda reutilizar
            cls._invalidate_code(email, purpose)
        
        return is_valid
    
    @classmethod
    def _invalidate_code(cls, email: str, purpose: str) -> None:
        """Invalida un código OTP."""
        key = f"{email.lower()}:{purpose}"
        if key in cls._active_codes:
            del cls._active_codes[key]
    
    @classmethod
    def has_active_code(cls, email: str, purpose: str = 'password_reset') -> bool:
        """
        Verifica si existe un código activo (no expirado) para un usuario.
        
        Returns:
            True si existe un código activo, False en caso contrario
        """
        key = f"{email.lower()}:{purpose}"
        
        if key not in cls._active_codes:
            return False
        
        stored = cls._active_codes[key]
        
        # Verificar si expiró
        if datetime.utcnow() > stored['expires_at']:
            cls._invalidate_code(email, purpose)
            return False
        
        return True
    
    @classmethod
    def get_remaining_time(cls, email: str, purpose: str = 'password_reset') -> Optional[int]:
        """
        Obtiene los segundos restantes para que expire un código.
        
        Returns:
            Segundos restantes, o None si no hay código activo
        """
        key = f"{email.lower()}:{purpose}"
        
        if key not in cls._active_codes:
            return None
        
        stored = cls._active_codes[key]
        remaining = (stored['expires_at'] - datetime.utcnow()).total_seconds()
        
        if remaining <= 0:
            cls._invalidate_code(email, purpose)
            return None
        
        return int(remaining)
    
    @classmethod
    def send_otp_email(cls, recipient_email: str, code: str, user_name: str = None, purpose: str = 'password_reset') -> bool:
        """
        Envía un código OTP por email usando plantilla HTML externa.
        
        Args:
            recipient_email: Email del destinatario
            code: Código OTP a enviar
            user_name: Nombre del usuario (opcional)
            purpose: Propósito del código ('password_reset', 'email_verification', etc.)
            
        Returns:
            True si el email se envió correctamente, False en caso contrario
        """
        try:
            # Validar configuración SMTP
            if not cls.SMTP_USERNAME or not cls.SMTP_PASSWORD or not cls.SENDER_EMAIL:
                print("ERROR: Configuración SMTP incompleta en variables de entorno")
                return False
            
            # Crear mensaje
            message = MIMEMultipart('alternative')
            message['From'] = f"{cls.SENDER_NAME} <{cls.SENDER_EMAIL}>"
            message['To'] = recipient_email
            
            # Personalizar asunto y contenido según el propósito
            if purpose == 'password_reset' or purpose == 'password_change':
                message['Subject'] = '🔐 Código de verificación para cambio de contraseña'
                subject_text = 'cambio de contraseña'
                action_text = 'cambiar tu contraseña'
            elif purpose == 'email_verification':
                message['Subject'] = '✉️ Verifica tu correo electrónico'
                subject_text = 'verificación de email'
                action_text = 'verificar tu correo'
            else:
                message['Subject'] = '🔑 Código de verificación'
                subject_text = 'verificación'
                action_text = 'completar la verificación'
            
            # Saludo personalizado
            greeting = f"Hola {user_name}," if user_name else "Hola,"
            
            # Texto plano (versión simple para clientes que no soportan HTML)
            text_content = f"""
{greeting}

Has solicitado un código de verificación para {subject_text} en Tratios Compraventa.

Tu código de verificación es: {code}

Este código es válido por 10 minutos y solo puede usarse una vez.

Si no solicitaste este código, puedes ignorar este mensaje.

Saludos,
El equipo de Tratios Compraventa
"""
            
            # Cargar y renderizar plantilla HTML
            try:
                template = cls._load_email_template('otp_code.html')
                html_content = cls._render_template(
                    template,
                    greeting=greeting,
                    subject_text=subject_text,
                    code=code,
                    action_text=action_text
                )
            except Exception as template_error:
                print(f"⚠️  Error cargando plantilla HTML: {template_error}")
                # Fallback: usar HTML simple si falla la plantilla
                html_content = f"""
                <html>
                    <body style="font-family: Arial, sans-serif;">
                        <p>{greeting}</p>
                        <p>Tu código de verificación es: <strong style="font-size: 24px;">{code}</strong></p>
                        <p>Válido por 10 minutos.</p>
                    </body>
                </html>
                """
            
            # Adjuntar ambas versiones (texto y HTML)
            text_part = MIMEText(text_content, 'plain', 'utf-8')
            html_part = MIMEText(html_content, 'html', 'utf-8')
            
            message.attach(text_part)
            message.attach(html_part)
            
            # Enviar email
            with smtplib.SMTP(cls.SMTP_SERVER, cls.SMTP_PORT) as server:
                server.starttls()  # Habilitar TLS
                server.login(cls.SMTP_USERNAME, cls.SMTP_PASSWORD)
                server.send_message(message)
            
            print(f"✅ Email enviado exitosamente a {recipient_email}")
            return True
            
        except smtplib.SMTPAuthenticationError:
            print(f"❌ Error de autenticación SMTP. Verifica las credenciales.")
            return False
        except smtplib.SMTPException as e:
            print(f"❌ Error SMTP al enviar email: {e}")
            return False
        except Exception as e:
            print(f"❌ Error inesperado al enviar email: {e}")
            return False
    
    @classmethod
    def generate_and_send_code(cls, recipient_email: str, user_name: str = None, purpose: str = 'password_reset', expires_minutes: int = 10) -> tuple[bool, Optional[str]]:
        """
        Genera un código OTP y lo envía por email (método todo-en-uno).
        
        Args:
            recipient_email: Email del destinatario
            user_name: Nombre del usuario (opcional)
            purpose: Propósito del código
            expires_minutes: Minutos hasta expiración
            
        Returns:
            Tupla (éxito: bool, mensaje_error: Optional[str])
        """
        # Verificar si ya existe un código activo
        if cls.has_active_code(recipient_email, purpose):
            remaining = cls.get_remaining_time(recipient_email, purpose)
            return False, f"Ya existe un código activo. Espera {remaining} segundos antes de solicitar uno nuevo."
        
        # Generar código
        code = cls.generate_code(recipient_email, purpose, expires_minutes=expires_minutes)
        
        # Enviar email
        email_sent = cls.send_otp_email(recipient_email, code, user_name, purpose)
        
        if not email_sent:
            # Si falla el envío, invalidar el código generado
            cls._invalidate_code(recipient_email, purpose)
            return False, "Error al enviar el email. Por favor, intenta nuevamente más tarde."
        
        return True, None
