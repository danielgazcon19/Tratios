# 🔍 Debug de API - Verificación de Headers y Token

## Paso 1: Verificar en la Consola del Navegador

Abre la consola del navegador (F12) y ejecuta:

```javascript
// 1. Verificar sesión almacenada
const auth = localStorage.getItem('tratios.auth');
const session = JSON.parse(auth);
console.log('📦 Sesión completa:', session);
console.log('👤 Usuario:', session.usuario.email);
console.log('🔑 Rol:', session.usuario.rol);
console.log('🎫 Token:', session.access_token.substring(0, 30) + '...');
console.log('⏰ Expira:', new Date(session.expires_at));
console.log('❓ Expiró:', Date.now() > session.expires_at);
```

## Paso 2: Verificar en Network Tab (Pestaña Red)

1. Abre las **DevTools** (F12)
2. Ve a la pestaña **Network / Red**
3. Intenta acceder al Panel Admin
4. Busca la petición a `/admin/empresas`
5. Haz clic en ella
6. Ve a la pestaña **Headers / Cabeceras**
7. Busca en **Request Headers**:

### ✅ DEBE aparecer:
```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json
```

### ❌ Si NO aparece "Authorization":
- El interceptor NO está funcionando
- El token NO se está enviando

## Paso 3: Ver logs del interceptor

He añadido logs al interceptor. En la consola deberías ver:

### ✅ Si TODO está bien:
```
🔐 [API Interceptor] Añadiendo token a la petición: {
  url: "http://localhost:5000/admin/empresas",
  method: "GET",
  token: "eyJ0eXAiOiJKV1QiLCJ..."
}
```

### ❌ Si HAY un problema:
```
⚠️ [API Interceptor] NO HAY TOKEN para: {
  url: "http://localhost:5000/admin/empresas",
  method: "GET",
  storedAuth: true/false,
  accessToken: true/false
}
```

## Paso 4: Probar manualmente con fetch

```javascript
// Obtener token
const token = localStorage.getItem('access_token');
console.log('Token existe?', !!token);
console.log('Token:', token?.substring(0, 30) + '...');

// Hacer petición manual
fetch('http://localhost:5000/admin/empresas', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('✅ Respuesta exitosa:', data);
})
.catch(error => {
  console.error('❌ Error:', error);
});
```

## Resultados Esperados:

### ✅ FUNCIONANDO CORRECTAMENTE:
- Status: 200
- Respuesta: `[]` (array vacío) o array con empresas
- En Network tab aparece `Authorization: Bearer ...`
- En consola aparece el log `🔐 [API Interceptor] Añadiendo token...`

### ❌ ERROR: "Missing Authorization Header"
**Causa:** El token NO se está enviando
**Solución:** 
1. Verifica que `localStorage.getItem('access_token')` devuelva un valor
2. Refresca completamente la página (Ctrl+F5)
3. Cierra sesión y vuelve a entrar

### ❌ ERROR: "Acceso denegado. Se requieren permisos de administrador"
**Causa:** El usuario NO tiene rol='admin'
**Solución:**
```bash
# En backend/
python scripts/check_admin.py
```
Si no aparece rol='admin', vuelve a crear el usuario:
```bash
python scripts/create_admin.py
```

### ❌ ERROR: "Token has expired"
**Causa:** El token expiró (duran 1 hora)
**Solución:** Cierra sesión y vuelve a entrar

## Paso 5: Verificar CORS

Si ves errores de CORS, verifica que el backend tenga:

```python
# En backend/app.py
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:4200"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

## Acción Inmediata:

1. **Refresca el frontend** (Ctrl+F5)
2. **Abre la consola** (F12)
3. **Haz login** con admin@tratios.com
4. **Intenta acceder** al Panel Admin
5. **Mira los logs** en la consola
6. **Revisa Network tab** para ver si el header Authorization se envía
7. **Copia y pega aquí** los logs que veas
