import type { NextFunction, Request, Response } from "express";
import { uploadMiddleware } from "./upload.js";

export function optionalFileUpload(req: Request, res: Response, next: NextFunction): void {
  const ct = req.headers["content-type"] ?? "";
  if (ct.includes("multipart/form-data")) {
    uploadMiddleware.single("file")(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        res.status(400).json({ error: message });
        return;
      }
      next();
    });
    return;
  }
  next();
}
