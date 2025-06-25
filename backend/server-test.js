// backend/server-test.js

import express from "express";

const app = express();
const PORT = 5555;

// Middleware comentado para aislar completamente
// app.use(express.json());

console.log("🔥 Mini servidor Express levantado");

// Ruta GET simple
app.get("/", (req, res) => {
  res.send("Servidor Express está vivo 💓");
});

// Ruta POST directa
app.post("/prueba", (req, res) => {
  console.log("💥 Entró a /prueba DIRECTAMENTE");
  res.send("Ruta POST directa funcionando");
});

app.listen(PORT, () => {
  console.log(`🚀 Escuchando en http://localhost:${PORT}`);
});
