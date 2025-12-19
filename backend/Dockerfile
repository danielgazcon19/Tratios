# Dockerfile para Backend Flask
FROM python:3.11-slim

# Establecer el directorio de trabajo
WORKDIR /app

# Variables de entorno para Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Instalar dependencias del sistema necesarias para PyMySQL y compilación
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements.txt primero para aprovechar la caché de Docker
COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código de la aplicación
COPY . .

# Crear directorios necesarios
RUN mkdir -p uploads/tickets logs instance data/cities

# Exponer el puerto de la aplicación (puerto interno del contenedor)
EXPOSE 5000

# Dar permisos de ejecución al script de inicio si existe
RUN if [ -f docker-entrypoint.sh ]; then chmod +x docker-entrypoint.sh; fi

# Script de inicio: esperar a MySQL, ejecutar migraciones y lanzar la app
CMD ["sh", "-c", "\
    echo 'Esperando a MySQL...' && \
    while ! nc -z ${DB_HOST:-mysql_admin} ${DB_PORT:-3306}; do sleep 1; done && \
    echo 'MySQL está listo!' && \
    flask db upgrade && \
    echo 'Migraciones aplicadas!' && \
    gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 120 app:app \
"]
