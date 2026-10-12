import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from "../controllers/cartController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(authenticate);
router.get("/", asyncHandler(getCart));
router.post("/items", asyncHandler(addCartItem));
router.patch("/items/:productId", asyncHandler(updateCartItem));
router.delete("/items/:productId", asyncHandler(removeCartItem));
router.delete("/", asyncHandler(clearCart));

export default router;
