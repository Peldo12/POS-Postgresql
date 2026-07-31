## AUTH ENDPOINT
- POST /api/auth/register
* Request
```json
  {
    "username": "yourname",
    "email": "your@email.com", 
    "password": "yourpass"
  }
```

* Response
```json
  {
    "status": "ok",
    "message": "User name was registered",
    "data": {
      "payload": "..."
    }
  }
```

- POST /api/auth/verify
* Request
```url
  'http://domain.com/api/auth/verify?token=emailtoken'
```

* Response
```json
  {
    "status": "ok",
    "message": "Your email has verified",
    "data": {
      "payload": "..."
    }
  }
```

- POST /api/auth/login
* Request
```json
  {
    "username": "yourname/your@email.com"
    "password": "yourpass"
  }
```

* Response
```json
  {
    "status": "ok",
    "message": "Login successful, welcome name",
    "data": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  }
```

- POST /api/auth/refresh
* Request
```json
  "refreshToken": "..."
```

* Response
```json
  {
    "data": {
      "accessToken": "..."
    }
  }
```

- POST /api/auth/logout
* Request
```json
  "refreshToken": "..."
```

* Response
```json
  {
    "data": {
      "payload": "..."
    }
  }
```

- POST /api/auth/forgot
* Request
```json
  {
    "username": "yourname/your@email.com"
  }
```

Response
```json
  {
    "data": {
      "payload": "..."
    }
  }
```

```email

```

- PATCH /api/auth/reset
```json

```
- GET /api/auth/me
```json

```