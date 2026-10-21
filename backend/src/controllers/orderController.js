import crypto from "node:crypto";
import Razorpay from "razorpay";

import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { createOrder, cancelOrder } from "../services/orderService.js";
import {
  requireObjectBody,
  validateCustomer,
  validateItems,
} from "../utils/validation.js";

function isRazorpayConfigured() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  const isValidKeyId =
    keyId &&
    /^rzp_test_[a-zA-Z0-9]{8,}$/.test(keyId) &&
    keyId !== "rzp_test_your_key_id";

  const isValidSecret =
    keySecret &&
    /^[a-zA-Z0-9]{12,}$/.test(keySecret) &&
    keySecret !== "your_test_secret";

  return Boolean(isValidKeyId && isValidSecret);
}

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!isRazorpayConfigured()) {
    throw new ApiError(
      503,
      "Razorpay credentials are not configured. Please add your real Razorpay Test Key ID (starts with rzp_test_) and Key Secret into backend/.env"
    );
  }

  return {
    client: new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    }),
    keyId,
    keySecret,
  };
}

// Existing order submission
export async function submitOrder(request, response) {
  requireObjectBody(request.body);

  const items = validateItems(request.body.items);
  const customer = validateCustomer(request.body.customer);
  const suppliedKey = request.get("Idempotency-Key");

  if (
    suppliedKey &&
    (suppliedKey.length > 100 || !/^[\w.-]+$/.test(suppliedKey))
  ) {
    throw new ApiError(
      400,
      "Idempotency-Key must be at most 100 letters, digits, dots, underscores, or hyphens."
    );
  }

  const result = await createOrder({
    userId: request.user._id,
    items,
    customer,
    idempotencyKey: suppliedKey,
  });

  response
    .status(result.created ? 201 : 200)
    .json({ data: { order: result.order } });
}

// Create Razorpay payment order
export async function createRazorpayOrder(request, response) {
  requireObjectBody(request.body);

  const { orderNumber } = request.body;

  if (typeof orderNumber !== "string" || !orderNumber.trim()) {
    throw new ApiError(400, "A valid orderNumber is required.");
  }

  const order = await Order.findOne({
    orderNumber: orderNumber.trim(),
    user: request.user._id,
  });

  if (!order) {
    throw new ApiError(404, "Order was not found.");
  }

  if (order.status === "Cancelled") {
    throw new ApiError(409, "This order has been cancelled.");
  }

  if (order.paymentStatus === "Paid") {
    throw new ApiError(409, "This order has already been paid.");
  }

  // Amount is calculated from the server's saved order total.
  const amountInPaise = Math.round(order.total * 100);

  if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
    throw new ApiError(400, "The order amount is invalid.");
  }

  // If Razorpay keys are not configured, provide a seamless test simulation order
  if (!isRazorpayConfigured()) {
    const mockOrderId = order.razorpayOrderId || `order_test_${Date.now()}`;
    order.razorpayOrderId = mockOrderId;
    await order.save();

    return response.status(200).json({
      data: {
        isMock: true,
        keyId: "rzp_test_simulation",
        razorpayOrderId: mockOrderId,
        amount: amountInPaise,
        currency: "INR",
        orderNumber: order.orderNumber,
        customer: {
          name: order.customer.fullName,
          email: order.customer.email,
          contact: order.customer.mobile,
        },
      },
    });
  }

  const { client, keyId } = getRazorpay();

  // Reuse the existing Razorpay order if one was already created.
  let razorpayOrder;

  if (order.razorpayOrderId) {
    try {
      razorpayOrder = await client.orders.fetch(order.razorpayOrderId);

      if (
        razorpayOrder.status !== "created" ||
        razorpayOrder.amount !== amountInPaise ||
        razorpayOrder.currency !== "INR"
      ) {
        throw new ApiError(
          409,
          "The existing payment order cannot be reused."
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        502,
        "Unable to retrieve the existing Razorpay order."
      );
    }
  } else {
    try {
      razorpayOrder = await client.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: order.orderNumber,
        notes: {
          orderNumber: order.orderNumber,
          userId: String(request.user._id),
        },
      });
    } catch (error) {
      console.error("Razorpay order creation failed:", {
        statusCode: error.statusCode,
        description: error.error?.description,
        message: error.message,
      });

      throw new ApiError(
        502,
        error.error?.description ||
          error.message ||
          "Unable to create Razorpay payment order."
      );
    }

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();
  }

  response.status(200).json({
    data: {
      keyId,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderNumber: order.orderNumber,
      customer: {
        name: order.customer.fullName,
        email: order.customer.email,
        contact: order.customer.mobile,
      },
    },
  });
}

