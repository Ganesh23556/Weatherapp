## Weather App (Glassmorphic) + Auth

Full-stack weather web app with **glassmorphic UI**, **login/register**, and **SQLite** credential storage (hashed passwords). Weather data is fetched server-side using your API key via environment variables.

### Tech
- **Frontend**: React + Vite + TypeScript + Tailwind
- **Backend**: Node.js + Express + SQLite (`better-sqlite3`) + JWT (httpOnly cookie)
- **Tests**: Vitest + Supertest (server)

### Setup

#### 1) Install dependencies
```bash
npm install
```

#### 2) Configure environment
Copy the examples and fill in values.

```bash
copy server\.env.example server\.env
copy client\.env.example client\.env
```

Set `OPENWEATHER_API_KEY` in `server/.env` to your key.

#### 3) Run dev servers
```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5175`

### Run tests
```bash
npm test
```

### Notes
- Passwords are **never** stored in plaintext (bcrypt hash only).
- Weather calls are cached briefly in-memory for responsiveness.
