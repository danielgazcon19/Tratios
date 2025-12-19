#!/bin/sh
# Script de entrada para el contenedor backend
# Este script espera a que MySQL esté disponible antes de ejecutar migraciones

set -e

echo "=== Backend Tratios - Iniciando ==="

# Esperar a que MySQL esté disponible
echo "Esperando a MySQL..."
while ! nc -z mysql 3306; do
  sleep 1
done
echo "✓ MySQL está disponible"

# Ejecutar migraciones de base de datos
echo "Aplicando migraciones de base de datos..."
flask db upgrade
echo "✓ Migraciones aplicadas"

# Iniciar la aplicación con Gunicorn
echo "Iniciando Gunicorn..."
exec gunicorn --bind 0.0.0.0:5000 \
              --workers 4 \
              --timeout 120 \
              --access-logfile - \
              --error-logfile - \
              --log-level info \
              app:app
