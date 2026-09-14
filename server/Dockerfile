FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY calendar-relay.js ./
ENV PORT=3002
EXPOSE 3002
CMD ["node", "calendar-relay.js"]
