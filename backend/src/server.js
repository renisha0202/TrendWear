import "dotenv/config";
import mongoose from "mongoose";
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

  if (
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_KEY_ID !== "rzp_test_your_key_id"
  ) {
    console.log("Razorpay configuration loaded.");
  } else {
    console.warn(
      "Razorpay test credentials are not configured or using placeholders in .env."
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