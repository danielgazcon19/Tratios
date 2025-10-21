"""
Servicio de localización usando SQLite local.
Proporciona búsqueda de países y ciudades sin dependencias externas.
"""
import gzip
import sqlite3
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from utils.logger import Logger


class LocationService:
    """
    Servicio de localización basado en SQLite local.
    Proporciona acceso rápido a 250 países y 150,000+ ciudades.
    """
    
    def __init__(
        self,
        *,
        cache_ttl_countries: int,
        cache_ttl_cities: int,
        sqlite_db_path: Optional[str] = None,
        cities_archive_path: Optional[str] = None
    ) -> None:
        # Configuración de caché
        self._cache: Dict[Tuple[str, ...], Tuple[float, List[Dict[str, str]]]] = {}
        self._cache_lock = threading.Lock()
        self._cache_ttl_countries = cache_ttl_countries
        self._cache_ttl_cities = cache_ttl_cities
        
        # Rutas de bases de datos SQLite
        self._sqlite_db_path = Path(sqlite_db_path) if sqlite_db_path else None
        self._sqlite_available = False
        
        # Configuración de archivo de ciudades
        self._cities_archive_path = Path(cities_archive_path) if cities_archive_path else None
        self._cities_dir = None
        self._cities_available = False
        
        # Verificar disponibilidad de BD de países
        if self._sqlite_db_path and self._sqlite_db_path.exists():
            self._sqlite_available = True
            Logger.add_to_log("info", f"Base de datos SQLite de países disponible: {self._sqlite_db_path}")
        elif self._sqlite_db_path:
            Logger.add_to_log("warn", f"Base de datos SQLite de países no encontrada: {self._sqlite_db_path}")
        
        # Extraer archivo de ciudades si existe
        if self._cities_archive_path and self._cities_archive_path.exists():
            self._setup_cities_database()
        elif self._cities_archive_path:
            Logger.add_to_log("warn", f"Archivo de ciudades no encontrado: {self._cities_archive_path}")

        # Datos de respaldo mínimos (solo como último recurso)
        self._fallback_countries = [
            {"code": "US", "name": "Estados Unidos"},
            {"code": "CO", "name": "Colombia"},
            {"code": "MX", "name": "México"},
            {"code": "AR", "name": "Argentina"},
            {"code": "ES", "name": "España"},
        ]
        self._fallback_cities = {
            "US": ["New York", "Los Ángeles", "Chicago", "Miami", "San Francisco"],
            "CO": ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena"],
            "MX": ["Ciudad de México", "Guadalajara", "Monterrey", "Puebla", "Tijuana"],
            "AR": ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata"],
            "ES": ["Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao"],
        }

    def _setup_cities_database(self) -> None:
        """Extrae la base de datos de ciudades desde el archivo .gz si es necesario."""
        try:
            self._cities_dir = self._cities_archive_path.parent / "cities"
            self._cities_dir.mkdir(exist_ok=True)
            
            # Verificar si ya está extraído
            extracted_files = list(self._cities_dir.glob("*.sqlite3"))
            if extracted_files:
                self._cities_available = True
                Logger.add_to_log("info", f"Base de datos de ciudades disponible: {len(extracted_files)} archivos encontrados")
                return
            
            # Extraer el archivo .gz
            Logger.add_to_log("info", f"Extrayendo base de datos de ciudades desde: {self._cities_archive_path}")
            
            with gzip.open(self._cities_archive_path, 'rb') as f_in:
                content = f_in.read()
            
            # Guardar contenido extraído
            temp_db = self._cities_dir / "_cities_all.sqlite3"
            with open(temp_db, 'wb') as f_out:
                f_out.write(content)
            
            self._cities_available = True
            Logger.add_to_log("info", f"Base de datos de ciudades extraída exitosamente en: {self._cities_dir}")
            
        except Exception as e:
            Logger.add_to_log("error", f"Error configurando base de datos de ciudades: {e}")
            self._cities_available = False

    def _get_cities_db_path(self, country_code: str) -> Optional[Path]:
        """Obtiene la ruta del archivo SQLite de ciudades."""
        if not self._cities_dir or not self._cities_available:
            return None
        
        # Intentar archivo específico del país
        country_db = self._cities_dir / f"{country_code}.sqlite3"
        if country_db.exists() and self._db_has_tables(country_db):
            return country_db
        
        # Usar archivo completo
        all_cities_db = self._cities_dir / "_cities_all.sqlite3"
        if all_cities_db.exists():
            return all_cities_db
        
        return None

    def _db_has_tables(self, db_path: Path) -> bool:
        """Verifica si una base de datos tiene tablas."""
        try:
            conn = sqlite3.connect(str(db_path))
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            conn.close()
            return len(tables) > 0
        except sqlite3.Error:
            return False

    def _get_sqlite_connection(self) -> Optional[sqlite3.Connection]:
        """Obtiene una conexión a la base de datos de países."""
        if not self._sqlite_available or not self._sqlite_db_path:
            return None
        try:
            conn = sqlite3.connect(str(self._sqlite_db_path))
            conn.row_factory = sqlite3.Row
            return conn
        except sqlite3.Error as e:
            Logger.add_to_log("error", f"Error conectando a SQLite: {e}")
            return None

    def _get_sqlite_connection_for_file(self, db_path: Path) -> Optional[sqlite3.Connection]:
        """Obtiene una conexión a un archivo SQLite específico."""
        try:
            conn = sqlite3.connect(str(db_path))
            conn.row_factory = sqlite3.Row
            return conn
        except sqlite3.Error as e:
            Logger.add_to_log("error", f"Error conectando a {db_path}: {e}")
            return None

    def _get_from_cache(self, key: Tuple[str, ...], ttl: int) -> Optional[List[Dict[str, str]]]:
        """Obtiene datos del caché si están disponibles y no han expirado."""
        with self._cache_lock:
            if key not in self._cache:
                return None
            expires_at, data = self._cache[key]
            if expires_at < time.time():
                del self._cache[key]
                return None
            return data

    def _store_in_cache(self, key: Tuple[str, ...], data: List[Dict[str, str]], ttl: int) -> None:
        """Almacena datos en el caché con un tiempo de expiración."""
        with self._cache_lock:
            self._cache[key] = (time.time() + ttl, data)

    def search_countries(self, name_prefix: str, *, limit: int = 20) -> List[Dict[str, str]]:
        """
        Busca países por nombre o código ISO.
        
        Args:
            name_prefix: Texto de búsqueda (nombre o código del país)
            limit: Máximo número de resultados (default: 20, max: 200)
            
        Returns:
            Lista de países que coinciden con la búsqueda
        """
        prefix = (name_prefix or "").strip()
        if not prefix:
            return []

        safe_limit = max(1, min(int(limit or 20), 200))
        cache_key = ("countries_search", prefix.lower(), str(safe_limit))
        search_ttl = min(self._cache_ttl_countries, 60 * 60)
        
        # Verificar caché
        cached = self._get_from_cache(cache_key, search_ttl)
        if cached is not None:
            return cached

        # Buscar en SQLite
        if self._sqlite_available:
            try:
                conn = self._get_sqlite_connection()
                if conn:
                    with conn:
                        cursor = conn.execute(
                            """
                            SELECT iso2 as code, name
                            FROM countries
                            WHERE LOWER(name) LIKE LOWER(?)
                               OR LOWER(iso2) LIKE LOWER(?)
                            ORDER BY name
                            LIMIT ?
                            """,
                            (f"%{prefix}%", f"%{prefix}%", safe_limit)
                        )
                        results = [{"code": row["code"], "name": row["name"]} for row in cursor.fetchall()]
                        self._store_in_cache(cache_key, results, search_ttl)
                        Logger.add_to_log("info", f"Búsqueda de países '{prefix}': {len(results)} resultados")
                        return results
            except sqlite3.Error as e:
                Logger.add_to_log("error", f"Error buscando países en SQLite: {e}")

        # Fallback a datos hardcodeados
        results = [
            {"code": c["code"], "name": c["name"]}
            for c in self._fallback_countries
            if prefix.lower() in c["name"].lower() or prefix.lower() in c["code"].lower()
        ]
        self._store_in_cache(cache_key, results, search_ttl)
        Logger.add_to_log("warn", f"Usando catálogo de países por defecto para búsqueda '{prefix}'")
        return results

    def get_countries(self) -> List[Dict[str, str]]:
        """
        Obtiene todos los países disponibles.
        
        Returns:
            Lista de todos los países con código y nombre
        """
        cache_key = ("all_countries",)
        
        # Verificar caché
        cached = self._get_from_cache(cache_key, self._cache_ttl_countries)
        if cached is not None:
            return cached

        # Obtener de SQLite
        if self._sqlite_available:
            try:
                conn = self._get_sqlite_connection()
                if conn:
                    with conn:
                        cursor = conn.execute(
                            """
                            SELECT iso2 as code, name
                            FROM countries
                            ORDER BY name
                            LIMIT 5000
                            """
                        )
                        results = [{"code": row["code"], "name": row["name"]} for row in cursor.fetchall()]
                        self._store_in_cache(cache_key, results, self._cache_ttl_countries)
                        Logger.add_to_log("info", f"SQLite devolvió {len(results)} países")
                        return results
            except sqlite3.Error as e:
                Logger.add_to_log("error", f"Error obteniendo países de SQLite: {e}")

        # Fallback a datos hardcodeados
        results = [{"code": c["code"], "name": c["name"]} for c in self._fallback_countries]
        self._store_in_cache(cache_key, results, self._cache_ttl_countries)
        Logger.add_to_log("warn", "Usando catálogo de países por defecto")
        return results

    def get_cities(self, country_code: str) -> List[Dict[str, str]]:
        """
        Obtiene todas las ciudades de un país específico.
        
        Args:
            country_code: Código ISO2 del país (ej: CO, US, MX)
            
        Returns:
            Lista de ciudades con nombre y código de estado
        """
        normalized_code = (country_code or "").upper().strip()
        if not normalized_code:
            return []
        
        cache_key = ("cities", normalized_code)
        
        # Verificar caché
        cached = self._get_from_cache(cache_key, self._cache_ttl_cities)
        if cached is not None:
            Logger.add_to_log("info", f"Ciudades de {normalized_code} desde caché: {len(cached)} ciudades")
            return cached

        # Intentar con archivo de ciudades
        if self._cities_available:
            cities_db_path = self._get_cities_db_path(normalized_code)
            if cities_db_path:
                try:
                    conn = self._get_sqlite_connection_for_file(cities_db_path)
                    if conn:
                        with conn:
                            # Verificar qué tablas existen
                            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
                            tables = [row[0] for row in cursor.fetchall()]
                            
                            if 'cities' in tables:
                                # Tabla cities estándar
                                cursor = conn.execute(
                                    """
                                    SELECT DISTINCT name, state_code as state
                                    FROM cities
                                    WHERE country_code = ?
                                    ORDER BY name
                                    LIMIT 5000
                                    """,
                                    (normalized_code,)
                                )
                            elif f'cities_{normalized_code}' in tables:
                                # Tabla específica del país
                                cursor = conn.execute(
                                    f"""
                                    SELECT DISTINCT name, state_code as state
                                    FROM cities_{normalized_code}
                                    ORDER BY name
                                    """
                                )
                            else:
                                # Buscar cualquier tabla de ciudades
                                cursor = conn.execute(
                                    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%cit%' LIMIT 1"
                                )
                                table_row = cursor.fetchone()
                                if not table_row:
                                    raise Exception("No se encontró tabla de ciudades")
                                
                                table_name = table_row[0]
                                cursor = conn.execute(
                                    f"""
                                    SELECT DISTINCT name, COALESCE(state_code, state, '') as state
                                    FROM {table_name}
                                    WHERE country_code = ?
                                    ORDER BY name
                                    LIMIT 5000
                                    """,
                                    (normalized_code,)
                                )
                            
                            # Procesar resultados
                            results = []
                            for row in cursor.fetchall():
                                city_data = {"name": row[0]}
                                if len(row) > 1 and row[1]:
                                    city_data["state"] = row[1]
                                results.append(city_data)
                            
                            self._store_in_cache(cache_key, results, self._cache_ttl_cities)
                            Logger.add_to_log("info", f"SQLite devolvió {len(results)} ciudades para {normalized_code}")
                            return results
                            
                except sqlite3.Error as e:
                    Logger.add_to_log("error", f"Error obteniendo ciudades para {normalized_code}: {e}")

        # Fallback a datos hardcodeados
        fallback_cities = self._fallback_cities.get(normalized_code, [])
        fallback = [{"name": city} for city in fallback_cities]
        self._store_in_cache(cache_key, fallback, self._cache_ttl_cities)
        Logger.add_to_log("warn", f"Usando catálogo de ciudades por defecto para {normalized_code}")
        return fallback


