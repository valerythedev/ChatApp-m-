// backend/testServer.js
import express from "express";

const app = express();
const PORT = 5555;

app.use(express.json());

console.log("🔥 Mini servidor cargado");

app.get("/", (req, res) => {
  res.send("🧪 Mini backend activo");
});

app.post("/login", (req, res) => {
  console.log("💥 Entró a login ruta (aislado)");
  res.send("Hello from isolated login!");
});

app.listen(PORT, () => {
  console.log(`🚀 Mini servidor corriendo en http://localhost:${PORT}`);
});
