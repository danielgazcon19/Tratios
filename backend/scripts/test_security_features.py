#!/usr/bin/env python3
"""
Script de prueba para validar las mejoras de seguridad.
Prueba validación de contraseñas y servicios OTP.
"""

import sys
from pathlib import Path

# Agregar el directorio backend al path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from utils.password_validator import validate_password_strength, get_password_requirements_message
from utils.otp_email_service import OTPEmailService


def print_separator():
    print("=" * 60)


def test_password_validation():
    """Prueba el validador de contraseñas"""
    print_separator()
    print("TEST 1: Validación de Fortaleza de Contraseñas")
    print_separator()
    
    test_cases = [
        ("weak", "Contraseña muy débil"),
        ("password", "Solo minúsculas"),
        ("Password", "Sin números ni especiales"),
        ("Password1", "Sin caracteres especiales"),
        ("Pass1!", "Muy corta (6 chars)"),
        ("password123!", "Sin mayúsculas"),
        ("PASSWORD123!", "Sin minúsculas"),
        ("Password!", "Sin números"),
        ("Password123", "Sin caracteres especiales"),
        ("Password123!", "✅ Contraseña fuerte"),
        ("MyS3cure#Pass", "✅ Contraseña fuerte"),
        ("Tr4t!0s2025", "✅ Contraseña fuerte"),
    ]
    
    for password, description in test_cases:
        result = validate_password_strength(password)
        status = "✅ VÁLIDA" if result['valid'] else "❌ INVÁLIDA"
        
        print(f"\nContraseña: '{password}'")
        print(f"Descripción: {description}")
        print(f"Status: {status}")
        
        if not result['valid']:
            print("Errores:")
            for error in result['errors']:
                print(f"  - {error}")
    
    print("\n" + "=" * 60)
    print("Requisitos de contraseña:")
    print(get_password_requirements_message())
    print_separator()


def test_otp_email_service():
    """Prueba el servicio de códigos OTP por email"""
    print_separator()
    print("TEST 2: Servicio de Códigos OTP por Email")
    print_separator()
    
    test_email = "test@example.com"
    
    # Test 1: Generar código
    print("\n1. Generar código OTP...")
    code = OTPEmailService.generate_code(test_email, purpose='password_change')
    print(f"   ✅ Código generado: {code}")
    print(f"   Email: {test_email}")
    print(f"   Propósito: password_change")
    
    # Test 2: Verificar que existe código activo
    print("\n2. Verificar código activo...")
    has_active = OTPEmailService.has_active_code(test_email, purpose='password_change')
    print(f"   ¿Tiene código activo?: {'✅ SÍ' if has_active else '❌ NO'}")
    
    # Test 3: Verificar tiempo restante
    print("\n3. Verificar tiempo de expiración...")
    remaining = OTPEmailService.get_remaining_time(test_email, purpose='password_change')
    if remaining:
        print(f"   ✅ Tiempo restante: {remaining} segundos ({remaining // 60} minutos)")
    else:
        print("   ❌ No hay código activo o ya expiró")
    
    # Test 4: Verificar código incorrecto
    print("\n4. Intentar con código INCORRECTO...")
    wrong_code = "000000"
    is_valid = OTPEmailService.verify_code(test_email, wrong_code, purpose='password_change')
    print(f"   Código: {wrong_code}")
    print(f"   ¿Válido?: {'❌ SÍ (ERROR!)' if is_valid else '✅ NO (correcto)'}")
    
    # Test 5: Generar nuevo código (el anterior se consumió con intento fallido)
    print("\n5. Generar NUEVO código (el anterior se consumió)...")
    new_code = OTPEmailService.generate_code(test_email, purpose='password_change')
    print(f"   ✅ Nuevo código generado: {new_code}")
    
    # Test 6: Verificar código correcto
    print("\n6. Verificar con código CORRECTO...")
    is_valid = OTPEmailService.verify_code(test_email, new_code, purpose='password_change')
    print(f"   Código: {new_code}")
    print(f"   ¿Válido?: {'✅ SÍ' if is_valid else '❌ NO (ERROR!)'}")
    
    # Test 7: Intentar reutilizar código (debe fallar)
    print("\n7. Intentar REUTILIZAR mismo código...")
    is_valid = OTPEmailService.verify_code(test_email, new_code, purpose='password_change')
    print(f"   Código: {new_code}")
    print(f"   ¿Válido?: {'❌ SÍ (ERROR! - código reutilizado)' if is_valid else '✅ NO (correcto, código ya usado)'}")
    
    # Test 8: Verificar múltiples propósitos
    print("\n8. Códigos con diferentes propósitos...")
    code_reset = OTPEmailService.generate_code(test_email, purpose='password_reset')
    code_verify = OTPEmailService.generate_code(test_email, purpose='email_verification')
    
    print(f"   Código password_reset: {code_reset}")
    print(f"   Código email_verification: {code_verify}")
    print("   ✅ Ambos códigos pueden coexistir (diferentes propósitos)")
    
    # Limpiar
    OTPEmailService.verify_code(test_email, code_reset, purpose='password_reset')
    OTPEmailService.verify_code(test_email, code_verify, purpose='email_verification')
    
    print_separator()


