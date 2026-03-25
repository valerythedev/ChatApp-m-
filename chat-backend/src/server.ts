import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import path from "node:path";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.routes.js";
import msgRoutes from "./routes/message.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import { registerSocketHandlers } from "./socket/io.js";
import { setIoInstance } from "./socket/instance.js";
import { prisma } from "./lib/prisma.js";
import { ensureUploadDir, UPLOAD_DIR } from "./middleware/upload.js";

const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: frontendOrigin, credentials: true },
});

setIoInstance(io);
registerSocketHandlers(io);

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/", (_req, res) => {
  res.send("💬 Chat backend (PostgreSQL + Prisma)");
});

app.use("/api/auth", authRoutes);
app.use("/api/msg", msgRoutes);
app.use("/api/conversations", conversationRoutes);

const PORT = Number(process.env.PORT ?? "5550");

async function start(): Promise<void> {
  ensureUploadDir();
  await prisma.$connect();
  server.listen(PORT, () => {
    console.log(`🚀 Server + Socket.IO on http://localhost:${PORT}`);
    console.log(`📁 Uploads: ${path.resolve(UPLOAD_DIR)}`);
  });
}

start().catch((err) => {
  console.error("❌ Failed to start:", err);
  process.exit(1);
});
