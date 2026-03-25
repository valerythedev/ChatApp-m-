import { Router } from "express";
import {
  archiveConversation,
  restoreConversation,
  listArchived,
} from "../controllers/conversation.controller.js";
import verifyToken from "../middleware/verifyToken.js";

const router = Router();

router.get("/archived", verifyToken, listArchived);
router.post("/:conversationId/archive", verifyToken, archiveConversation);
router.post("/:conversationId/restore", verifyToken, restoreConversation);

export default router;
