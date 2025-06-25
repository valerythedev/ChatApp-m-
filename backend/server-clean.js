// backend/server-clean.js

import express from "express";
import authRoutes from "./Routes/auth.routes.js"; // 👈 aseguramos esta ruta

const app = express();
const PORT = 5555;

// Middleware JSON activo (ya que estamos controlando el body)
app.use(express.json());

console.log("🔥 Mini servidor con rutas montadas");

// Ruta raíz para confirmar vida
app.get("/", (req, res) => {
  res.send("Servidor con rutas está vivo 💓");
});

// Montamos rutas de autenticación
app.use("/api/auth", authRoutes);

// Arranque del servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