def init_location_service(app) -> None:
    """
    Inicializa el servicio de localización con la configuración de la aplicación.
    
    Args:
        app: Instancia de Flask
    """
    cache_ttl_countries = int(app.config.get("LOCATION_CACHE_TTL_COUNTRIES", 60 * 60 * 24))  # 24 horas
    cache_ttl_cities = int(app.config.get("LOCATION_CACHE_TTL_CITIES", 60 * 60 * 12))  # 12 horas
    sqlite_db_path = app.config.get("LOCATION_DB_PATH")
    cities_archive_path = app.config.get("LOCATION_CITIES_ARCHIVE_PATH")

    service = LocationService(
        cache_ttl_countries=cache_ttl_countries,
        cache_ttl_cities=cache_ttl_cities,
        sqlite_db_path=sqlite_db_path,
        cities_archive_path=cities_archive_path,
    )
    app.extensions["location_service"] = service
    Logger.add_to_log("info", "LocationService inicializado correctamente")


def get_location_service() -> LocationService:
    """
    Obtiene la instancia del servicio de localización desde Flask.
    
    Returns:
        Instancia de LocationService
        
    Raises:
        RuntimeError: Si el servicio no ha sido inicializado
    """
    from flask import current_app
    
    service = current_app.extensions.get("location_service")
    if not service:
        raise RuntimeError("LocationService no inicializado. Llamar init_location_service() primero.")
    return service
