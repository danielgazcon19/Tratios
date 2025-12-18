"""
Utilidades para generación y validación de API Keys

Las API Keys se generan con formato seguro y se almacenan hasheadas con bcrypt.
Nunca se almacena la clave en texto plano en la base de datos.
"""
import secrets
import bcrypt
from typing import Tuple

def generar_api_key() -> str:
    """
    Genera una API key segura y aleatoria.
    
    Formato: 43 caracteres URL-safe base64 (258 bits de entropía)
    Incluye: A-Z, a-z, 0-9, guión (-) y guión bajo (_)
    Ejemplo: 8nK3_mQ-xZ5vL2pW9hR4jT7sC1dF6gY0eB3aU8iO5nM
    
    Returns:
        str: API key en formato base64 URL-safe
    """
    return secrets.token_urlsafe(32)  # 32 bytes = ~43 caracteres base64 URL-safe


def hashear_api_key(api_key: str) -> str:
    """
    Hashea una API key usando bcrypt.
    
    Args:
        api_key: La API key en texto plano
    
    Returns:
        str: Hash bcrypt de la API key (almacenable en BD)
    """
    # Codificar a bytes
    api_key_bytes = api_key.encode('utf-8')
    
    # Generar salt y hashear (rounds=12 para balance seguridad/performance)
    salt = bcrypt.gensalt(rounds=12)
    api_key_hash = bcrypt.hashpw(api_key_bytes, salt)
    
    # Retornar como string para almacenar en DB
    return api_key_hash.decode('utf-8')


def verificar_api_key(api_key: str, api_key_hash: str) -> bool:
    """
    Verifica si una API key coincide con su hash almacenado.
    
    Args:
        api_key: La API key en texto plano recibida en el request
        api_key_hash: El hash almacenado en la base de datos
    
    Returns:
        bool: True si la API key es válida, False en caso contrario
    """
    try:
        api_key_bytes = api_key.encode('utf-8')
        api_key_hash_bytes = api_key_hash.encode('utf-8')
        return bcrypt.checkpw(api_key_bytes, api_key_hash_bytes)
    except Exception:
        # Si hay cualquier error en la verificación (encoding, formato, etc.)
        return False


def generar_api_key_con_hash() -> Tuple[str, str]:
    """
    Genera una API key y su hash en una sola operación.
    
    Útil para crear nuevas API keys: el texto plano se muestra al usuario
    UNA SOLA VEZ y el hash se almacena en la base de datos.
    
    Returns:
        tuple[str, str]: (api_key_plano, api_key_hash)
    """
    api_key_plano = generar_api_key()
    api_key_hash = hashear_api_key(api_key_plano)
    return api_key_plano, api_key_hash
