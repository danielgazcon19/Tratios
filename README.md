# Sistema de Compraventa - Integración con SQLite

## 📋 Descripción General

Sistema web de compraventa con backend Flask y frontend Angular 17, utilizando bases de datos SQLite locales para información de países y ciudades, eliminando la dependencia de APIs externas lentas y con límites de uso.

## 🏗️ Arquitectura de Datos de Localización

### Fuentes de Datos (Prioridad Jerárquica)

1. **SQLite Local** (Prioritario) 🚀
   - `countries.db`: 250 países con información completa
   - `_cities_all.sqlite3`: 150,892 ciudades del mundo
   - **Sin límites de uso, sin latencia de red**

2. **GeoDB API** (Fallback)
   - Se usa solo cuando SQLite no está disponible
   - Requiere API key configurada

3. **Datos Hardcodeados** (Último Recurso)
   - Catálogo mínimo de 5 países y sus principales ciudades

### Estructura de Archivos

```
backend/
├── data/
│   ├── countries.db           # BD de países (ya incluido)
│   ├── cities.sqlite3.gz      # BD comprimida de ciudades
│   ├── cities/                # Directorio de extracción (auto-generado)
│   │   └── _cities_all.sqlite3
│   └── README.md              # Documentación detallada
├── utils/
│   └── location_service.py    # Servicio con lógica multi-fuente
└── scripts/
    ├── download_cities_db.py  # Script de descarga (Python)
    ├── download_cities_db.ps1 # Script de descarga (PowerShell)
    ├── test_sqlite_location.py # Script de pruebas
    └── inspect_databases.py   # Inspector de estructura BD
```

## 🚀 Instalación y Configuración

### 1. Requisitos Previos

```bash
# Python 3.12+
python --version

# Node.js 18+ y npm
node --version
npm --version
```

### 2. Configurar Backend

```powershell
# Navegar al directorio backend
cd backend

# Instalar dependencias Python
pip install -r requirements.txt

# Descargar base de datos de ciudades (elige uno)
python scripts/download_cities_db.py
# O con PowerShell:
.\scripts\download_cities_db.ps1
```

### 3. Verificar Instalación

```powershell
# Ejecutar script de pruebas
python scripts/test_sqlite_location.py

# Salida esperada:
# ✓ países: 2 con 'ven' (Slovenia, Venezuela)
# ✓ Colombia: 1000 ciudades
# ✓ Venezuela: 136 ciudades
```

### 4. Iniciar Servicios

**Backend (Puerto 5222)**:
```powershell
cd backend
python app.py
```

**Frontend (Puerto 4200)**:
```powershell
cd frontend
npm install  # Solo la primera vez
npm start
```

Acceder a: `http://localhost:4200`

## 🔧 Configuración Avanzada

### Variables de Entorno (`.env` en backend)

```env
# Base de datos SQLite (rutas relativas a backend/)
LOCATION_DB_PATH=data/countries.db
LOCATION_CITIES_ARCHIVE_PATH=data/cities.sqlite3.gz

# Opcional: GeoDB API (fallback)
GEO_DB_API_KEY=tu_api_key_aqui
GEO_DB_API_HOST=wft-geo-db.p.rapidapi.com

# Caché TTL (segundos)
LOCATION_CACHE_TTL_COUNTRIES=86400  # 24 horas
LOCATION_CACHE_TTL_CITIES=43200     # 12 horas
```

### Proceso de Extracción Automática

El primer inicio del servidor extrae automáticamente `cities.sqlite3.gz`:

```python
# location_service.py línea ~106
def _setup_cities_database(self):
    # Verifica si ya existe cities/_cities_all.sqlite3
    # Si no, extrae cities.sqlite3.gz → cities/_cities_all.sqlite3
    # Logs en backend/logs/app.log
```

## 📊 Esquema de Bases de Datos

