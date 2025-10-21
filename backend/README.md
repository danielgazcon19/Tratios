# Backend - Sistema Web OroSoft Compraventa SaaS

## 🏗️ Arquitectura
Este backend está construido con Flask y proporciona una API REST para el sistema SaaS de gestión de compraventa.

## 🚀 Configuración e Instalación

### Prerrequisitos
- Python 3.8+
- MySQL 8+
- pip

### Instalación
1. Crear entorno virtual:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Configurar variables de entorno:
   - Copia `.env` y ajusta la conexión a MySQL
   - Agrega las credenciales para el servicio de localización (GeoDB Cities via RapidAPI)
     ```env
     GEO_DB_API_KEY=tu_clave_rapidapi
     GEO_DB_API_HOST=wft-geo-db.p.rapidapi.com  # opcional, por defecto usa este host
     LOCATION_RATE_LIMIT_REQUESTS=45            # opcional: solicitudes por ventana
     LOCATION_RATE_LIMIT_WINDOW=60              # opcional: ventana en segundos
     LOCATION_CACHE_TTL_COUNTRIES=43200         # opcional: segundos (12h)
     LOCATION_CACHE_TTL_CITIES=14400            # opcional: segundos (4h)
     ```
   - Mantén estas variables en un almacén seguro y no las compartas en repositorios públicos.

4. Crear base de datos:
```sql
CREATE DATABASE compraventa_saas;
```

5. Ejecutar migraciones:
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
# Ejecución de Migraciones y Seed

Este documento describe los pasos necesarios para ejecutar las migraciones de base de datos y el script `seed.py`.

## Pasos para ejecutar las migraciones

1. **Configurar las credenciales de la base de datos**:
   - Asegúrate de que el archivo `.env` contiene las credenciales correctas para la base de datos.
   - Ejemplo:
     ```
     DB_HOST=localhost
     DB_PORT=3306
     DB_NAME=web_compraventa
     DB_USER=saas_user_compraventa
     DB_PASSWORD=fgT2035.!4syz
     DATABASE_URL=mysql+pymysql://saas_user_compraventa:fgT2035.!4syz@localhost/web_compraventa
     ```

2. **Crear el usuario de base de datos**:
   - Si el usuario especificado en las credenciales no existe, créalo en el servidor de base de datos.
   - Ejemplo:
     ```sql
     CREATE USER 'saas_user_compraventa'@'localhost' IDENTIFIED BY 'fgT2035.!4syz';
     GRANT ALL PRIVILEGES ON web_compraventa.* TO 'saas_user_compraventa'@'localhost';
     FLUSH PRIVILEGES;
     ```

3. **Ejecutar las migraciones**:
   - Usa el siguiente comando para aplicar las migraciones:
     ```
     alembic upgrade head
     or
     python -m alembic --config d:/Software/Pagina/backend/migrations/alembic.ini upgrade head
     ```

## Pasos para ejecutar el script `seed.py`

1. **Ejecutar el script**:
   - Una vez aplicadas las migraciones, ejecuta el script `seed.py` para insertar datos iniciales en la base de datos.
   - Comando:
     ```
     python seed.py
     ```

## Notas adicionales

- Asegúrate de que el entorno virtual esté activado antes de ejecutar los comandos.
- Si encuentras errores relacionados con permisos o conexión, verifica las configuraciones de la base de datos y las credenciales en el archivo `.env`.