import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import supertest from "supertest";
import { connectDatabase } from "../src/config/db.js";
import { Category } from "../src/models/Category.js";
import { Product } from "../src/models/Product.js";
import { User } from "../src/models/User.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_only_secret_with_at_least_32_characters";
process.env.CLIENT_URL = "http://localhost:5173";

let replicaSet;
let app;

before(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await connectDatabase(replicaSet.getUri("trendwear-test"));
  app = (await import("../src/app.js")).default;
});

after(async () => {
  await mongoose.disconnect();
  await replicaSet?.stop();
});

async function clearDatabase() {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({}))
  );
}

const customerDetails = {
  fullName: "Aanya Sharma",
  email: "aanya@example.com",
  mobile: "9876543210",
  address: "12 Park Street, Central Area",
  state: "Maharashtra",
  city: "Mumbai",
  pinCode: "400001",
};

async function createCustomer(name = "Aanya Sharma", email = "aanya@example.com") {
  const agent = supertest.agent(app);
  const response = await agent.post("/api/auth/register").send({
    name,
    phone: "+919876543210",
    gender: "prefer-not-to-say",
    email,
    password: "a_secure_password_123",
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.user.passwordHash, undefined);
  return { agent, user: response.body.data.user };
}

test("authenticated storefront and order lifecycle", async (context) => {
  await clearDatabase();
  const { agent } = await createCustomer();

  await context.test("auth, catalog search, and guest protection", async () => {
    const vitePortOrigin = await supertest(app)
      .get("/api/health")
      .set("Origin", "http://localhost:5174");
    assert.equal(vitePortOrigin.status, 200);
    assert.equal(vitePortOrigin.headers["access-control-allow-origin"], "http://localhost:5174");

    const rejectedOrigin = await supertest(app)
      .get("/api/health")
      .set("Origin", "https://untrusted.example");
    assert.equal(rejectedOrigin.status, 403);

    const unauthenticated = await supertest(app).get("/api/cart");
    assert.equal(unauthenticated.status, 401);

    const product = await Product.create({
      slug: "classic-white-shirt",
      legacyId: 2,
      name: "Classic White Shirt",
      category: "EVERYDAY LUXURY",
      price: 1799,
      image: "https://example.test/shirt.jpg",
      rating: 4.8,
      collections: ["new-arrivals"],
      stock: 5,
    });
    await Category.create({ slug: "new-arrivals", name: "New Arrivals", kind: "collection" });

    const products = await supertest(app).get("/api/products?q=shirt&sort=price-low");
    assert.equal(products.status, 200);
    assert.equal(products.body.data.length, 1);
    assert.equal(products.body.data[0].price, 1799);

    const collections = await supertest(app).get("/api/categories?kind=collection");
    assert.equal(collections.body.data[0].slug, "new-arrivals");

    const cart = await agent.post("/api/cart/items").send({ productId: product.id, quantity: 2 });
    assert.equal(cart.status, 200);
    assert.equal(cart.body.data.items[0].quantity, 2);
    const updatedCart = await agent.patch(`/api/cart/items/${product.id}`).send({ quantity: 3 });
    assert.equal(updatedCart.body.data.items[0].quantity, 3);
    const removedCart = await agent.delete(`/api/cart/items/${product.id}`);
    assert.equal(removedCart.body.data.items.length, 0);

    const wishlist = await agent.post("/api/wishlist/items").send({ productId: product.id });
    assert.equal(wishlist.status, 200);
    assert.equal(wishlist.body.data.products.length, 1);
    const duplicateWishlist = await agent.post("/api/wishlist/items").send({ productId: product.id });
    assert.equal(duplicateWishlist.body.data.products.length, 1);
    const removedWishlist = await agent.delete(`/api/wishlist/items/${product.id}`);
    assert.equal(removedWishlist.body.data.products.length, 0);
  });

  await context.test("login, current user, and logout", async () => {
    await supertest(app).get("/api/auth/me").expect(401);

    const signedIn = supertest.agent(app);
    const login = await signedIn.post("/api/auth/login").send({
      email: "AANYA@example.com",
      password: "a_secure_password_123",
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.user.email, "aanya@example.com");

    const current = await signedIn.get("/api/auth/me");
    assert.equal(current.status, 200);
    assert.equal(current.body.data.user.name, "Aanya Sharma");
    assert.equal(current.body.data.user.phone, "+919876543210");
    assert.equal(current.body.data.user.gender, "prefer-not-to-say");
    assert.equal(current.body.data.user.passwordHash, undefined);

    const storedUser = await User.findOne({ email: "aanya@example.com" }).select("+passwordHash");
    assert.notEqual(storedUser.passwordHash, "a_secure_password_123");
    assert.equal(await bcrypt.compare("a_secure_password_123", storedUser.passwordHash), true);

    const duplicate = await supertest(app).post("/api/auth/register").send({
      name: "Aanya Sharma",
      phone: "+919876543210",
      gender: "prefer-not-to-say",
      email: "aanya@example.com",
      password: "a_secure_password_123",
    });
    assert.equal(duplicate.status, 409);

    await supertest(app)
      .get("/api/auth/me")
      .set("Cookie", "trendwear_session=not-a-valid-jwt")
      .expect(401);

    const expiredToken = jwt.sign(
      { sub: login.body.data.user.id, role: login.body.data.user.role },
      process.env.JWT_SECRET,
      { algorithm: "HS256", expiresIn: -1 }
    );
    await supertest(app)
      .get("/api/auth/me")
      .set("Cookie", `trendwear_session=${expiredToken}`)
      .expect(401);

    const invalidLogin = await supertest(app).post("/api/auth/login").send({
      email: "aanya@example.com",
      password: "wrong_password_123",
    });
    assert.equal(invalidLogin.status, 401);

    await signedIn.post("/api/auth/logout").expect(204);
    await signedIn.get("/api/auth/me").expect(401);
  });

  await context.test("server pricing, idempotency, ownership, and cancellation stock restore", async () => {
    const product = await Product.findOne({ slug: "classic-white-shirt" });
    const payload = {
      items: [{ productId: product.id, quantity: 2, price: 1 }],
      customer: customerDetails,
      subtotal: 2,
      total: 2,
    };
    const created = await agent.post("/api/orders")
      .set("Idempotency-Key", "checkout-aanya-001")
      .send(payload);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.order.subtotal, 3598);
    assert.equal(created.body.data.order.total, 3598);
    assert.equal(created.body.data.order.paymentStatus, "Pending");
    assert.equal(created.body.data.order.status, "Pending");
    assert.equal(await Product.findById(product.id).then((value) => value.stock), 3);

    const duplicate = await agent.post("/api/orders")
      .set("Idempotency-Key", "checkout-aanya-001")
      .send(payload);
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.data.order.orderNumber, created.body.data.order.orderNumber);
    assert.equal(await Product.findById(product.id).then((value) => value.stock), 3);

    const history = await agent.get("/api/orders");
    assert.equal(history.status, 200);
    assert.equal(history.body.data.length, 1);

    const otherCustomer = await createCustomer("Riya Patel", "riya@example.com");
    const privateOrder = await otherCustomer.agent.get(`/api/orders/${created.body.data.order.orderNumber}`);
    assert.equal(privateOrder.status, 404);

    const cancelled = await agent.post(`/api/orders/${created.body.data.order.orderNumber}/cancel`);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.order.status, "Cancelled");
    assert.equal(await Product.findById(product.id).then((value) => value.stock), 5);

    await agent.post(`/api/orders/${created.body.data.order.orderNumber}/cancel`).expect(200);
    assert.equal(await Product.findById(product.id).then((value) => value.stock), 5);
  });

  await context.test("invalid customer and oversell are rejected without negative stock", async () => {
    const product = await Product.findOne({ slug: "classic-white-shirt" });
    const invalid = await agent.post("/api/orders").send({
      items: [{ productId: product.id, quantity: 1 }],
      customer: { ...customerDetails, pinCode: "123" },
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.details.pinCode, "PIN Code must contain exactly six digits.");

    await Product.updateOne({ _id: product.id }, { $set: { stock: 1 } });
    const payload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: customerDetails,
    };
    const outcomes = await Promise.all([
      agent.post("/api/orders").set("Idempotency-Key", "concurrent-order-a").send(payload),
      agent.post("/api/orders").set("Idempotency-Key", "concurrent-order-b").send(payload),
    ]);
    assert.equal(outcomes.filter((response) => response.status === 201).length, 1);
    assert.equal(outcomes.filter((response) => response.status === 409).length, 1);
    assert.equal(await Product.findById(product.id).then((value) => value.stock), 0);
  });
});
