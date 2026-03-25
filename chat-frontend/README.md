# Chat Frontend

Vite + React 19 + TypeScript + Tailwind CSS v4 + TanStack Query + Socket.IO client.

## Environment

Copy `.env.example` to `.env`:

| Variable | Description |
|----------|-------------|
| `VITE_API_ORIGIN` | Backend base URL (no trailing slash), e.g. `http://localhost:5550` |
| `VITE_SOCKET_ORIGIN` | Optional Socket.IO origin; defaults to `VITE_API_ORIGIN` |
| `VITE_MAX_UPLOAD_MB` | Client-side upload size limit (should match backend) |

All runtime configuration is read through `src/config.ts` only.

## Scripts

```bash
npm install
npm run dev       # Vite dev server (default http://localhost:5173)
npm run build     # Typecheck + production build
npm run preview   # Preview production build
```

## Features (overview)

- Strict TypeScript; path aliases `@/*` → `src/*`
- API access only via `src/services/api.ts` (no `fetch` in components)
- Environment variables only via `src/config.ts` (no `import.meta.env` in UI components)
- React Query for conversations/messages and mutations for send/delete/archive/avatar
- Read receipts: marked when the chat region gains focus / window gains focus / tab becomes visible (Socket.IO + query invalidation)
- Media messages, avatar upload, conversation archive/restore, message hard-delete (context menu)
- Dark mode by default; sun/moon toggle with `localStorage` persistence and flash-free startup script in `index.html`

## Production

Build static assets with `npm run build` and serve `dist/` behind your CDN or static host. Point `VITE_API_ORIGIN` at your deployed API and ensure CORS + cookie/socket settings match.
