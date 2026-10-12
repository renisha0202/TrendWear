import { Order } from "../models/Order.js";
import { ApiError } from "../utils/ApiError.js";
import { createOrder, cancelOrder } from "../services/orderService.js";
import { requireObjectBody, validateCustomer, validateItems } from "../utils/validation.js";

export async function submitOrder(request, response) {
  requireObjectBody(request.body);
  const items = validateItems(request.body.items);
  const customer = validateCustomer(request.body.customer);
  const suppliedKey = request.get("Idempotency-Key");
  if (suppliedKey && (suppliedKey.length > 100 || !/^[\w.-]+$/.test(suppliedKey))) {
    throw new ApiError(400, "Idempotency-Key must be at most 100 letters, digits, dots, underscores, or hyphens.");
  }

  const isDevelopment = process.env.NODE_ENV === "development" ||
    (process.env.NODE_ENV === undefined && process.execArgv.includes("--watch"));
  if (isDevelopment) {
    console.info("Order creation accepted", {
      itemCount: items.length,
      authenticated: Boolean(request.user?._id),
      idempotencyKeyProvided: Boolean(suppliedKey),
    });
  }

  const result = await createOrder({
    userId: request.user._id,
    items,
    customer,
    idempotencyKey: suppliedKey,
  });
  response.status(result.created ? 201 : 200).json({ data: { order: result.order } });
}

export async function listOrders(request, response) {
  const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(request.query.limit, 10) || 20));
  const [orders, total] = await Promise.all([
    Order.find({ user: request.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments({ user: request.user._id }),
  ]);
  response.json({ data: orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function getOrder(request, response) {
  const order = await Order.findOne({ orderNumber: request.params.orderNumber, user: request.user._id }).lean();
  if (!order) throw new ApiError(404, "Order was not found.");
  response.json({ data: { order } });
}

export async function cancelCustomerOrder(request, response) {
  const order = await cancelOrder({ userId: request.user._id, orderNumber: request.params.orderNumber });
  response.json({ data: { order } });
}
