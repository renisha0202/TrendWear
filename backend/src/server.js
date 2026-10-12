import "dotenv/config";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";

const port = Number.parseInt(process.env.PORT, 10) || 5000;

// Validate required environment variables
async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error(
      "JWT_SECRET must be configured with at least 32 characters."
    );
  }

  // Connect to MongoDB
  await connectDatabase();

  // Configure Razorpay only when credentials are available
  if (
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
  ) {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Create Razorpay order
    app.post("/create-order", async (req, res) => {
      try {
        const amount = Number(req.body?.amount);

        if (!Number.isSafeInteger(amount) || amount <= 0) {
          return res.status(400).json({
            success: false,
            message: "A valid amount in paise is required.",
          });
        }

        const order = await razorpay.orders.create({
          amount,
          currency: "INR",
          receipt: `receipt_${Date.now()}`,
        });

        return res.status(201).json({
          success: true,
          order,
          keyId: process.env.RAZORPAY_KEY_ID,
        });
      } catch (error) {
        console.error("Razorpay order creation failed:", error.message);

        return res.status(500).json({
          success: false,
          message: "Unable to create payment order.",
        });
      }
    });

    console.log("Razorpay configuration loaded.");
  } else {
    console.warn(
      "Razorpay credentials are missing. Payment order creation is disabled."
    );
  }

  // Start Express server
  const server = app.listen(port, () => {
    console.log(`TrendWear API listening on port ${port}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    server.close(async () => {
      try {
        await mongoose.disconnect();
        console.log("MongoDB disconnected.");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error.message);
        process.exit(1);
      }
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error(`Unable to start TrendWear API: ${error.message}`);
  process.exit(1);
});