### Tabla `countries` (countries.db)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | PK, autoincremental |
| `name` | VARCHAR(100) | Nombre completo del país |
| `iso2` | CHAR(2) | Código ISO 3166-1 alpha-2 (ej: CO) |
| `iso3` | CHAR(3) | Código ISO 3166-1 alpha-3 (ej: COL) |
| `capital` | VARCHAR | Ciudad capital |
| `currency` | VARCHAR | Código de moneda |
| `phonecode` | VARCHAR | Código telefónico internacional |
| `emoji` | VARCHAR | Emoji de bandera (🇨🇴) |

**Ejemplo**:
```json
{
  "id": 48,
  "name": "Colombia",
  "iso2": "CO",
  "iso3": "COL",
  "capital": "Bogotá",
  "currency": "COP",
  "phonecode": "57",
  "emoji": "🇨🇴"
}
```

### Tabla `cities` (_cities_all.sqlite3)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | PK, autoincremental |
| `name` | VARCHAR(255) | Nombre de la ciudad |
| `country_code` | CHAR(2) | Código ISO2 del país |
| `state_code` | VARCHAR | Código ISO del estado/provincia |
| `latitude` | DECIMAL | Coordenada geográfica |
| `longitude` | DECIMAL | Coordenada geográfica |

**Ejemplo**:
```json
{
  "id": 20123,
  "name": "Bogotá",
  "country_code": "CO",
  "state_code": "CUN",  // Cundinamarca
  "latitude": 4.6097,
  "longitude": -74.0817
}
```

## 🧪 Scripts de Desarrollo

### 1. Descargar Base de Datos de Ciudades

**Python**:
```powershell
python backend/scripts/download_cities_db.py

# Características:
# - Intenta 3 URLs automáticamente
# - Barra de progreso de descarga
# - Verifica si ya existe (solicita confirmación)
# - ~300MB comprimido
```

**PowerShell**:
```powershell
.\backend\scripts\download_cities_db.ps1

# Uso avanzado:
.\backend\scripts\download_cities_db.ps1 -Force  # Reemplazar sin preguntar
```

### 2. Probar Integración SQLite

```powershell
python backend/scripts/test_sqlite_location.py

# Pruebas incluidas:
# ✓ Test 1: Buscar 'ven' → Slovenia, Venezuela
# ✓ Test 2: Buscar 'col' → Colombia
# ✓ Test 3: Ciudades de Colombia (1000 máx)
# ✓ Test 4: Ciudades de Venezuela (136)
# ✓ Test 5: Primeros 10 países
```

### 3. Inspeccionar Estructura de BD

```powershell
python backend/scripts/inspect_databases.py

# Muestra:
# - Tablas en cada base de datos
# - Esquema de columnas (tipos, NULL, PKs)
# - Conteo de registros
# - Primeros 3 registros de ejemplo
```

## 📡 API Endpoints

### GET `/api/public/countries/search`

Busca países por nombre o código ISO.

**Parámetros**:
- `q` (string): Texto de búsqueda (min 1 caracter)
- `limit` (int, opcional): Máximo de resultados (default: 20, max: 200)

**Ejemplo**:
```bash
curl "http://localhost:5222/api/public/countries/search?q=col&limit=5"
```

**Respuesta**:
```json
{
  "countries": [
    {"code": "CO", "name": "Colombia"}
  ],
  "source": "sqlite",
  "cached": false
}
```

### GET `/api/public/cities?country_code={CODE}`

Obtiene ciudades de un país específico.

**Parámetros**:
- `country_code` (string): Código ISO2 del país (ej: CO, VE)

**Ejemplo**:
```bash
curl "http://localhost:5222/api/public/cities?country_code=CO"
```

**Respuesta**:
```json
{
  "cities": [
    {"name": "Bogotá", "state": "CUN"},
    {"name": "Medellín", "state": "ANT"},
    {"name": "Cali", "state": "VAC"}
  ],
  "source": "sqlite_cities",
  "cached": false,
  "total": 1000
}
```

## 🎨 Integración Frontend

### Componente de Búsqueda de País

