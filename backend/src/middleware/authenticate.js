import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (request, response, next) => {
  const token = request.cookies?.trendwear_session;
  if (!token) throw new ApiError(401, "Please sign in to continue.");

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new ApiError(401, "Your session is invalid or has expired.");
  }

  const user = await User.findById(payload.sub).select("name phone gender email role");
  if (!user) throw new ApiError(401, "Your session is no longer valid.");
  request.user = user;
  next();
});
