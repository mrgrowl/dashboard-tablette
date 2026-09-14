# Build : compile la SPA Vite/Vue en fichiers statiques.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve : nginx sert les fichiers statiques et relaie /api vers le service
# calendar-relay (docker-compose.yml) pour contourner le blocage CORS de Google.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
