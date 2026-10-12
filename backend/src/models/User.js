import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    phone: { type: String, required: true, trim: true, match: /^\+?[1-9]\d{6,14}$/ },
    gender: {
      type: String,
      required: true,
      enum: ["female", "male", "non-binary", "prefer-not-to-say"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer"], default: "customer", immutable: true },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
