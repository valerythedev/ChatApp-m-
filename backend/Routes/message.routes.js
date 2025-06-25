import express from "express";
import {
  sendMessage,
  getInbox,
  getMessages
} from "../controllers/message.controller.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/send", verifyToken, sendMessage);
router.get("/inbox", verifyToken, getInbox);
router.get("/chat/:userId", verifyToken, getMessages);// 👈 esta es la que se activa en /msg/:userId

export default router;
