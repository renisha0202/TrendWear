import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { addWishlistItem, getWishlist, removeWishlistItem } from "../controllers/wishlistController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(authenticate);
router.get("/", asyncHandler(getWishlist));
router.post("/items", asyncHandler(addWishlistItem));
router.delete("/items/:productId", asyncHandler(removeWishlistItem));

export default router;
