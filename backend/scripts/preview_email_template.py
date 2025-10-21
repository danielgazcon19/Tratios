"""
Script para previsualizar la plantilla HTML del email OTP.
Genera un archivo HTML que se puede abrir en el navegador para ver el diseño.

Ejecutar: python scripts/preview_email_template.py
"""
import sys
import os
from pathlib import Path

# Agregar el directorio padre al path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.otp_email_service import OTPEmailService

def preview_template():
    """Genera un preview HTML de la plantilla de email."""
    print("=" * 60)
    print("PREVIEW DE PLANTILLA DE EMAIL OTP")
    print("=" * 60)
    
    try:
        # Cargar plantilla
        print("\n📄 Cargando plantilla otp_code.html...")
        template = OTPEmailService._load_email_template('otp_code.html')
        print("✅ Plantilla cargada correctamente")
        
        # Datos de prueba
        test_data = {
            'greeting': 'Hola Juan Pérez,',
            'subject_text': 'cambio de contraseña',
            'code': '123456',
            'action_text': 'cambiar tu contraseña'
        }
        
        # Renderizar plantilla
        print("\n🎨 Renderizando plantilla con datos de prueba...")
        html_content = OTPEmailService._render_template(template, **test_data)
        print("✅ Plantilla renderizada correctamente")
        
        # Guardar en archivo
        output_file = Path(__file__).parent / 'preview_email.html'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"\n✅ Preview guardado en: {output_file}")
        print("\n📂 Abre el archivo en tu navegador para ver el diseño:")
        print(f"   {output_file.absolute()}")
        
        # Información adicional
        print("\n" + "=" * 60)
        print("DATOS DE PRUEBA USADOS:")
        print("=" * 60)
        for key, value in test_data.items():
            print(f"  {key}: {value}")
        
        print("\n" + "=" * 60)
        print("PRÓXIMOS PASOS:")
        print("=" * 60)
        print("1. Abre preview_email.html en tu navegador")
        print("2. Revisa el diseño en desktop y móvil (DevTools)")
        print("3. Edita templates/emails/otp_code.html si necesitas cambios")
        print("4. Ejecuta este script nuevamente para ver los cambios")
        
        return True
        
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 Verifica que exista el archivo:")
        print(f"   backend/templates/emails/otp_code.html")
        return False
        
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        return False


def preview_with_custom_data():
    """Genera preview con datos personalizados."""
    print("\n" + "=" * 60)
    print("PREVIEW PERSONALIZADO")
    print("=" * 60)
    
    print("\nIngresa datos personalizados (Enter para usar valores por defecto):\n")
    
    name = input("Nombre del usuario (default: Usuario): ").strip() or "Usuario"
    purpose = input("Propósito (default: cambio de contraseña): ").strip() or "cambio de contraseña"
    code = input("Código OTP (default: 123456): ").strip() or "123456"
    action = input("Acción (default: cambiar tu contraseña): ").strip() or "cambiar tu contraseña"
    
    greeting = f"Hola {name}," if name != "Usuario" else "Hola,"
    
    try:
        template = OTPEmailService._load_email_template('otp_code.html')
        html_content = OTPEmailService._render_template(
            template,
            greeting=greeting,
            subject_text=purpose,
            code=code,
            action_text=action
        )
        
        output_file = Path(__file__).parent / 'preview_email_custom.html'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"\n✅ Preview personalizado guardado en: {output_file}")
        print(f"   {output_file.absolute()}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False


def main():
    """Menú principal."""
    print("\n" + "🎨 " * 30)
    print("PREVIEW DE PLANTILLAS DE EMAIL")
    print("🎨 " * 30 + "\n")
    
    print("Opciones:")
    print("1. Preview con datos de prueba estándar")
    print("2. Preview con datos personalizados")
    print("3. Ambos")
    print("4. Salir")
    
    choice = input("\nElige una opción (1-4): ").strip()
    
    if choice == '1':
        preview_template()
    elif choice == '2':
        preview_with_custom_data()
    elif choice == '3':
        preview_template()
        print("\n")
        preview_with_custom_data()
    elif choice == '4':
        print("\n👋 ¡Hasta luego!")
    else:
        print("\n⚠️  Opción inválida")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Operación cancelada por el usuario")
    except Exception as e:
        print(f"\n\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()
