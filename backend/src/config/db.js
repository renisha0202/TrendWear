
import mongoose from "mongoose";

export async function connectDatabase(
  uri = process.env.MONGODB_URI
) {
  try {
    // Check MongoDB URI
    if (!uri) {
      throw new Error("MONGODB_URI is required in the .env file");
    }

    // Configure Mongoose
    mongoose.set("strictQuery", true);

    // Connect to MongoDB
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    // Display connection details
    console.log("✅ MongoDB connected successfully!");
    console.log(
      `📦 Database name: ${mongoose.connection.name}`
    );
    console.log(
      `🔗 Connection state: ${mongoose.connection.readyState}`
    );

    // Monitor future connection events
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });

    mongoose.connection.on("error", (error) => {
      console.error("❌ MongoDB connection error:", error.message);
    });

    return mongoose.connection;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
}
