# POS Backend API

Backend RESTful API untuk aplikasi Point of Sale (POS) yang dibangun menggunakan Node.js, Express.js, dan PostgreSQL. Project ini berfokus pada implementasi backend yang aman, terstruktur, dan mudah dikembangkan dengan menerapkan autentikasi JWT, Role Based Access Control (RBAC), serta pengelolaan data menggunakan PostgreSQL.

> Seluruh proses pengembangan dilakukan menggunakan Linux CLI berbasis Termux pada perangkat mobile.

---

## Features

### Authentication

- Register User
- Login
- Logout
- Access Token
- Refresh Token
- Password Hashing (bcrypt)

### User Management

- CRUD User
- Role Based Access Control (RBAC)

### Product Management

- CRUD Product
- Search
- Pagination
- Filtering
- Sorting
- Soft Delete

### Category Management

- CRUD Category

### Security

- JWT Authentication
- Password Hashing
- Request Validation (Joi)
- Global Error Handler

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL |
| Query | Raw SQL (pg) |
| Authentication | JWT |
| Password Security | bcrypt |
| Validation | Joi |
| Version Control | Git |
| Deployment | Render |
| Monitoring | Better Stack |

---

## Project Structure

```text
src/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
├── validation/
├── app.js
└── server.js
```

---

## API Modules

### Authentication

| Method | Endpoint |
|---------|----------|
| POST | /api/auth/register |
| POST | /api/auth/login |
| POST | /api/auth/logout |
| POST | /api/auth/refresh |
| GET | /api/auth/me |

---

### Users

| Method | Endpoint |
|---------|----------|
| GET | /api/users |
| GET | /api/users/:id |
| POST | /api/users |
| PATCH | /api/users/:id |
| DELETE | /api/users/:id |

---

### Products

| Method | Endpoint |
|---------|----------|
| GET | /api/products |
| GET | /api/products/:id |
| POST | /api/products |
| PUT | /api/products/:id/update |
| PATCH | /api/products/:id/remove |
| PATCH | /api/products/:id/restore |

---

### Categories

| Method | Endpoint |
|---------|----------|
| GET | /api/categories |
| POST | /api/categories |
| PATCH | /api/categories/:id/remove |
| PATCH | /api/categories/:id/restore |

---

## Installation

```bash
git clone https://github.com/Peldo12/POS-Postgresql.git

cd POS-Postgresql

npm install
```

---

## Environment Variables

Create `.env`

```env
PORT=3000

DATABASE_URL=

JWT_SECRET=

JWT_REFRESH_SECRET=
```

---

## Running Project

```bash
npm run dev
```

---

## Database

Database menggunakan PostgreSQL dengan skema relasional.

Beberapa entitas utama:

- Users
- Roles
- User Tokens
- Categories
- Products
- Orders

Diagram database akan ditambahkan pada pembaruan berikutnya.

---

## Roadmap

- [x] Authentication
- [x] JWT
- [x] Refresh Token
- [x] PostgreSQL
- [x] Product CRUD
- [x] Category CRUD
- [x] Search
- [x] Pagination
- [x] Filtering
- [x] Sorting
- [x] Soft Delete
- [ ] Transaction Module
- [ ] Dashboard Statistics
- [ ] File Upload
- [ ] Unit Testing
- [ ] Docker Support

---

## Author

Holifatulla

GitHub

https://github.com/Peldo12
