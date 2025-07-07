import { getAllUsers } from "../controllers/user.controller.js";
import verifyToken from "../middleware/verifyToken.js";

router.get("/users", verifyToken, getAllUsers);
