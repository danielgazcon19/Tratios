"""
Script de prueba para el servicio de envío de emails OTP.
Ejecutar desde el directorio backend: python scripts/test_email_service.py
"""
import sys
import os

# Agregar el directorio padre al path para importar módulos
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
from utils.otp_email_service import OTPEmailService

# Cargar variables de entorno
load_dotenv()

def test_email_configuration():
    """Prueba la configuración SMTP."""
    print("=" * 60)
    print("PRUEBA DE CONFIGURACIÓN SMTP")
    print("=" * 60)
    
    print(f"SMTP Server: {OTPEmailService.SMTP_SERVER}")
    print(f"SMTP Port: {OTPEmailService.SMTP_PORT}")
    print(f"SMTP Username: {OTPEmailService.SMTP_USERNAME}")
    print(f"SMTP Password: {'*' * len(OTPEmailService.SMTP_PASSWORD) if OTPEmailService.SMTP_PASSWORD else 'NO CONFIGURADO'}")
    print(f"Sender Email: {OTPEmailService.SENDER_EMAIL}")
    print(f"Sender Name: {OTPEmailService.SENDER_NAME}")
    print()
    
    if not OTPEmailService.SMTP_USERNAME or not OTPEmailService.SMTP_PASSWORD:
        print("❌ ERROR: Configuración SMTP incompleta")
        return False
    
    print("✅ Configuración SMTP completa")
    return True


def test_send_email():
    """Prueba el envío de un email de prueba."""
    print("=" * 60)
    print("PRUEBA DE ENVÍO DE EMAIL")
    print("=" * 60)
    
    # Email de prueba (cambiar por tu email real para probar)
    test_email = input("Ingresa el email de destino para la prueba: ").strip()
    
    if not test_email or '@' not in test_email:
        print("❌ Email inválido")
        return False
    
    print(f"\n📧 Generando código OTP y enviando a: {test_email}")
    
    # Generar y enviar código
    success, error_message = OTPEmailService.generate_and_send_code(
        recipient_email=test_email,
        user_name="Usuario de Prueba",
        purpose='password_reset',
        expires_minutes=10
    )
    
    if success:
        print("✅ Email enviado exitosamente!")
        print(f"   Revisa la bandeja de entrada de {test_email}")
        print("   También revisa la carpeta de spam si no lo encuentras.")
        
        # Mostrar tiempo restante
        remaining = OTPEmailService.get_remaining_time(test_email, 'password_reset')
        if remaining:
            print(f"   Código válido por {remaining} segundos")
        
        return True
    else:
        print(f"❌ Error al enviar email: {error_message}")
        return False


def test_code_verification():
    """Prueba la verificación de código."""
    print("\n" + "=" * 60)
    print("PRUEBA DE VERIFICACIÓN DE CÓDIGO")
    print("=" * 60)
    
    test_email = input("Ingresa el email usado en la prueba anterior: ").strip()
    
    if not OTPEmailService.has_active_code(test_email, 'password_reset'):
        print("❌ No hay código activo para este email")
        return False
    
    remaining = OTPEmailService.get_remaining_time(test_email, 'password_reset')
    print(f"⏱️  Código activo. Tiempo restante: {remaining} segundos")
    
    code = input("Ingresa el código recibido por email: ").strip()
    
    is_valid = OTPEmailService.verify_code(test_email, code, 'password_reset')
    
    if is_valid:
        print("✅ Código verificado correctamente!")
        return True
    else:
        print("❌ Código inválido o expirado")
        return False


def main():
    """Ejecuta todas las pruebas."""
    print("\n" + "🧪 " * 30)
    print("TEST DEL SERVICIO DE EMAIL OTP")
    print("🧪 " * 30 + "\n")
    
    # 1. Verificar configuración
    if not test_email_configuration():
        print("\n❌ Abortando pruebas: configuración incompleta")
        return
    
    # 2. Probar envío
    print("\n")
    if not test_send_email():
        print("\n❌ Abortando pruebas: error al enviar email")
        return
    
    # 3. Probar verificación
    print("\n")
    if input("\n¿Deseas probar la verificación del código? (s/n): ").lower() == 's':
        test_code_verification()
    
    print("\n" + "=" * 60)
    print("PRUEBAS COMPLETADAS")
    print("=" * 60)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Pruebas interrumpidas por el usuario")
    except Exception as e:
        print(f"\n\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()
