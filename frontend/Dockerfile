# Etapa 1: Construcción (build stage)
FROM node:20-alpine AS build

WORKDIR /app

# Copiar archivos de configuración de npm
COPY package*.json ./

# Instalar dependencias
RUN npm ci --legacy-peer-deps

# Copiar el código fuente
COPY . .

# Construir la aplicación para producción
RUN npm run build -- --configuration production

# Etapa 2: Servidor web Nginx
FROM nginx:alpine

# Copiar la build de Angular al directorio de nginx (Angular 17+ genera en /browser)
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Copiar configuración personalizada de nginx para SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80 (puerto estándar de nginx dentro del contenedor)
EXPOSE 80

# Comando por defecto de nginx
CMD ["nginx", "-g", "daemon off;"]
