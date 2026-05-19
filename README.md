# vocal-web

React (Vite) frontend — **Clerk auth** (same as the Next.js monolith).

## Run locally

```bash
cd vocal-web
cp .env.example .env.local
# Set VITE_CLERK_PUBLISHABLE_KEY (from monolith NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
# Set VITE_API_BASE_URL=http://localhost:3001/v1

npm install
npm run dev
```

Open http://localhost:5173/sign-in

## Sign in

1. Start `vocal-api` on port 3001 with `CLERK_SECRET_KEY` set
2. Sign in with your existing Clerk account (e.g. `vocal-test-worker1@example.com`)

No JWT / `seed:passwords` required.

## Pair with vocal-api

See `../LOCAL_DEV.md`.
