import cors from "cors";

function stripTrailingSlash(origin: string): string {
  return origin.replace(/\/+$/, "");
}

/** Env-based origins (comma-separated supported). No trailing slashes — they are stripped. */
function originsFromEnv(): string[] {
  const out: string[] = [];
  for (const key of ["FRONTEND_URL", "FRONTEND_ORIGIN"] as const) {
    const raw = process.env[key];
    if (!raw?.trim()) continue;
    for (const part of raw.split(",")) {
      const t = stripTrailingSlash(part.trim());
      if (t) out.push(t);
    }
  }
  return out;
}

/** Origins allowed for Express CORS and Socket.IO (never `*`). */
export function getAllowedOrigins(): string[] {
  const fromEnv = originsFromEnv();
  const local = ["http://localhost:5173", "http://localhost:3000"].map(stripTrailingSlash);
  return [...new Set([...fromEnv, ...local])];
}

export const corsConfig = cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    const normalized = stripTrailingSlash(origin);
    if (getAllowedOrigins().includes(normalized)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});
