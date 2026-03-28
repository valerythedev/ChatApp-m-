# Chat Backend

PostgreSQL + Prisma + Express + Socket.IO. Run locally with Node or fully containerized with Docker Compose.

## Environment

Copy `.env.example` to `.env` and set values:

- `DATABASE_URL` — Postgres connection string (local or Docker network hostname `postgres` when using Compose). Used by **Prisma ORM 7** from `prisma.config.ts` (migrations/CLI) and by the runtime **`@prisma/adapter-pg`** client in `src/lib/prisma.ts`.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — used by Docker Compose for the database service
- `JWT_SECRET` — signing secret for access tokens
- `FRONTEND_ORIGIN` — CORS + Socket.IO allowed SPA origin(s); comma-separated allowed (default `http://localhost:5173`)
- `PORT` — HTTP port (default `5550`)
- `MAX_UPLOAD_MB` — max multipart upload size per file (default `10`)
- `NODE_ENV=production` — enforces long `JWT_SECRET` and valid `DATABASE_URL` on boot
- `TRUST_PROXY` — `1` or `true` behind a reverse proxy (optional `TRUST_PROXY_HOPS`)

## Local development (Postgres required)

```bash
docker compose up -d          # start postgres
npx prisma migrate dev        # run migrations (dev workflow)
npx prisma studio             # visual DB browser (optional)
npm install
npm run dev
```

`npm run dev` runs **`tsc` in watch mode** and starts **`node dist/server.js`** after each successful compile. (Prisma’s generated client uses `.js` import specifiers next to `.ts` sources; running TypeScript directly with `tsx` does not resolve those paths, so the dev server runs compiled output instead.)

Apply migrations against an existing database without prompts:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Docker (app + Postgres)

Set **`JWT_SECRET` to at least 32 characters** in your Compose `.env` (the app container uses **`NODE_ENV=production`**).

```bash
docker compose up -d --build
```

The app image runs `prisma migrate deploy` before starting the server.

## Stop containers

```bash
docker compose down           # stop containers
docker compose down -v        # stop and wipe volumes (destructive)
```

## API overview

- `POST /api/auth/signup` — register (optional `email`; synthetic email is used if omitted)
- `POST /api/auth/login` — returns JWT + user
- `GET /api/auth/users` — **mutual** contacts only (auth)
- `POST /api/auth/contacts/request` — send contact request `{ "username" }`; if the other person already requested you, you connect immediately (auth)
- `GET /api/auth/contacts/requests/incoming` / `.../outgoing` — pending requests (auth)
- `POST /api/auth/contacts/requests/:id/accept` | `.../reject` — accept or decline (auth)
- `DELETE /api/auth/contacts/requests/:id` — cancel your outgoing request (auth)
- `DELETE /api/auth/contacts/:contactId` — remove mutual connection (both edges) (auth)
- `PATCH /api/auth/me/avatar` — multipart field `avatar` (image)
- `GET|POST` message routes under `/api/msg`
- Conversation archive/restore under `/api/conversations`

Uploaded files are served from `/uploads/…` relative to the API origin.

**Health:** `GET /health` — `200` if the database is up (for probes).
