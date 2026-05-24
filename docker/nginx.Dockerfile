# Stage 1: build the React frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: nginx with built SPA + Basic Auth support
FROM nginx:alpine
# openssl is already present in nginx:alpine — used to hash the password
COPY --from=frontend /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/gen-htpasswd.sh /docker-entrypoint.d/40-gen-htpasswd.sh
RUN chmod +x /docker-entrypoint.d/40-gen-htpasswd.sh
