import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { cancelCustomerOrder, getOrder, listOrders, submitOrder } from "../controllers/orderController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(authenticate);
router.post("/", asyncHandler(submitOrder));
router.get("/", asyncHandler(listOrders));
router.get("/:orderNumber", asyncHandler(getOrder));
router.post("/:orderNumber/cancel", asyncHandler(cancelCustomerOrder));

export default router;
