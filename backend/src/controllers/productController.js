import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { validateObjectId } from "../utils/validation.js";

function serializeProduct(product) {
  const value = product.toObject ? product.toObject() : product;
  return {
    ...value,
    id: value._id.toString(),
    rating: Number(value.rating).toFixed(1),
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listProducts(request, response) {
  const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(request.query.limit, 10) || 24));
  const filter = { active: true };
  const conditions = [];

  if (request.query.category) {
    if (typeof request.query.category !== "string" || request.query.category.length > 100) {
      throw new ApiError(400, "Category filter is invalid.");
    }
    conditions.push({ category: request.query.category.trim().toUpperCase() });
  }
  if (request.query.collection) {
    if (typeof request.query.collection !== "string" || request.query.collection.length > 100) {
      throw new ApiError(400, "Collection filter is invalid.");
    }
    conditions.push({ collections: request.query.collection.trim().toLowerCase() });
  }
  if (request.query.q) {
    if (typeof request.query.q !== "string" || request.query.q.trim().length > 100) {
      throw new ApiError(400, "Search query must be 100 characters or fewer.");
    }
    const query = new RegExp(escapeRegex(request.query.q.trim()), "i");
    conditions.push({ $or: [{ name: query }, { category: query }] });
  }
  if (conditions.length) filter.$and = conditions;

  const sortOptions = {
    featured: { createdAt: -1, _id: 1 },
    "price-low": { price: 1, _id: 1 },
    "price-high": { price: -1, _id: 1 },
  };
  const sort = sortOptions[request.query.sort] || sortOptions.featured;
  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  response.json({
    data: products.map(serializeProduct),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function getProduct(request, response) {
  const id = validateObjectId(request.params.id, "Product ID");
  const product = await Product.findOne({ _id: new mongoose.Types.ObjectId(id), active: true });
  if (!product) throw new ApiError(404, "Product was not found.");
  response.json({ data: serializeProduct(product) });
}
