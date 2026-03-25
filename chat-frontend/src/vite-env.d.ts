/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN: string;
  readonly VITE_SOCKET_ORIGIN?: string;
  readonly VITE_MAX_UPLOAD_MB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
