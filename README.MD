# POS Backend API

A RESTful backend API for a Point of Sale (POS) application, built with Node.js, Express.js, and PostgreSQL. This project emphasizes security, structured code, and easy development with JWT authentication, Role-Based Access Control (RBAC), and robust data management.

> Development is performed entirely via the Linux CLI in Termux on mobile devices.

---

## ✨ Features

- **Authentication**: Register, login, logout, access & refresh tokens, password hashing (bcrypt).
- **User Management**: CRUD operations for users with RBAC.
- **Product Management**: Full CRUD with search, pagination, filtering, sorting, and soft delete.
- **Category Management**: CRUD for product categories.
- **Security**: JWT authentication, password hashing, request validation (Joi), global error handling.

---

## 🛠️ Tech Stack

| Layer           | Technology                |
| --------------- | ------------------------- |
| Runtime         | Node.js                   |
| Framework       | Express.js                |
| Database        | PostgreSQL                |
| Query           | Raw SQL via `pg`          |
| Auth            | JWT                       |
| Password        | bcrypt                    |
| Validation      | Joi                       |
| Version Control | Git                       |
| Deployment      | Render (or custom Docker) |
| Monitoring      | Better Stack              |

---

## 📂 Project Structure

```
src/
├── config/          # Database & Redis config, init scripts
├── controllers/     # Express route handlers
├── middleware/      # Express middleware (auth, rate limiting, logging)
├── models/          # Database models or raw query helpers
├── routes/          # API route definitions
├── services/        # Business logic layer
├── utils/           # Helper utilities
├── validation/      # Joi validation schemas
├── app.js           # Main Express app configuration
└── server.js        # Server entry point (starts listening)
```

> **Note**: The `server.js` file typically sets up the HTTP server and connects to the database. If not present, `app.js` may be used directly with a custom server script.

---

## 🌐 API Endpoints

### Authentication

| Method | Endpoint             | Description                     |
| ------ | -------------------- | ------------------------------- |
| POST   | `/api/auth/register` | Register a new user             |
| POST   | `/api/auth/login`    | Authenticate & get access token |
| POST   | `/api/auth/logout`   | Revoke token                    |
| POST   | `/api/auth/refresh`  | Get a new access token          |
| GET    | `/api/auth/me`       | Get current user profile        |

### Users

| Method | Endpoint         | Description                 |
| ------ | ---------------- | --------------------------- |
| GET    | `/api/users`     | List all users (admin only) |
| GET    | `/api/users/:id` | Get a specific user         |
| POST   | `/api/users`     | Create a new user           |
| PATCH  | `/api/users/:id` | Update user details         |
| DELETE | `/api/users/:id` | Delete a user               |

### Products

| Method | Endpoint                    | Description                             |
| ------ | --------------------------- | --------------------------------------- |
| GET    | `/api/products`             | List products with optional filters     |
| GET    | `/api/products/:id`         | Get product details                     |
| POST   | `/api/products`             | Create a new product                    |
| PUT    | `/api/products/:id/update`  | Update product details (full replace)   |
| PATCH  | `/api/products/:id/remove`  | Soft‑delete a product (mark as removed) |
| PATCH  | `/api/products/:id/restore` | Restore a soft‑deleted product          |

### Categories

| Method | Endpoint                      | Description                     |
| ------ | ----------------------------- | ------------------------------- |
| GET    | `/api/categories`             | List categories                 |
| POST   | `/api/categories`             | Create a new category           |
| PATCH  | `/api/categories/:id/remove`  | Soft‑delete a category          |
| PATCH  | `/api/categories/:id/restore` | Restore a soft‑deleted category |

---

## ⚙️ Installation

```bash
# Clone the repository
git clone https://github.com/Peldo12/POS-Postgresql.git
cd POS-Postgresql

# Install dependencies
npm install
```

---

## 🧩 Environment Variables

Create a `.env` file in the project root with the following variables (adjust values as needed):

```env
PORT=3000                     # Port the API listens on
DB_HOST=localhost             # PostgreSQL host
DB_PORT=5432                  # PostgreSQL port
DB_USER=pos_user            # Database username
DB_PASSWORD=your_password     # Database password
DB_NAME=pos_db                # Database name
JWT_SECRET=your_jwt_secret    # Secret for signing JWTs
JWT_REFRESH_SECRET=your_refresh_secret  # Secret for refreshing tokens
```

> **Tip**: When running in Termux, ensure you have storage permission (`termux-setup-storage`) and that any required system packages (e.g., `python`, `make`) are installed for native modules.

---

## 🚀 Running the Project

### Development

```bash
npm run dev
```

> This script typically starts the server with nodemon for hot‑reloading.

### Production (using deployment script)

```bash
# Make the deployment script executable
chmod +x deploy.sh

# Run the deployment (will prompt for version)
./deploy.sh
```

> The `deploy.sh` script handles database initialization, Docker image builds, and health checks.

---

## 🗄️ Database

The application uses PostgreSQL with a relational schema that includes:

- **users** – stores user credentials and role references.
- **roles** – defines user roles (user, admin, owner, super_admin).
- **user_tokens** – stores JWT refresh tokens.
- **categories** – product categories.
- **products** – product catalog with constraints (stock ≥ 0, sell ≥ buy, etc.).
- **orders** and **order_items** – order management.
- Additional tables for audit logging, file storage, etc.

A diagram of the schema will be added in a future update.

---

## 📅 Roadmap

- [x] Authentication (JWT, refresh tokens)
- [x] Role‑Based Access Control (RBAC)
- [x] PostgreSQL integration
- [x] Product CRUD with search, pagination, filtering, sorting
- [x] Category CRUD
- [x] Soft delete for products and categories
- [ ] Transaction module (order processing, stock management)
- [ ] Dashboard statistics (sales reports, user activity)
- [ ] File upload handling (images, receipts)
- [ ] Unit testing (Jest/Mocha)
- [ ] Docker support (Dockerfile, docker‑compose)

---

## 👤 Author

**Holifatulla**  
GitHub: https://github.com/Peldo12

---

## 🙏 Acknowledgements

- Inspired by modern POS systems and e‑commerce platforms.
- Built with love using Termux on Android for mobile development.
