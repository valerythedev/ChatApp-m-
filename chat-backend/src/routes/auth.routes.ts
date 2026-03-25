import { Router } from "express";
import {
  signup,
  login,
  logout,
  listContacts,
  addContact,
  removeContact,
  updateAvatar,
} from "../controllers/auth.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import { uploadMiddleware } from "../middleware/upload.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/users", verifyToken, listContacts);
router.post("/contacts", verifyToken, addContact);
router.delete("/contacts/:contactId", verifyToken, removeContact);
router.patch("/me/avatar", verifyToken, uploadMiddleware.single("avatar"), updateAvatar);

router.get("/me", verifyToken, (req, res) => {
  res.status(200).json({
    message: "Token is valid ✅",
    user: req.user,
  });
});

export default router;
