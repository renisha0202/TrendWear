import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    kind: { type: String, enum: ["category", "collection"], required: true, index: true },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    image: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

categorySchema.index({ kind: 1, slug: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);
