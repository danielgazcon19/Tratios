"""
Validador de fortaleza de contraseñas.
"""
import re
from typing import Dict, List


def validate_password_strength(password: str) -> Dict[str, any]:
    """
    Valida la fortaleza de una contraseña según criterios de seguridad.
    
    Requisitos:
    - Mínimo 8 caracteres
    - Al menos una letra mayúscula
    - Al menos una letra minúscula
    - Al menos un número
    - Al menos un carácter especial
    
    Args:
        password: Contraseña a validar
        
    Returns:
        Dict con 'valid' (bool) y 'errors' (List[str])
    """
    errors: List[str] = []
    
    if not password:
        return {
            'valid': False,
            'errors': ['La contraseña es requerida']
        }
    
    # Mínimo 8 caracteres
    if len(password) < 8:
        errors.append('La contraseña debe tener al menos 8 caracteres')
    
    # Al menos una mayúscula
    if not re.search(r'[A-Z]', password):
        errors.append('La contraseña debe incluir al menos una letra mayúscula')
    
    # Al menos una minúscula
    if not re.search(r'[a-z]', password):
        errors.append('La contraseña debe incluir al menos una letra minúscula')
    
    # Al menos un número
    if not re.search(r'\d', password):
        errors.append('La contraseña debe incluir al menos un número')
    
    # Al menos un carácter especial
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', password):
        errors.append('La contraseña debe incluir al menos un carácter especial (!@#$%^&*() etc.)')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }


def get_password_requirements_message() -> str:
    """
    Retorna un mensaje descriptivo de los requisitos de contraseña.
    """
    return (
        "La contraseña debe cumplir los siguientes requisitos: "
        "mínimo 8 caracteres, al menos una letra mayúscula, "
        "una letra minúscula, un número y un carácter especial (!@#$%^&*() etc.)"
    )
