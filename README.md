# Tiny Chat

A small real-time direct-messaging app with a **terminal-inspired** UI. This repository is a **monorepo**: the active application lives in **`chat-backend`** (Express, Prisma, Socket.IO, PostgreSQL) and **`chat-frontend`** (Vite, React 19, TypeScript, Tailwind v4). The legacy **`backend`** and **`frontend`** directories at the repo root are **deprecated** and are listed in `.gitignore` so day-to-day work stays focused on the new stack.

---

## What you get

- **Auth** — Sign up / sign in; JWT stored in the browser; optional avatar upload.
- **People** — You only see users **you add as contacts** (by exact username). You cannot browse every account on the server from the UI.
- **Direct messages** — HTTP + Socket.IO; typing indicators; read receipts; images, video, audio, and documents within configurable size limits.
- **Inbox** — Conversation list with swipe/drag to archive; separate **Archived** tab with restore.
- **Themes** — Light/dark toggle with persistence.

---

## Repository layout

| Path | Role |
|------|------|
| `chat-backend/` | API, WebSocket server, Prisma schema & migrations, Docker image |
| `chat-frontend/` | SPA served by Vite |
| `package.json` (root) | Convenience scripts: `dev:backend`, `dev:frontend` |
| `backend/`, `frontend/` | **Legacy** — ignored by Git (see `.gitignore`); do not use for new work |

---

## Prerequisites

- **Node.js** (LTS recommended) and npm
- **PostgreSQL** 14+ (local install or Docker)
- **Docker** (optional) — for Compose-based Postgres and optional full stack

---

## Quick start (local)

### 1. Database

Ensure PostgreSQL is running and a database exists (see `chat-backend/.env.example` for typical user/db names).

From **`chat-backend`**:

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, FRONTEND_ORIGIN, PORT, etc.
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

The API listens on **`PORT`** (default **5550**).

### 2. Frontend

From **`chat-frontend`**:

```bash
cp .env.example .env
# Set VITE_API_ORIGIN to match the API, e.g. http://localhost:5550
npm install
npm run dev
```

Vite defaults to **http://localhost:5173**. That origin must match **`FRONTEND_ORIGIN`** on the backend for CORS.

### 3. From repository root (optional)

```bash
npm install            # root has no deps; optional if you only use prefix runs
npm run dev:backend    # same as npm run dev --prefix chat-backend
npm run dev:frontend   # same as npm run dev --prefix chat-frontend
```

---

## Environment variables

### Backend (`chat-backend/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL URL for Prisma (runtime uses `@prisma/adapter-pg`; CLI uses `prisma.config.ts`) |
| `POSTGRES_*` | Used by Docker Compose for the `postgres` service |
| `JWT_SECRET` | Secret for signing access tokens |
| `FRONTEND_ORIGIN` | Allowed SPA origin(s) for CORS + Socket.IO. **Comma-separated** for multiple (e.g. `https://app.example.com,https://preview.pages.dev`) |
| `PORT` | HTTP/Socket.IO bind port (default `5550`) |
| `MAX_UPLOAD_MB` | Max multipart upload size per file |
| `NODE_ENV` | Set to `production` on live servers (enforces strong secrets; see below) |
| `TRUST_PROXY` | Set `1` or `true` behind a reverse proxy; optional `TRUST_PROXY_HOPS` (default `1`) |

When **`NODE_ENV=production`**, the API **refuses to start** unless **`JWT_SECRET` is at least 32 characters** and **`DATABASE_URL`** is a non-empty PostgreSQL URL.

**Health check:** `GET /health` returns `200` with `{ "ok": true }` when the database is reachable (use for load balancers and uptime monitors).

### Frontend (`chat-frontend/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_ORIGIN` | API base URL, no trailing slash |
| `VITE_SOCKET_ORIGIN` | Optional; defaults to `VITE_API_ORIGIN` |
| `VITE_MAX_UPLOAD_MB` | Client-side cap; should match backend |

Vite **inlines** `VITE_*` at **build time**. For production, set `VITE_API_ORIGIN` (and optional `VITE_SOCKET_ORIGIN`) in the environment or in `.env.production`, then run **`npm run build`**.