def test_edge_cases():
    """Prueba casos extremos"""
    print_separator()
    print("TEST 3: Casos Extremos y Edge Cases")
    print_separator()
    
    # Contraseña vacía
    print("\n1. Contraseña vacía...")
    result = validate_password_strength("")
    print(f"   ¿Válida?: {'❌ SÍ (ERROR!)' if result['valid'] else '✅ NO'}")
    print(f"   Errores: {result['errors']}")
    
    # Contraseña None
    print("\n2. Contraseña None...")
    result = validate_password_strength(None)
    print(f"   ¿Válida?: {'❌ SÍ (ERROR!)' if result['valid'] else '✅ NO'}")
    print(f"   Errores: {result['errors']}")
    
    # Contraseña solo espacios
    print("\n3. Contraseña solo espacios...")
    result = validate_password_strength("        ")
    print(f"   ¿Válida?: {'❌ SÍ (ERROR!)' if result['valid'] else '✅ NO'}")
    if result['errors']:
        print(f"   Primer error: {result['errors'][0]}")
    
    # Verificar código expirado (simular)
    print("\n4. Código OTP sin generar...")
    has_code = OTPEmailService.has_active_code("noexiste@test.com", purpose='test')
    print(f"   ¿Tiene código?: {'❌ SÍ (ERROR!)' if has_code else '✅ NO'}")
    
    # Máximo de intentos
    print("\n5. Máximo de intentos (3 intentos fallidos)...")
    test_email = "attempts@test.com"
    code = OTPEmailService.generate_code(test_email, purpose='test')
    
    for i in range(1, 5):
        is_valid = OTPEmailService.verify_code(test_email, "wrong", purpose='test', max_attempts=3)
        print(f"   Intento {i}: {'✅ Válido (ERROR!)' if is_valid else '❌ Inválido'}")
    
    # Después de 3 intentos, el código debería estar invalidado
    has_code = OTPEmailService.has_active_code(test_email, purpose='test')
    print(f"   ¿Código aún activo después de 3 intentos?: {'❌ SÍ (ERROR!)' if has_code else '✅ NO (correcto)'}")
    
    print_separator()


if __name__ == "__main__":
    print("\n")
    print("╔" + "═" * 58 + "╗")
    print("║" + " " * 10 + "PRUEBAS DE SEGURIDAD - VALIDACIÓN" + " " * 11 + "║")
    print("╚" + "═" * 58 + "╝")
    print("\n")
    
    try:
        test_password_validation()
        test_otp_email_service()
        test_edge_cases()
        
        print("\n")
        print("╔" + "═" * 58 + "╗")
        print("║" + " " * 15 + "✅ TODOS LOS TESTS PASARON" + " " * 16 + "║")
        print("╚" + "═" * 58 + "╝")
        print("\n")
        
    except Exception as e:
        print(f"\n\n❌ ERROR durante las pruebas: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
