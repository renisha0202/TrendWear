import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authRateLimit } from "../middleware/authRateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { currentUser, login, logout, register } from "../controllers/authController.js";

const router = Router();
router.post("/register", authRateLimit, asyncHandler(register));
router.post("/login", authRateLimit, asyncHandler(login));
router.get("/me", authenticate, asyncHandler(currentUser));
router.post("/logout", asyncHandler(logout));

export default router;
