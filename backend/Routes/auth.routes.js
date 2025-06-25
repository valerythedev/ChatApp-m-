import express from "express";
import { signup, login, logout } from "../controllers/auth.controller.js";
import verifyToken from "../middleware/verifyToken.js"; // ✅ asegúrate que la ruta coincida

console.log("📦 auth.routes.js cargado");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// 🔐 Ruta protegida para probar
router.get("/me", verifyToken, (req, res) => {
    res.status(200).json({
        message: "Token is valid ✅",
        user: req.user
    });
});

export default router;