```typescript
// account.component.ts
private countrySearchSubject = new Subject<string>();

ngOnInit() {
  // Debounce de 300ms para búsquedas
  this.countrySearchSubject.pipe(
    debounceTime(300),
    distinctUntilChanged()
  ).subscribe(query => {
    this.searchCountries(query);
  });
}

onCountrySearchInput(event: Event) {
  const query = (event.target as HTMLInputElement).value;
  this.countrySearchSubject.next(query);
}

searchCountries(query: string) {
  if (query.length < 1) {
    this.countrySuggestions = [];
    return;
  }

  this.apiService.searchCountries(query).subscribe({
    next: (data) => {
      this.countrySuggestions = data.countries;
    },
    error: (err) => console.error('Error buscando países:', err)
  });
}
```

### Template HTML

```html
<!-- Buscador con sugerencias -->
<input 
  type="text" 
  placeholder="🔍 Buscar país..."
  (input)="onCountrySearchInput($event)"
  [value]="empresaForm.get('pais')?.value || ''"
/>

<!-- Dropdown de sugerencias -->
<div class="suggestions" *ngIf="countrySuggestions.length > 0">
  <div *ngFor="let country of countrySuggestions"
       class="suggestion-item"
       (click)="onCountrySuggestionSelected(country)">
    {{ country.name }} ({{ country.code }})
  </div>
</div>
```

## 📈 Rendimiento

### Comparación de Tiempos de Respuesta

| Operación | GeoDB API | SQLite Local | Mejora |
|-----------|-----------|--------------|--------|
| Buscar "col" | ~500ms | **~5ms** | **100x** |
| Ciudades CO | ~10s | **~50ms** | **200x** |
| Cache hit | ~2ms | **~1ms** | **2x** |

### Caché en Memoria

- **Países**: TTL 24 horas (configurable)
- **Ciudades**: TTL 12 horas (configurable)
- **Thread-safe** con `threading.Lock`
- **Invalidación automática** por expiración

## 🐛 Troubleshooting

### Error: `No module named 'pyotp'`

```powershell
pip install pyotp qrcode pillow
```

### Error: `Base de datos SQLite no encontrada`

```powershell
# Verificar rutas
python backend/scripts/test_sqlite_location.py

# Descargar ciudades si falta
python backend/scripts/download_cities_db.py
```

### Error: `no such column: state_name`

✅ Ya corregido en versión actual. Si persiste:

```powershell
# Eliminar extracción anterior
Remove-Item backend/data/cities -Recurse -Force

# Re-extraer
python app.py  # Extracción automática en inicio
```

### Ciudades no cargan para ciertos países

```powershell
# Inspeccionar BD
python backend/scripts/inspect_databases.py

# Verificar logs
Get-Content backend/logs/app.log -Tail 50
```

## 📚 Referencias

- **Fuente de Datos**: [dr5hn/countries-states-cities-database](https://github.com/dr5hn/countries-states-cities-database)
- **Flask**: https://flask.palletsprojects.com/
- **Angular 17**: https://angular.dev/
- **SQLite**: https://www.sqlite.org/docs.html

## 🔐 Seguridad

- **Validación de entrada**: Límites en búsquedas y parámetros
- **SQL Injection**: Uso de consultas parametrizadas (`?` placeholders)
- **Rate Limiting**: Implementado para API externa (fallback)
- **CORS**: Configurado en `app.py` para desarrollo

## 📝 Changelog

### v2.0.0 (2025-01-18)
- ✅ Migración completa a SQLite local
- ✅ Eliminación de dependencia de GeoDB API
- ✅ Búsqueda con debounce 300ms
- ✅ 150K+ ciudades disponibles localmente
- ✅ Scripts de descarga y prueba
- ✅ Documentación completa

### v1.0.0 (Anterior)
- GeoDB API como fuente principal (lento, limitado)

## 🤝 Contribuir

1. Fork del repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'Agregar funcionalidad X'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## 📄 Licencia

Este proyecto utiliza datos de [dr5hn/countries-states-cities-database](https://github.com/dr5hn/countries-states-cities-database) bajo licencia Open Database License (ODbL).

---

**Desarrollado con ❤️ usando Flask + Angular + SQLite**
