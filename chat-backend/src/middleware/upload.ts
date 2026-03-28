import fs from "node:fs";
import path from "node:path";
import type { Request } from "express";
import multer from "multer";
import { isSupabaseStorageConfigured } from "../lib/supabase.js";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "application/pdf",
]);

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function maxBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? "10");
  return (Number.isFinite(mb) ? mb : 10) * 1024 * 1024;
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname) || "";
    cb(null, `${unique}${ext}`);
  },
});

const storage = isSupabaseStorageConfigured() ? multer.memoryStorage() : diskStorage;

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error(`File type not allowed: ${file.mimetype}`));
}

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: maxBytes() },
  fileFilter,
});
