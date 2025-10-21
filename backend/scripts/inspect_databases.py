"""
Script para inspeccionar la estructura de las bases de datos de ciudades.
"""
import sqlite3
from pathlib import Path

def inspect_database(db_path):
    """Inspecciona la estructura de una base de datos SQLite."""
    print(f"\n{'='*60}")
    print(f"Inspeccionando: {db_path.name}")
    print(f"{'='*60}\n")
    
    if not db_path.exists():
        print(f"❌ El archivo no existe: {db_path}")
        return
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Obtener todas las tablas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        if not tables:
            print("⚠️  No se encontraron tablas en la base de datos")
            conn.close()
            return
        
        print(f"📋 Tablas encontradas: {', '.join(tables)}\n")
        
        # Inspeccionar cada tabla
        for table in tables:
            print(f"--- Tabla: {table} ---")
            
            # Estructura
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            print("Columnas:")
            for col in columns:
                col_id, name, col_type, not_null, default, pk = col
                nullable = "NOT NULL" if not_null else "NULL"
                pk_marker = " 🔑 PK" if pk else ""
                default_str = f" DEFAULT {default}" if default is not None else ""
                print(f"  {name} ({col_type}) {nullable}{default_str}{pk_marker}")
            
            # Contar registros
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"Total de registros: {count}")
            
            # Mostrar 3 registros de ejemplo
            if count > 0:
                cursor.execute(f"SELECT * FROM {table} LIMIT 3")
                samples = cursor.fetchall()
                print("\nPrimeros 3 registros:")
                for i, row in enumerate(samples, 1):
                    print(f"  {i}. {dict(zip([col[1] for col in columns], row))}")
            
            print()
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error al inspeccionar la base de datos: {e}")

def main():
    print("\n" + "="*60)
    print("INSPECCIÓN DE BASES DE DATOS DE LOCALIZACIÓN")
    print("="*60)
    
    backend_dir = Path(__file__).parent.parent
    data_dir = backend_dir / 'data'
    
    # Inspeccionar countries.db
    countries_db = data_dir / 'countries.db'
    inspect_database(countries_db)
    
    # Inspeccionar archivos de ciudades
    cities_dir = data_dir / 'cities'
    if cities_dir.exists() and cities_dir.is_dir():
        city_files = sorted(cities_dir.glob('*.sqlite3'))[:5]  # Primeros 5 archivos
        
        if city_files:
            print(f"\n{'='*60}")
            print(f"📁 Archivos de ciudades encontrados: {len(list(cities_dir.glob('*.sqlite3')))}")
            print(f"Inspeccionando los primeros {len(city_files)}...")
            print(f"{'='*60}")
            
            for city_file in city_files:
                inspect_database(city_file)
        else:
            print("\n⚠️  No se encontraron archivos de ciudades en:", cities_dir)
    else:
        print(f"\n⚠️  Directorio de ciudades no existe: {cities_dir}")
    
    print("\n" + "="*60)
    print("INSPECCIÓN COMPLETADA")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
