import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeEmail, requireObjectBody } from "../utils/validation.js";

const cookieName = "trendwear_session";
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: sessionLifetimeMs,
  };
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    phone: user.phone,
    gender: user.gender,
    email: user.email,
    role: user.role,
  };
}

function setSession(response, user) {
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "7d", issuer: "trendwear-api", audience: "trendwear-client" }
  );
  response.cookie(cookieName, token, cookieOptions());
}

export async function register(request, response) {
  requireObjectBody(request.body);
  const name = typeof request.body.name === "string" ? request.body.name.trim() : "";
  const phone = typeof request.body.phone === "string" ? request.body.phone.trim() : "";
  const gender = request.body.gender;
  const email = normalizeEmail(request.body.email);
  const password = request.body.password;
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]{1,99}$/u.test(name)) {
    throw new ApiError(400, "Name must contain 2 to 100 valid characters.");
  }
  if (!/^\+?[1-9]\d{6,14}$/.test(phone)) {
    throw new ApiError(400, "Enter a valid phone number.");
  }
  if (!["female", "male", "non-binary", "prefer-not-to-say"].includes(gender)) {
    throw new ApiError(400, "Select a valid gender option.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    throw new ApiError(400, "Enter a valid email address.");
  }
  if (
    typeof password !== "string" ||
    password.length < 10 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new ApiError(400, "Password must be at least 10 characters and no more than 72 UTF-8 bytes.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, phone, gender, email, passwordHash });
  setSession(response, user);
  response.status(201).json({ data: { user: publicUser(user) } });
}

export async function login(request, response) {
  requireObjectBody(request.body);
  const email = normalizeEmail(request.body.email);
  const password = request.body.password;
  if (!email || typeof password !== "string") {
    throw new ApiError(400, "Email and password are required.");
  }

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, "Email or password is incorrect.");
  }

  setSession(response, user);
  response.json({ data: { user: publicUser(user) } });
}

export function currentUser(request, response) {
  response.json({ data: { user: publicUser(request.user) } });
}

export function logout(request, response) {
  response.clearCookie(cookieName, { ...cookieOptions(), maxAge: undefined });
  response.status(204).end();
}
