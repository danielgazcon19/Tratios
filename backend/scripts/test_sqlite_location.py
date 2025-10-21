"""
Script de prueba directa para LocationService con SQLite.
Verifica la integración de la base de datos local de países y ciudades.
"""
import os
import sys
from pathlib import Path

# Añadir el directorio backend al path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from flask import Flask
from utils.location_service import init_location_service, get_location_service
from utils.logger import Logger


def test_location_service():
    """Prueba el servicio de localización con SQLite."""
    app = Flask(__name__)
    
    # Configurar rutas de las bases de datos
    db_path = os.getenv('LOCATION_DB_PATH', str(backend_dir / 'data' / 'countries.db'))
    cities_path = os.getenv('LOCATION_CITIES_ARCHIVE_PATH', str(backend_dir / 'data' / 'cities.sqlite3.gz'))
    
    app.config['LOCATION_DB_PATH'] = db_path
    app.config['LOCATION_CITIES_ARCHIVE_PATH'] = cities_path
    app.config['LOCATION_CACHE_TTL_COUNTRIES'] = 3600
    app.config['LOCATION_CACHE_TTL_CITIES'] = 1800
    app.config['LOCATION_RATE_LIMIT_REQUESTS'] = 45
    app.config['LOCATION_RATE_LIMIT_WINDOW'] = 60
    
    print(f"\n{'='*60}")
    print(f"Test de LocationService con SQLite")
    print(f"{'='*60}")
    print(f"Ruta BD países: {db_path}")
    print(f"BD países existe: {Path(db_path).exists()}")
    print(f"Ruta archivo ciudades: {cities_path}")
    print(f"Archivo ciudades existe: {Path(cities_path).exists()}")
    print(f"{'='*60}\n")
    
    with app.app_context():
        # Inicializar el servicio
        init_location_service(app)
        service = get_location_service()
        
        # Test 1: Buscar países
        print("\n--- Test 1: Buscar países con 'ven' ---")
        countries = service.search_countries("ven", limit=10)
        print(f"Resultados encontrados: {len(countries)}")
        for country in countries:
            print(f"  - {country['name']} ({country['code']})")
        
        # Test 2: Buscar países con 'col'
        print("\n--- Test 2: Buscar países con 'col' ---")
        countries = service.search_countries("col", limit=10)
        print(f"Resultados encontrados: {len(countries)}")
        for country in countries:
            print(f"  - {country['name']} ({country['code']})")
        
        # Test 3: Obtener ciudades de Colombia
        print("\n--- Test 3: Ciudades de Colombia (CO) ---")
        cities = service.get_cities("CO")
        print(f"Total de ciudades: {len(cities)}")
        print("Primeras 20 ciudades:")
        for city in cities[:20]:
            state = city.get('state', 'N/A')
            print(f"  - {city['name']} ({state})")
        
        # Test 4: Obtener ciudades de Venezuela
        print("\n--- Test 4: Ciudades de Venezuela (VE) ---")
        cities = service.get_cities("VE")
        print(f"Total de ciudades: {len(cities)}")
        print("Primeras 20 ciudades:")
        for city in cities[:20]:
            state = city.get('state', 'N/A')
            print(f"  - {city['name']} ({state})")
        
        # Test 5: Obtener todos los países (primeros 10)
        print("\n--- Test 5: Primeros 10 países (alfabético) ---")
        all_countries = service.get_countries()
        print(f"Total de países: {len(all_countries)}")
        for country in all_countries[:10]:
            print(f"  - {country['name']} ({country['code']})")
        
        print(f"\n{'='*60}")
        print("Tests completados exitosamente")
        print(f"{'='*60}\n")
        print("Revisa los logs en: backend/logs/app.log")


if __name__ == "__main__":
    try:
        test_location_service()
    except Exception as e:
        print(f"\n❌ Error durante las pruebas: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
