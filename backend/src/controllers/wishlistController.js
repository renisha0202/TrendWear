import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Wishlist } from "../models/Wishlist.js";
import { ApiError } from "../utils/ApiError.js";
import { requireObjectBody, validateObjectId } from "../utils/validation.js";

async function findOrCreateWishlist(userId) {
  return Wishlist.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, products: [] } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function serializeProducts(products) {
  return products.filter(Boolean).map((product) => ({
    ...product,
    id: product._id.toString(),
    rating: Number(product.rating).toFixed(1),
  }));
}

export async function getWishlist(request, response) {
  const wishlist = await Wishlist.findOne({ user: request.user._id }).populate("products").lean();
  response.json({ data: { products: serializeProducts(wishlist?.products || []) } });
}

export async function addWishlistItem(request, response) {
  requireObjectBody(request.body);
  const productId = validateObjectId(request.body.productId, "Product ID");
  const product = await Product.findOne({ _id: new mongoose.Types.ObjectId(productId), active: true });
  if (!product) throw new ApiError(404, "Product was not found.");
  const wishlist = await findOrCreateWishlist(request.user._id);
  if (!wishlist.products.some((item) => item.toString() === productId)) {
    wishlist.products.push(product._id);
    await wishlist.save();
  }
  await wishlist.populate("products");
  response.json({ data: { products: serializeProducts(wishlist.products) } });
}

export async function removeWishlistItem(request, response) {
  const productId = validateObjectId(request.params.productId, "Product ID");
  const wishlist = await Wishlist.findOne({ user: request.user._id });
  if (!wishlist) throw new ApiError(404, "Wishlist item was not found.");
  const previousLength = wishlist.products.length;
  wishlist.products = wishlist.products.filter((item) => item.toString() !== productId);
  if (wishlist.products.length === previousLength) throw new ApiError(404, "Wishlist item was not found.");
  await wishlist.save();
  await wishlist.populate("products");
  response.json({ data: { products: serializeProducts(wishlist.products) } });
}
