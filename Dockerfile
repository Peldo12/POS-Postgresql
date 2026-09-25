<<<<<<< HEAD
# 1. Ambil OS dasar yang ada Node.js-nya
FROM node:26-alpine

# 2. Buat folder kerja di dalam kotak
WORKDIR /app

# 3. Copy file package.json lalu install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy semua sisa kodingan POS kamu
COPY . .

# 5. Perintah untuk menyalakan aplikasinya
EXPOSE 3000
CMD ["npm", "start"]
=======
FROM node:26-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci && apk add --no-cache curl

COPY . .

EXPOSE 3000
CMD ["npm", "start"]

HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:3000/api/health || exit 1
>>>>>>> wip
