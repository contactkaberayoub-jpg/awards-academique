# Awards Académique

E-learning platform with certificates and payments.

## Project structure

- `backend/` — Spring Boot (Java 21, Maven wrapper) REST API
- `frontend/` — React + Vite + TypeScript SPA

## Backend — how to run (local)

The backend reads configuration, including the JWT signing secret, from environment
variables. These are loaded **only** by the launcher script, not by Maven directly.

```powershell
cd backend
.\start-backend.bat
```

The script:

1. loads `backend/.env.bat` (gitignored, created locally — do **not** commit it),
2. prints safe presence diagnostics (never the secret values),
3. starts Spring Boot on port 8080.

> ⚠️ Do **not** run `.\mvnw.cmd spring-boot:run`/`mvn spring-boot:run` directly: it does
> not load `.env.bat`, so `JWT_SECRET` (and the other secrets) will be missing and the
> application will fail to start.

### Creating `backend/.env.bat`

Copy `backend/.env.example` and fill real values, including:

```bat
set "JWT_SECRET=<a long, random, at-least-256-bit string>"
```

Never commit `.env.bat`. `.env.bat` is already ignored via `backend/.gitignore`.

### Verifying it is up

```powershell
netstat -ano | findstr :8080
# http://localhost:8080  -> 401 on protected routes (expected; auth is required)
```

## Tests

```powershell
cd backend
.\mvnw.cmd test
```

## Frontend — how to run (local)

```powershell
cd frontend
npm install
npm run dev
```

Serves the SPA on http://localhost:5173 (proxy/api base: http://localhost:8080/api).