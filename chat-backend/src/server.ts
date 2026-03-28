import "dotenv/config";
import express from "express";
import http from "node:http";
import path from "node:path";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.routes.js";
import msgRoutes from "./routes/message.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import { corsConfig, getAllowedOrigins } from "./lib/cors.js";
import { assertProductionSafeToStart } from "./lib/productionGuard.js";
import { registerSocketHandlers } from "./socket/io.js";
import { setIoInstance } from "./socket/instance.js";
import { prisma } from "./lib/prisma.js";
import { ensureUploadDir, UPLOAD_DIR } from "./middleware/upload.js";

const allowedOrigins = getAllowedOrigins();

const app = express();
const server = http.createServer(app);

if (process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true") {
  const hops = Number(process.env.TRUST_PROXY_HOPS ?? "1");
  app.set("trust proxy", Number.isFinite(hops) && hops > 0 ? hops : 1);
} else if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

setIoInstance(io);
registerSocketHandlers(io);

app.use(corsConfig);
app.options("*", corsConfig);
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/", (_req, res) => {
  res.type("text/plain").send("Tiny Chat API — ok");
});

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ok: true, service: "tiny-chat-api" });
  } catch {
    res.status(503).json({ ok: false, service: "tiny-chat-api" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/msg", msgRoutes);
app.use("/api/conversations", conversationRoutes);

const PORT = Number(process.env.PORT ?? "5550");

async function shutdown(signal: string): Promise<void> {
  console.info(`${signal}: closing HTTP server…`);
  if (server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
  await prisma.$disconnect();
  process.exit(0);
}

async function start(): Promise<void> {
  assertProductionSafeToStart();
  ensureUploadDir();
  await prisma.$connect();
  server.listen(PORT, () => {
    console.log(`Server + Socket.IO listening on port ${PORT} (${process.env.NODE_ENV ?? "development"})`);
    console.log(`Uploads: ${path.resolve(UPLOAD_DIR)}`);
    console.log(`CORS origins: ${allowedOrigins.join(", ")}`);
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM").catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });
  process.once("SIGINT", () => {
    void shutdown("SIGINT").catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