All frontend config is centralized in `chat-frontend/src/config.ts`.

---

## Launch checklist (production)

1. **PostgreSQL** — Managed DB or Compose; run migrations: `cd chat-backend && npx prisma migrate deploy`.
2. **Backend env** — `DATABASE_URL`, `JWT_SECRET` (long random string), `NODE_ENV=production`, `FRONTEND_ORIGIN` = **exact** public URL of your SPA (scheme + host + port if any). Must match what browsers send in `Origin`.
3. **TLS** — Terminate HTTPS at your host (Fly, Railway, nginx, Caddy, etc.). Socket.IO works on the same origin as the API; use `wss:` when the page is `https:`.
4. **Frontend build** — `VITE_API_ORIGIN=https://your-api.example.com` then `npm run build` in `chat-frontend`. Deploy the `dist/` folder to static hosting (S3+CloudFront, Netlify, Cloudflare Pages, etc.).
5. **Uploads** — The API stores files under `uploads/` on disk. For Docker, a **named volume** is already used in `docker-compose.yml`. On PaaS, use a persistent disk or migrate to object storage later.
6. **Smoke test** — `GET https://your-api/health`, open the SPA, sign up, add contact, send message, confirm Socket.IO live.

**From repo root:**

```bash
npm run build              # builds chat-backend then chat-frontend
```

---

## Docker

From **`chat-backend`**:

```bash
docker compose up -d --build
```

The app container runs **`prisma migrate deploy`** before starting. See **`chat-backend/README.md`** for teardown and volume wipes.

---

## API overview (chat-backend)

Base path: **`/api`**. All listed routes except signup/login expect **`Authorization: Bearer <token>`** where noted.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/signup` | Register (`username`, `password`, `confirmPassword`; optional `email`, `age`) |
| `POST` | `/api/auth/login` | Returns JWT + user |
| `GET` | `/api/auth/users` | **Your contact list** (public user shapes only) |
| `POST` | `/api/auth/contacts` | Body `{ "username": "<exact>" }` — add contact |
| `DELETE` | `/api/auth/contacts/:contactId` | Remove contact (your side only) |
| `PATCH` | `/api/auth/me/avatar` | Multipart field `avatar` (image) |

### Messaging & conversations

- **`/api/msg`** — Inbox, thread messages, send (multipart), delete message, read markers, etc.
- **`/api/conversations`** — Archive / restore / list archived

Uploaded media is available under **`/uploads/…`** on the API origin.

### Contacts & messaging rules

- The **People** tab is driven by **`GET /api/auth/users`** (contacts only).
- **New** DMs require the recipient to be in **your** contacts.
- **Replies** are allowed in an **existing** thread that already has at least one message (so someone you did not add can still answer from **Chats**).

Real-time events use **Socket.IO** on the same server (join, typing, messages, read receipts). See `chat-backend/src/socket/io.ts`.

---

## Frontend overview (chat-frontend)

- **Stack:** React 19, TanStack Query, Socket.IO client, Tailwind v4, strict TypeScript.
- **Routing:** Landing, login, signup, main chat shell (sidebar + thread).
- **Conventions:** Prefer `src/services/api.ts` for HTTP; config only via `src/config.ts`; path alias `@/*` → `src/*`.

See **`chat-frontend/README.md`** for scripts and production build notes.

---

## Prisma migrations

Schema and SQL migrations live in **`chat-backend/prisma/`**. After pulling new migrations:

```bash
cd chat-backend
npx prisma migrate deploy
npx prisma generate
```

---

## Legacy folders (`backend`, `frontend`)

Older code under **`backend/`** and **`frontend/`** is **not part of the maintained stack**. They are ignored in Git (see root **`.gitignore`**) to avoid mixing old and new changes.

If those paths were already tracked in your clone, remove them from the index once (files stay on disk until you delete them):

```bash
git rm -r --cached backend frontend
```

Then commit the updated `.gitignore` and index. Do not run this if you still rely on the old stack.

---

## License

ISC (see root `package.json`).
