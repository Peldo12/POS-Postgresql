FROM node:26-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]

HEALTHCHECK --interval=30s --timeout=10s 
  CMD curf -f http://localhost:3000/api/health || exit 1