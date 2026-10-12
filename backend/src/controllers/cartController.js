import mongoose from "mongoose";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { requireObjectBody, validateObjectId } from "../utils/validation.js";

async function findOrCreateCart(userId) {
  return Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function serializeCart(cart) {
  return (cart?.items || [])
    .filter((item) => item.product && item.product.active)
    .map((item) => {
      const product = item.product.toObject ? item.product.toObject() : item.product;
      return { ...product, id: product._id.toString(), rating: Number(product.rating).toFixed(1), quantity: item.quantity };
    });
}

async function loadCart(cart) {
  await cart.populate("items.product");
  return { items: serializeCart(cart) };
}

export async function getCart(request, response) {
  const cart = await Cart.findOne({ user: request.user._id });
  response.json({ data: cart ? await loadCart(cart) : { items: [] } });
}

export async function addCartItem(request, response) {
  requireObjectBody(request.body);
  const productId = validateObjectId(request.body.productId, "Product ID");
  const quantity = request.body.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new ApiError(400, "Quantity must be an integer from 1 to 99.");
  }
  const product = await Product.findOne({ _id: new mongoose.Types.ObjectId(productId), active: true });
  if (!product) throw new ApiError(404, "Product was not found.");

  const cart = await findOrCreateCart(request.user._id);
  const item = cart.items.find((entry) => entry.product.toString() === productId);
  const nextQuantity = (item?.quantity || 0) + quantity;
  if (nextQuantity > 99 || nextQuantity > product.stock) {
    throw new ApiError(409, "Requested quantity is not available in stock.");
  }
  if (item) item.quantity = nextQuantity;
  else cart.items.push({ product: product._id, quantity });
  await cart.save();
  response.status(200).json({ data: await loadCart(cart) });
}

export async function updateCartItem(request, response) {
  requireObjectBody(request.body);
  const productId = validateObjectId(request.params.productId, "Product ID");
  const quantity = request.body.quantity;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new ApiError(400, "Quantity must be an integer from 1 to 99.");
  }
  const product = await Product.findOne({ _id: productId, active: true });
  if (!product) throw new ApiError(404, "Product was not found.");
  if (quantity > product.stock) throw new ApiError(409, "Requested quantity is not available in stock.");

  const cart = await Cart.findOne({ user: request.user._id });
  const item = cart?.items.find((entry) => entry.product.toString() === productId);
  if (!cart || !item) throw new ApiError(404, "Cart item was not found.");
  item.quantity = quantity;
  await cart.save();
  response.json({ data: await loadCart(cart) });
}

export async function removeCartItem(request, response) {
  const productId = validateObjectId(request.params.productId, "Product ID");
  const cart = await Cart.findOne({ user: request.user._id });
  if (!cart) throw new ApiError(404, "Cart item was not found.");
  const previousLength = cart.items.length;
  cart.items = cart.items.filter((item) => item.product.toString() !== productId);
  if (cart.items.length === previousLength) throw new ApiError(404, "Cart item was not found.");
  await cart.save();
  response.json({ data: await loadCart(cart) });
}

export async function clearCart(request, response) {
  const cart = await findOrCreateCart(request.user._id);
  cart.items = [];
  await cart.save();
  response.json({ data: { items: [] } });
}
