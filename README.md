# vocal-web

React (Vite) frontend — **JWT auth** via `vocal-api` (`POST /v1/auth/login`).

## Run locally

```bash
cd vocal-web
# .env.local: VITE_API_BASE_URL=http://localhost:3001/v1

npm install
npm run dev
```

Open http://localhost:5173/sign-in

## Sign in

1. Start `vocal-api` on port 3001 with `JWT_SECRET` set
2. Run `npm run seed:passwords` in vocal-api (after migration 007)
3. Sign in with email + password (e.g. `vocal-test-worker1@example.com` / `Vocal!Test2026`)

## Pair with vocal-api

See `../LOCAL_DEV.md`.
