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
