import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 1,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    mobile: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
      maxlength: 300,
    },
    state: {
      type: String,
      required: true,
      maxlength: 80,
    },
    city: {
      type: String,
      required: true,
      maxlength: 80,
    },
    pinCode: {
      type: String,
      required: true,
      match: /^\d{6}$/,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    idempotencyKey: {
      type: String,
      maxlength: 100,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: (items) => items.length > 0,
    },

    customer: {
      type: customerSchema,
      required: true,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 1,
    },

    total: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    // Razorpay order ID
    razorpayOrderId: {
      type: String,
      default: null,
      index: true,
    },

    // Razorpay payment ID
    razorpayPaymentId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

orderSchema.index(
  { user: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" },
    },
  }
);

orderSchema.index({ user: 1, createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);