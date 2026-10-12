import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";

export function requireObjectBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "A JSON object request body is required.");
  }
}

export function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validateCustomer(customer) {
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    throw new ApiError(400, "Customer details are required.");
  }

  const value = {
    fullName: typeof customer.fullName === "string" ? customer.fullName.trim() : "",
    email: normalizeEmail(customer.email),
    mobile: typeof customer.mobile === "string" ? customer.mobile.trim() : "",
    address: typeof customer.address === "string" ? customer.address.trim() : "",
    state: typeof customer.state === "string" ? customer.state.trim() : "",
    city: typeof customer.city === "string" ? customer.city.trim() : "",
    pinCode: typeof customer.pinCode === "string" ? customer.pinCode.trim() : "",
  };

  const errors = {};
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]{1,99}$/u.test(value.fullName)) {
    errors.fullName = "Enter a valid full name.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!/^[6-9]\d{9}$/.test(value.mobile)) {
    errors.mobile = "Enter a valid 10-digit Indian mobile number.";
  }
  if (value.address.length < 10 || value.address.length > 300 || !/[\p{L}\p{N}]/u.test(value.address)) {
    errors.address = "Enter a complete delivery address.";
  }
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]{1,79}$/u.test(value.state)) {
    errors.state = "Enter a valid state.";
  }
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]{1,79}$/u.test(value.city)) {
    errors.city = "Enter a valid city.";
  }
  if (!/^\d{6}$/.test(value.pinCode)) {
    errors.pinCode = "PIN Code must contain exactly six digits.";
  }

  if (Object.keys(errors).length) {
    throw new ApiError(400, "Customer details are invalid.", errors);
  }
  return value;
}

export function validateObjectId(value, label = "ID") {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `${label} is invalid.`);
  }
  return value;
}

export function validateItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
    throw new ApiError(400, "Provide between 1 and 50 order items.");
  }

  const combined = new Map();
  for (const item of items) {
    if (!item || typeof item !== "object") {
      throw new ApiError(400, "Each item must include a product ID and quantity.");
    }
    const productId = validateObjectId(item.productId, "Product ID");
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new ApiError(400, "Each quantity must be an integer from 1 to 99.");
    }
    combined.set(productId, (combined.get(productId) || 0) + item.quantity);
    if (combined.get(productId) > 99) {
      throw new ApiError(400, "A product quantity cannot exceed 99.");
    }
  }

  return [...combined].map(([productId, quantity]) => ({ productId, quantity }));
}
