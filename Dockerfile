FROM node:26-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci && apk add --no-cache curl

COPY . .

EXPOSE 3000
CMD ["npm", "start"]

HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:3000/api/health || exit 1
