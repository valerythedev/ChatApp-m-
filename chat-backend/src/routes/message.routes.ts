import { Router } from "express";
import {
  sendMessage,
  getInbox,
  getMessages,
  markThreadRead,
  deleteMessage,
  getConversationMeta,
  setMessageReaction,
} from "../controllers/message.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import { optionalFileUpload } from "../middleware/optionalFileUpload.js";

const router = Router();

router.post("/send", verifyToken, optionalFileUpload, sendMessage);
router.get("/inbox", verifyToken, getInbox);
router.post("/read", verifyToken, markThreadRead);
router.get("/meta/:userId", verifyToken, getConversationMeta);
router.delete("/message/:messageId", verifyToken, deleteMessage);
router.post("/message/:messageId/reaction", verifyToken, setMessageReaction);
router.get("/:userId", verifyToken, getMessages);

export default router;
