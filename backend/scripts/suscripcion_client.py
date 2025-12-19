"""
Cliente de ejemplo para consumir el endpoint de suscripciones.
Este módulo puede ser usado en otros servicios/microservicios de tu aplicativo SaaS.

Ejemplo de uso:
    from suscripcion_client import SuscripcionClient
    
    client = SuscripcionClient(
        base_url='http://localhost:5000',
        api_key='tu-api-key'
    )
    
    # Obtener suscripción de una empresa
    suscripcion = client.obtener_suscripcion(empresa_id=1)
    
    # Verificar si tiene un servicio específico
    if client.tiene_servicio(empresa_id=1, servicio='Facturación Electrónica'):
        # Permitir acceso al servicio
        pass
"""

import requests
from typing import Optional, Dict, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class SuscripcionAPIError(Exception):
    """Excepción personalizada para errores de la API de suscripciones"""
    def __init__(self, message: str, status_code: int = None, error_code: str = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(self.message)


class SuscripcionClient:
    """
    Cliente para interactuar con el endpoint de suscripciones activas.
    
    Attributes:
        base_url (str): URL base del servicio de suscripciones
        api_key (str): API Key para autenticación
        timeout (int): Timeout para las peticiones HTTP (segundos)
    """
    
    def __init__(self, base_url: str, api_key: str, timeout: int = 10):
        """
        Inicializa el cliente de suscripciones.
        
        Args:
            base_url: URL base del servicio (ej: 'http://localhost:5000')
            api_key: API Key para autenticación
            timeout: Timeout para las peticiones (default: 10 segundos)
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        })
    
    def obtener_suscripcion(self, empresa_id: int) -> Optional[Dict]:
        """
        Obtiene la suscripción activa de una empresa.
        
        Args:
            empresa_id: ID de la empresa a consultar
            
        Returns:
            Dict con la información completa de la suscripción, o None si no tiene suscripción activa
            
        Raises:
            SuscripcionAPIError: Si hay un error en la petición
        """
        url = f"{self.base_url}/api/suscripcion-activa/{empresa_id}"
        
        try:
            response = self._session.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Suscripción obtenida exitosamente para empresa {empresa_id}")
                return data
            
            elif response.status_code == 404:
                error_data = response.json()
                logger.warning(f"Empresa {empresa_id} no encontrada")
                raise SuscripcionAPIError(
                    message=error_data.get('message', 'Empresa no encontrada'),
                    status_code=404,
                    error_code=error_data.get('error')
                )
            
            elif response.status_code in (401, 403):
                error_data = response.json()
                logger.error(f"Error de autenticación: {error_data.get('message')}")
                raise SuscripcionAPIError(
                    message=error_data.get('message', 'Error de autenticación'),
                    status_code=response.status_code,
                    error_code=error_data.get('error')
                )
            
            else:
                error_data = response.json()
                logger.error(f"Error en la petición: {response.status_code}")
                raise SuscripcionAPIError(
                    message=error_data.get('message', 'Error en la petición'),
                    status_code=response.status_code,
                    error_code=error_data.get('error')
                )
                
        except requests.exceptions.Timeout:
            logger.error(f"Timeout al consultar suscripción para empresa {empresa_id}")
            raise SuscripcionAPIError("Timeout en la petición", status_code=None)
        
        except requests.exceptions.ConnectionError:
            logger.error(f"Error de conexión al servidor de suscripciones")
            raise SuscripcionAPIError("No se pudo conectar al servidor", status_code=None)
        
        except SuscripcionAPIError:
            raise
        
        except Exception as e:
            logger.exception(f"Error inesperado: {e}")
            raise SuscripcionAPIError(f"Error inesperado: {str(e)}")
    
    def tiene_suscripcion_activa(self, empresa_id: int) -> bool:
        """
        Verifica si una empresa tiene una suscripción activa.
        
        Args:
            empresa_id: ID de la empresa
            
        Returns:
            True si tiene suscripción activa, False en caso contrario
        """
        try:
            data = self.obtener_suscripcion(empresa_id)
            return data.get('tiene_suscripcion_activa', False) if data else False
        except SuscripcionAPIError as e:
            if e.status_code == 404:
                return False
            raise
    
    def obtener_servicios(self, empresa_id: int) -> List[Dict]:
        """
        Obtiene la lista de servicios activos de una empresa.
        
        Args:
            empresa_id: ID de la empresa
            
        Returns:
            Lista de servicios activos
        """
        try:
            data = self.obtener_suscripcion(empresa_id)
            return data.get('servicios', []) if data else []
        except SuscripcionAPIError as e:
            if e.status_code == 404:
                return []
            raise
    
    def tiene_servicio(self, empresa_id: int, nombre_servicio: str) -> bool:
        """
        Verifica si una empresa tiene acceso a un servicio específico.
        
        Args:
            empresa_id: ID de la empresa
            nombre_servicio: Nombre del servicio a verificar
            
        Returns:
            True si tiene acceso al servicio, False en caso contrario
        """
        servicios = self.obtener_servicios(empresa_id)
        return any(
            s['nombre'].lower() == nombre_servicio.lower() 
            for s in servicios
        )
    
    def obtener_plan(self, empresa_id: int) -> Optional[Dict]:
        """
        Obtiene el plan activo de una empresa.
        
        Args:
            empresa_id: ID de la empresa
            
        Returns:
            Dict con la información del plan, o None si no tiene plan activo
        """
        try:
            data = self.obtener_suscripcion(empresa_id)
            return data.get('plan') if data else None
        except SuscripcionAPIError as e:
            if e.status_code == 404:
                return None
            raise
    
    def obtener_fecha_vencimiento(self, empresa_id: int) -> Optional[datetime]:
        """
        Obtiene la fecha de vencimiento de la suscripción de una empresa.
        
        Args:
            empresa_id: ID de la empresa
            
        Returns:
            datetime con la fecha de vencimiento, o None si no tiene suscripción
        """
        try:
            data = self.obtener_suscripcion(empresa_id)
            if data and data.get('suscripcion'):
                fecha_fin = data['suscripcion'].get('fecha_fin')
                if fecha_fin:
                    return datetime.fromisoformat(fecha_fin)
            return None
        except SuscripcionAPIError as e:
            if e.status_code == 404:
                return None
            raise
    
    def dias_hasta_vencimiento(self, empresa_id: int) -> Optional[int]:
        """
        Calcula los días restantes hasta el vencimiento de la suscripción.
        
        Args:
            empresa_id: ID de la empresa
            
        Returns:
            Número de días hasta el vencimiento, o None si no tiene suscripción
        """
        fecha_vencimiento = self.obtener_fecha_vencimiento(empresa_id)
        if fecha_vencimiento:
            dias = (fecha_vencimiento - datetime.now()).days
            return dias
        return None
    
    def suscripcion_por_vencer(self, empresa_id: int, dias_umbral: int = 7) -> bool:
        """
        Verifica si la suscripción está por vencer.
        
        Args:
            empresa_id: ID de la empresa
            dias_umbral: Número de días antes del vencimiento (default: 7)
            
        Returns:
            True si la suscripción vence en menos de 'dias_umbral' días
        """
        dias = self.dias_hasta_vencimiento(empresa_id)
        if dias is not None:
            return 0 <= dias <= dias_umbral
        return False
    
    def cerrar(self):
        """Cierra la sesión HTTP"""
        self._session.close()
    
    def __enter__(self):
        """Soporte para context manager"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Soporte para context manager"""
        self.cerrar()


# Ejemplo de uso
if __name__ == '__main__':
    import os
    from dotenv import load_dotenv
    
    # Configurar logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Cargar configuración
    load_dotenv()
    
    # IMPORTANTE: Las API Keys ahora se gestionan desde la base de datos
    # Para obtener una API Key:
    # 1. Inicia sesión como admin en la aplicación web
    # 2. Ve a Admin > API Keys
    # 3. Crea una nueva API Key con scope 'licencias' (código: licencias)
    # 4. Copia la API Key generada y úsala aquí
    
    # Crear cliente
    client = SuscripcionClient(
        base_url=os.getenv('BASE_URL', 'http://localhost:5000'),
        api_key='tu-api-key-aqui'  # Reemplazar con API Key generada desde el admin panel
    )
    
    # Ejemplo de uso
    empresa_id = 1
    
    try:
        # Verificar suscripción activa
        if client.tiene_suscripcion_activa(empresa_id):
            print(f"✓ Empresa {empresa_id} tiene suscripción activa")
            
            # Obtener plan
            plan = client.obtener_plan(empresa_id)
            print(f"  Plan: {plan['nombre']}")
            
            # Obtener servicios
            servicios = client.obtener_servicios(empresa_id)
            print(f"  Servicios activos: {len(servicios)}")
            for servicio in servicios:
                print(f"    - {servicio['nombre']}")
            
            # Verificar servicio específico
            if client.tiene_servicio(empresa_id, 'Facturación Electrónica'):
                print("  ✓ Tiene acceso a Facturación Electrónica")
            
            # Verificar vencimiento
            dias = client.dias_hasta_vencimiento(empresa_id)
            if dias is not None:
                print(f"  Días hasta vencimiento: {dias}")
                
                if client.suscripcion_por_vencer(empresa_id):
                    print("  ⚠ Suscripción próxima a vencer")
        else:
            print(f"✗ Empresa {empresa_id} NO tiene suscripción activa")
            
    except SuscripcionAPIError as e:
        print(f"Error: {e.message} (Código: {e.error_code})")
    
    finally:
        client.cerrar()
