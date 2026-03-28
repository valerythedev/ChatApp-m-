import { Router } from "express";
import {
  signup,
  login,
  logout,
  listContacts,
  sendContactRequest,
  listIncomingContactRequests,
  listOutgoingContactRequests,
  acceptContactRequest,
  rejectContactRequest,
  cancelContactRequest,
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
router.post("/contacts/request", verifyToken, sendContactRequest);
router.get("/contacts/requests/incoming", verifyToken, listIncomingContactRequests);
router.get("/contacts/requests/outgoing", verifyToken, listOutgoingContactRequests);
router.post("/contacts/requests/:requestId/accept", verifyToken, acceptContactRequest);
router.post("/contacts/requests/:requestId/reject", verifyToken, rejectContactRequest);
router.delete("/contacts/requests/:requestId", verifyToken, cancelContactRequest);
router.delete("/contacts/:contactId", verifyToken, removeContact);
router.patch("/me/avatar", verifyToken, uploadMiddleware.single("avatar"), updateAvatar);

router.get("/me", verifyToken, (req, res) => {
  res.status(200).json({
    message: "Token is valid ✅",
    user: req.user,
  });
});

export default router;
