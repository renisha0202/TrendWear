import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  cancelCustomerOrder,
  getOrder,
  listOrders,
  submitOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../controllers/orderController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate);

// Existing order routes
router.post("/", asyncHandler(submitOrder));
router.get("/", asyncHandler(listOrders));
router.get("/:orderNumber", asyncHandler(getOrder));
router.post("/:orderNumber/cancel", asyncHandler(cancelCustomerOrder));

// Razorpay routes
router.post(
  "/razorpay/create-order",
  asyncHandler(createRazorpayOrder)
);

router.post(
  "/razorpay/verify-payment",
  asyncHandler(verifyRazorpayPayment)
);

export default router;