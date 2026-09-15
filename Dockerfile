# Build : compile la SPA Vite/Vue en fichiers statiques.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Vite embarque les variables VITE_* dans le bundle AU MOMENT DU BUILD (pas
# au démarrage du conteneur) : elles doivent donc être fournies en build args
# (voir docker-compose.yml -> services.web.build.args), pas en simples env
# vars du conteneur final.
ARG VITE_TCL_LOGIN
ARG VITE_TCL_PASSWORD
ARG VITE_CALENDAR_ICS_URL
ARG VITE_CALENDAR_RELAY_URL
ENV VITE_TCL_LOGIN=$VITE_TCL_LOGIN \
    VITE_TCL_PASSWORD=$VITE_TCL_PASSWORD \
    VITE_CALENDAR_ICS_URL=$VITE_CALENDAR_ICS_URL \
    VITE_CALENDAR_RELAY_URL=$VITE_CALENDAR_RELAY_URL

RUN npm run build

# Serve : nginx sert les fichiers statiques et relaie /api vers le service
# calendar-relay (docker-compose.yml) pour contourner le blocage CORS de Google.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
