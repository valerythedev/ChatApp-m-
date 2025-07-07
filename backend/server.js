// backend/server.js

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket/io.js"; 
import authRoutes from "./Routes/auth.routes.js";
import msgRoutes from "./Routes/message.routes.js";
import connectToMongoDb from "./DB/connectToDB.js";

dotenv.config();

const app = express();
const server = http.createServer(app); // ⚡️ base para Socket.IO

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // frontend
    credentials: true,
  },
});

// 🧠 Habilitamos sockets
registerSocketHandlers(io);

// 🌐 Middlewares
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// 🛠️ Rutas
app.get("/", (req, res) => {
  res.send("💬 Servidor activo con Socket.IO");
});
app.use("/api/auth", authRoutes);
app.use("/api/msg", msgRoutes);

// 🚀 Arrancar servidor
const PORT = process.env.PORT || 5550;
const startServer = async () => {
  try {
    await connectToMongoDb();
    server.listen(PORT, () => {
      console.log(`🚀 Server + Socket.IO escuchando en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ MongoDB no conectado:", err.message);
    process.exit(1);
  }
};

startServer();
