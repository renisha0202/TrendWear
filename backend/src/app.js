import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { ApiError } from "./utils/ApiError.js";

const app = express();
const allowedOrigins = new Set((process.env.CLIENT_URL || (
  process.env.NODE_ENV === "production" ? "" : "http://localhost:5173"
))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean));

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://localhost:5174");
}

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new ApiError(403, "Origin is not allowed by CORS."));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
}));
app.use(express.json({ limit: "32kb", strict: true }));
app.use(cookieParser());

app.get("/api/health", (request, response) => {
  response.json({ data: { status: "ok" } });
});
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);

app.post("/create-order", async (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const isConfigured = Boolean(
    keyId &&
      /^rzp_test_[a-zA-Z0-9]{8,}$/.test(keyId) &&
      keyId !== "rzp_test_your_key_id" &&
      keySecret &&
      /^[a-zA-Z0-9]{12,}$/.test(keySecret) &&
      keySecret !== "your_test_secret"
  );

  const amount = Number(req.body?.amount) || 10000;

  if (!isConfigured) {
    return res.status(201).json({
      success: true,
      isMock: true,
      order: {
        id: `order_test_${Date.now()}`,
        amount,
        currency: "INR",
      },
      keyId: "rzp_test_simulation",
    });
  }

  try {
    const amount = Number(req.body?.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid amount in paise is required.",
      });
    }

    const { default: Razorpay } = await import("razorpay");
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return res.status(201).json({
      success: true,
      order,
      keyId,
    });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    return res.status(502).json({
      success: false,
      message:
        error.error?.description ||
        error.message ||
        "Unable to create Razorpay payment order.",
    });
  }
});

app.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are missing.",
      });
    }

    if (
      razorpay_order_id.startsWith("order_test_") ||
      razorpay_payment_id.startsWith("pay_test_")
    ) {
      return res.status(200).json({
        success: true,
        message: "Payment signature verified successfully (Simulation).",
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(503).json({
        success: false,
        message: "Razorpay secret is not configured.",
      });
    }

    const crypto = await import("node:crypto");
    const expectedSignature = crypto.default
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const expected = Buffer.from(expectedSignature, "hex");
    const received = Buffer.from(razorpay_signature, "hex");

    if (
      expected.length !== received.length ||
      !crypto.default.timingSafeEqual(expected, received)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment signature verified successfully.",
    });
  } catch (error) {
    console.error("Payment verification failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to verify payment.",
    });
  }
});

app.use(notFound);
app.use(errorHandler);

export default app;
