# Guía de Acceso a la Aplicación

## Problema: Error "Recurso no encontrado" al recargar (F5)

### ¿Por qué ocurre?

Cuando recargas una página de Angular (F5), el navegador hace una petición HTTP directa a esa ruta. Si estás accediendo al servidor Flask directamente (puerto 5222), Flask no reconoce las rutas de Angular y devuelve error 404.

### Solución en Desarrollo

**IMPORTANTE: Siempre accede a la aplicación a través del servidor de Angular**

```
✅ CORRECTO:   http://localhost:4200
❌ INCORRECTO: http://localhost:5222
```

### Cómo iniciar la aplicación correctamente

#### 1. Iniciar el Backend (Flask)

```bash
# Terminal 1 - Backend
cd d:\Software\Pagina\backend
python app.py
```

El backend se ejecutará en: `http://localhost:5222`

#### 2. Iniciar el Frontend (Angular)

```bash
# Terminal 2 - Frontend
cd d:\Software\Pagina\frontend
ng serve --proxy-config proxy.conf.json
```

El frontend se ejecutará en: `http://localhost:4200`

#### 3. Acceder a la aplicación

Abre tu navegador en: **http://localhost:4200**

### Flujo correcto de peticiones

Cuando accedes a `http://localhost:4200`:

1. Angular sirve la aplicación
2. Cuando Angular necesita datos (API calls), usa el proxy configurado
3. El proxy redirige las peticiones `/api`, `/auth`, `/admin`, `/account` al backend en `localhost:5222`
4. Al recargar (F5), Angular maneja la ruta correctamente

### Solución implementada en Flask

Se ha actualizado `app.py` para:

- **Con build de producción**: Sirve automáticamente los archivos de Angular
- **Sin build (desarrollo)**: Muestra mensaje informativo indicando usar `localhost:4200`

### Para producción

Cuando quieras desplegar la aplicación:

1. **Compilar Angular**:
   ```bash
   cd d:\Software\Pagina\frontend
   ng build --configuration production
   ```

2. **Iniciar Flask**:
   ```bash
   cd d:\Software\Pagina\backend
   python app.py
   ```

3. **Acceder directamente al puerto de Flask**:
   ```
   http://localhost:5222
   ```

Flask servirá automáticamente los archivos compilados de Angular y manejará correctamente las recargas.

### Verificación rápida

Si ves este error al recargar:
```json
{
  "message": "Recurso no encontrado"
}
```

**Solución inmediata**:
1. Verifica que estés en `http://localhost:4200` (NO en 5222)
2. Si estás en 5222, cambia manualmente la URL a `http://localhost:4200`
3. La próxima vez, accede directamente a puerto 4200

### Notas adicionales

- El proxy de Angular solo funciona cuando usas el servidor de desarrollo de Angular (`ng serve`)
- En producción, no necesitas el servidor de Angular; Flask sirve todo
- El token JWT se guarda en localStorage y no se pierde al recargar si estás en el puerto correcto
