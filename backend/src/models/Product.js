import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    legacyId: { type: Number, unique: true, sparse: true },
    name: { type: String, required: true, trim: true, maxlength: 160, index: true },
    category: { type: String, required: true, trim: true, uppercase: true, index: true },
    price: { type: Number, required: true, min: 1 },
    image: { type: String, required: true, trim: true },
    rating: { type: Number, min: 0, max: 5, default: 5 },
    badge: { type: String, trim: true, maxlength: 40, default: "" },
    collections: { type: [String], default: [], index: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
productSchema.index({ name: "text", category: "text" });
productSchema.index({ active: 1, price: 1 });

export const Product = mongoose.model("Product", productSchema);
