# Diagnóstico de Autenticación

## Pasos para verificar el problema

### 1. Abre la consola del navegador (F12)

### 2. Ejecuta estos comandos uno por uno:

```javascript
// Ver el objeto de sesión completo
const auth = localStorage.getItem('tratios.auth');
console.log('Sesión completa:', JSON.parse(auth));

// Ver el token de acceso
const accessToken = localStorage.getItem('access_token');
console.log('Access Token:', accessToken);

// Ver información del usuario
const session = JSON.parse(auth);
console.log('Usuario:', session.usuario);
console.log('Rol:', session.usuario.rol);
console.log('Email:', session.usuario.email);

// Verificar expiración
console.log('Expira en:', new Date(session.expires_at));
console.log('Ya expiró?', Date.now() > session.expires_at);
```

### 3. Verifica lo siguiente:

✅ **Debe mostrar:**
- `Rol: "admin"` (no "usuario")
- `Email: "admin@tratios.com"`
- `Access Token:` (un string largo JWT)
- `Ya expiró? false`

❌ **Si el rol NO es "admin":**
- Cierra sesión
- Vuelve a hacer login con: `admin@tratios.com` / `Admin123!`
- Verifica de nuevo

### 4. Prueba manual de la API

Ejecuta esto en la consola para probar directamente:

```javascript
const token = localStorage.getItem('access_token');
fetch('http://localhost:5000/admin/empresas', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Respuesta API:', data))
.catch(err => console.error('Error:', err));
```

### 5. Resultados esperados:

✅ **Si funciona:** Verás un array de empresas `[]` o con datos
❌ **Si falla:** Verás uno de estos errores:
- `Missing Authorization Header` → El token no se está enviando
- `Token has expired` → El token expiró
- `Acceso denegado` → El usuario no es admin

## Solución según el error:

### A. Si el ROL no es "admin":
```bash
# Desde la terminal en backend/
python scripts/create_admin.py
```
Luego cierra sesión y vuelve a entrar con admin@tratios.com

### B. Si el TOKEN expiró:
- Cierra sesión y vuelve a entrar
- Los tokens duran 1 hora

### C. Si el TOKEN no se envía:
- Verifica que `localStorage.getItem('access_token')` devuelva un valor
- Refresca la página completamente (Ctrl+F5)