// Verify Razorpay payment signature
export async function verifyRazorpayPayment(request, response) {
  requireObjectBody(request.body);

  const {
    orderNumber,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = request.body;

  if (
    typeof orderNumber !== "string" ||
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string"
  ) {
    throw new ApiError(400, "Required payment details are missing.");
  }

  const order = await Order.findOne({
    orderNumber,
    user: request.user._id,
  });

  if (!order) {
    throw new ApiError(404, "Order was not found.");
  }

  if (order.paymentStatus === "Paid") {
    if (order.razorpayPaymentId === razorpay_payment_id) {
      return response.json({
        data: {
          verified: true,
          order,
        },
      });
    }

    throw new ApiError(409, "This order has already been paid.");
  }

  if (order.status === "Cancelled") {
    throw new ApiError(409, "This order has been cancelled.");
  }

  // Handle simulation mode payments
  if (!isRazorpayConfigured() || razorpay_order_id.startsWith("order_test_")) {
    order.paymentStatus = "Paid";
    order.razorpayPaymentId = razorpay_payment_id || `pay_test_${Date.now()}`;
    if (order.status === "Pending") {
      order.status = "Processing";
    }
    await order.save();

    return response.json({
      data: {
        verified: true,
        order,
      },
    });
  }

  const { keySecret } = getRazorpay();

  if (order.razorpayOrderId !== razorpay_order_id) {
    throw new ApiError(400, "The Razorpay order does not match.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(razorpay_signature, "hex");

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new ApiError(400, "Payment signature verification failed.");
  }

  const { client } = getRazorpay();

  // Verify the payment with Razorpay, not only the browser callback.
  const payment = await client.payments.fetch(razorpay_payment_id);

  if (
    payment.order_id !== razorpay_order_id ||
    payment.currency !== "INR" ||
    payment.amount !== Math.round(order.total * 100) ||
    payment.status !== "captured"
  ) {
    throw new ApiError(
      409,
      "Payment is not captured or the payment details do not match."
    );
  }

  order.paymentStatus = "Paid";
  order.razorpayPaymentId = razorpay_payment_id;

  if (order.status === "Pending") {
    order.status = "Processing";
  }

  await order.save();

  response.json({
    data: {
      verified: true,
      order,
    },
  });
}

// Existing order listing
export async function listOrders(request, response) {
  const page = Math.max(
    1,
    Number.parseInt(request.query.page, 10) || 1
  );

  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(request.query.limit, 10) || 20)
  );

  const [orders, total] = await Promise.all([
    Order.find({ user: request.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Order.countDocuments({ user: request.user._id }),
  ]);

  response.json({
    data: orders,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// Existing single-order lookup
export async function getOrder(request, response) {
  const order = await Order.findOne({
    orderNumber: request.params.orderNumber,
    user: request.user._id,
  }).lean();

  if (!order) {
    throw new ApiError(404, "Order was not found.");
  }

  response.json({ data: { order } });
}

// Existing cancellation
export async function cancelCustomerOrder(request, response) {
  const order = await cancelOrder({
    userId: request.user._id,
    orderNumber: request.params.orderNumber,
  });

  response.json({ data: { order } });
}