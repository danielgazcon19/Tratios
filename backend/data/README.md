# Directorio de Datos - Base de Localización

Este directorio contiene las bases de datos SQLite para países, estados y ciudades.

## Archivos Requeridos

### 1. countries.db
Base de datos principal con información de países.

**Descarga:**
```bash
# Descargar desde GitHub
wget https://github.com/dr5hn/countries-states-cities-database/raw/master/sqlite/countries.sqlite3 -O countries.db
```

**O manualmente:**
1. Visita: https://github.com/dr5hn/countries-states-cities-database/tree/master/sqlite
2. Descarga `countries.sqlite3`
3. Renómbralo a `countries.db`
4. Colócalo en este directorio

### 2. cities.sqlite3.gz
Base de datos comprimida con ciudades por país.

**Descarga:**
```bash
# Descargar desde GitHub
wget https://github.com/dr5hn/countries-states-cities-database/raw/master/sqlite/cities.sqlite3.gz
```

**O manualmente:**
1. Visita: https://github.com/dr5hn/countries-states-cities-database/tree/master/sqlite
2. Descarga `cities.sqlite3.gz` (archivo comprimido)
3. Déjalo comprimido - el sistema lo descomprimirá automáticamente
4. Colócalo en este directorio

## Estructura de Archivos

```
backend/data/
├── README.md
├── countries.db          # Base de datos de países (requerido)
└── cities.sqlite3.gz     # Ciudades comprimidas (requerido)
```

## Estructura de las Bases de Datos

### countries.db

#### Tabla: countries
- `id`: INTEGER PRIMARY KEY
- `name`: TEXT - Nombre del país
- `iso2`: TEXT - Código ISO2 (2 letras)
- `iso3`: TEXT - Código ISO3 (3 letras)
- `phone_code`: TEXT - Código telefónico
- `capital`: TEXT - Capital del país
- `currency`: TEXT - Moneda
- `region`: TEXT - Región geográfica

### cities.sqlite3.gz (descomprimido automáticamente)

Contiene archivos SQLite individuales por país:
- `{country_code}.sqlite3` - Por ejemplo: `CO.sqlite3`, `VE.sqlite3`

#### Estructura de cada archivo de país:
```sql
CREATE TABLE cities (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    state_name TEXT,
    latitude REAL,
    longitude REAL
);
```

## Ventajas de esta Arquitectura

1. **Carga bajo demanda**: Solo se cargan ciudades del país seleccionado
2. **Menor uso de memoria**: No se mantienen todas las ciudades en RAM
3. **Rápida búsqueda**: Índices por país optimizados
4. **Actualizaciones parciales**: Puedes actualizar países individuales

## Notas

- Las bases de datos son independientes de `dev.db` (BD principal de la app)
- El sistema descomprime automáticamente `cities.sqlite3.gz` al iniciar
- Se crean cachés en memoria para optimizar consultas frecuentes
- Los archivos descomprimidos se mantienen en `backend/data/cities/`
