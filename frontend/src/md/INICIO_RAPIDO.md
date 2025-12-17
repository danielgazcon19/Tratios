# 🚀 Inicio Rápido - Sistema de Compraventa

## ⚡ Levantar el Sistema (3 pasos)

### 1️⃣ Verificar que tienes todo

```powershell
# Verificar archivos de base de datos
Test-Path backend/data/countries.db           # Debe ser True
Test-Path backend/data/cities.sqlite3.gz      # Debe ser True
```

**Si `cities.sqlite3.gz` falta**:
```powershell
python backend/scripts/download_cities_db.py
```

---

### 2️⃣ Iniciar Backend (Puerto 5222)

```powershell
cd backend
python app.py
```

**Salida esperada**:
```
 * Running on http://127.0.0.1:5222
 * Debugger is active!
```

**Si hay error de módulo faltante**:
```powershell
pip install -r requirements.txt
```

---

### 3️⃣ Iniciar Frontend (Puerto 4200)

```powershell
# En otra terminal
cd frontend
npm install  # Solo la primera vez
npm start
```

**Salida esperada**:
```
✔ Browser application bundle generation complete.
Local:   http://localhost:4200/
```

---

## ✅ Verificar que Funciona

### Prueba Rápida desde Terminal

```powershell
# Buscar países
curl "http://localhost:5222/api/public/countries/search?q=col"

# Obtener ciudades de Colombia
curl "http://localhost:5222/api/public/cities?country_code=CO"
```

### Prueba desde Navegador

1. Abrir: `http://localhost:4200`
2. Ir a la página de cuenta/empresa
3. Buscar un país: escribir "col" → debe aparecer "Colombia (CO)"
4. Seleccionar Colombia → debe cargar ciudades automáticamente
5. Buscar ciudad: escribir "bogo" → debe aparecer "Bogotá (CUN)"

---

## 🧪 Ejecutar Tests

```powershell
# Test completo del LocationService
python backend/scripts/test_sqlite_location.py

# Inspeccionar bases de datos
python backend/scripts/inspect_databases.py
```

---

## 📊 Ver Logs en Tiempo Real

```powershell
# Ver logs mientras usas el sistema
Get-Content backend/logs/app.log -Wait
```

---

## 🛑 Detener el Sistema

```
Presiona Ctrl+C en ambas terminales (backend y frontend)
```

---

## ⚙️ Configuración Opcional

### Variables de Entorno

Crear archivo `backend/.env`:

```env
# Rutas de bases de datos (opcional, ya hay defaults)
LOCATION_DB_PATH=data/countries.db
LOCATION_CITIES_ARCHIVE_PATH=data/cities.sqlite3.gz

# API externa (opcional, solo como fallback)
GEO_DB_API_KEY=tu_api_key_aqui

# Configuración de caché
LOCATION_CACHE_TTL_COUNTRIES=86400  # 24 horas
LOCATION_CACHE_TTL_CITIES=43200     # 12 horas
```

---

## 🐛 Solución de Problemas Comunes

### Error: "ModuleNotFoundError"

```powershell
cd backend
pip install -r requirements.txt
```

### Error: "Base de datos SQLite no encontrada"

```powershell
# Descargar base de datos de ciudades
python backend/scripts/download_cities_db.py

# Verificar que existe
Test-Path backend/data/countries.db
Test-Path backend/data/cities.sqlite3.gz
```

### Error: "Port 5222 is already in use"

```powershell
# Cambiar puerto en backend/app.py línea final:
# app.run(host='0.0.0.0', port=5223, debug=True)
```

### Error: Frontend no compila

```powershell
cd frontend
Remove-Item node_modules -Recurse -Force
npm install
npm start
```

---

## 📚 Documentación Completa

- **README.md**: Documentación completa del sistema
- **ESTADO_ACTUAL.md**: Estado actual y checklist
- **RESUMEN_FINAL.md**: Resumen ejecutivo con diagramas
- **backend/data/README.md**: Documentación de bases de datos

---

## 💡 Tips Útiles

### 1. Desarrollo Frontend sin Backend

Puedes trabajar en el frontend sin tener el backend corriendo si usas datos mock:

```typescript
// En api.service.ts, temporal:
searchCountries(query: string): Observable<any> {
  return of({
    countries: [
      {code: 'CO', name: 'Colombia'},
      {code: 'VE', name: 'Venezuela'}
    ]
  });
}
```

### 2. Limpiar Caché del Backend

El backend guarda caché en memoria. Para limpiarla:
```powershell
# Simplemente reinicia el servidor
Ctrl+C
python app.py
```

### 3. Ver Estructura de una Tabla

```powershell
python -c "import sqlite3; conn = sqlite3.connect('backend/data/countries.db'); cursor = conn.execute('PRAGMA table_info(countries)'); print([row for row in cursor.fetchall()]); conn.close()"
```

---

## 📦 Estructura del Proyecto (Simplificada)

```
Pagina/
├── backend/
│   ├── app.py              ← Iniciar servidor Flask
│   ├── data/
│   │   ├── countries.db    ← BD de países
│   │   └── cities.sqlite3.gz  ← BD de ciudades (comprimido)
│   └── scripts/
│       ├── download_cities_db.py  ← Descargar BD
│       └── test_sqlite_location.py  ← Probar sistema
│
└── frontend/
    ├── src/
    │   └── app/
    │       └── pages/account/  ← Componente con búsqueda
    └── package.json        ← npm install desde aquí
```

---

## 🔄 Workflow Típico de Desarrollo

```mermaid
1. Abrir 2 terminales
   ↓
2. Terminal 1: cd backend && python app.py
   ↓
3. Terminal 2: cd frontend && npm start
   ↓
4. Editar código del frontend o backend
   ↓
5. Ver cambios automáticamente en localhost:4200
   ↓
6. Revisar logs en backend/logs/app.log
   ↓
7. Ejecutar tests: python backend/scripts/test_sqlite_location.py
```

---

## 🎯 Próximos Pasos

Una vez que el sistema esté corriendo:

1. ✅ Probar búsqueda de países
2. ✅ Probar carga de ciudades
3. ✅ Verificar que el caché funciona (segunda búsqueda más rápida)
4. ✅ Revisar logs para entender el flujo
5. 🔧 Personalizar según tus necesidades

---

## 📞 Ayuda Rápida

**Sistema no responde?**
```powershell
python backend/scripts/test_sqlite_location.py
```

**Ver qué está pasando?**
```powershell
Get-Content backend/logs/app.log -Tail 20
```

**Empezar de cero?**
```powershell
# Backend
cd backend
Remove-Item data/cities -Recurse -Force
python app.py  # Re-extrae cities.sqlite3.gz

# Frontend
cd frontend
Remove-Item node_modules -Recurse -Force
npm install
```

---

## ✨ ¡Ya Está!

Tu sistema debería estar corriendo en:
- **Backend**: http://localhost:5222
- **Frontend**: http://localhost:4200

Disfruta tu sistema de localización ultra-rápido! 🚀

---

**Última actualización**: 2025-01-18
