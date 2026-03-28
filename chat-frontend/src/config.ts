function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const apiOriginRaw =
  import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_ORIGIN;
const apiOrigin = required("VITE_API_URL (or VITE_API_ORIGIN for local)", apiOriginRaw).replace(/\/$/, "");
const socketOrigin = (import.meta.env.VITE_SOCKET_ORIGIN ?? apiOrigin).replace(/\/$/, "");

export const appConfig = {
  apiOrigin,
  socketOrigin,
  maxUploadMb: Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? "10"),
} as const;

export type AppConfig = typeof appConfig;
