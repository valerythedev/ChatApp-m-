// backend/Routes/message.routes.js

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
// Cambiamos de "/chat/:userId" a "/:userId"
- router.get("/chat/:userId", verifyToken, getMessages);
+ router.get("/:userId", verifyToken, getMessages);

export default router;
