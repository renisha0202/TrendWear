import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";

function createOrderNumber() {
  return `TW-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createOrder({ userId, items, customer, idempotencyKey }) {
  if (idempotencyKey) {
    const previous = await Order.findOne({ user: userId, idempotencyKey });
    if (previous) return { order: previous, created: false };
  }

  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const orderItems = [];
      let subtotal = 0;

      for (const item of items) {
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, active: true, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true, session }
        );
        if (!product) {
          const exists = await Product.exists({ _id: item.productId }).session(session);
          if (!exists) throw new ApiError(404, "A selected product was not found.");
          throw new ApiError(409, "A selected product is unavailable or has insufficient stock.");
        }

        const lineTotal = product.price * item.quantity;
        subtotal += lineTotal;
        orderItems.push({
          product: product._id,
          name: product.name,
          image: product.image,
          quantity: item.quantity,
          unitPrice: product.price,
          lineTotal,
        });
      }

      const [createdOrder] = await Order.create(
        [{
          orderNumber: createOrderNumber(),
          user: userId,
          ...(idempotencyKey ? { idempotencyKey } : {}),
          items: orderItems,
          customer,
          subtotal,
          total: subtotal,
          status: "Pending",
          paymentStatus: "Pending",
        }],
        { session }
      );
      order = createdOrder;
    });
    return { order, created: true };
  } catch (error) {
    if (error.code === 11000 && idempotencyKey) {
      const previous = await Order.findOne({ user: userId, idempotencyKey });
      if (previous) return { order: previous, created: false };
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function cancelOrder({ userId, orderNumber }) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ orderNumber, user: userId }).session(session);
      if (!order) throw new ApiError(404, "Order was not found.");
      if (order.status === "Cancelled") {
        result = order;
        return;
      }
      if (order.status !== "Pending" || order.paymentStatus !== "Pending") {
        throw new ApiError(409, "Only Pending orders can be cancelled.");
      }

      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } },
          { session }
        );
      }
      order.status = "Cancelled";
      await order.save({ session });
      result = order;
    });
    return result;
  } finally {
    await session.endSession();
  }
}
