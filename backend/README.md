# TrendWear API

Express and MongoDB API for the existing TrendWear storefront. Payments are deliberately not implemented. Orders are created with `paymentStatus: "Pending"`; an order record is not evidence of payment.

## Requirements

- Node.js 20 or newer
- MongoDB local replica set or MongoDB Atlas replica set (multi-document transactions are used for order stock reservation and cancellation)

## Setup

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Set a private `JWT_SECRET` of at least 32 characters in `backend/.env`. Never use the example string outside development. The example Mongo URI is `mongodb://127.0.0.1:27017/trendwear`.

For local MongoDB, start a single-node replica set so order transactions are available. For example, start `mongod` with `--replSet rs0`, then initialize once in `mongosh`:

```javascript
rs.initiate()
```

Atlas clusters support transactions; put the Atlas URI in `MONGODB_URI` and allow the development machine in the Atlas network access list. Keep credentials URL-encoded and only in the ignored `.env` file.

Seed the existing four frontend products and collection/category labels, preserving any stock already set for those products:

```powershell
npm run seed
npm run dev
```

The API listens on `http://localhost:5000`. Set `CLIENT_URL` to the exact frontend origin (comma-separated origins are supported). Copy `frontend/.env.example` to `frontend/.env`, then restart Vite. `VITE_API_URL` is public client configuration, never a secret.

## Authentication

Register/login set an HttpOnly `trendwear_session` JWT cookie. The frontend sends it with credentialed requests. It is `SameSite=Strict`, `Secure` in production, and expires after seven days. Logout clears the cookie. Passwords are bcrypt-hashed and omitted from API responses. Cart, wishlist, and orders require this cookie; public catalog endpoints do not.

## API

Success responses use `{ "data": ... }`; failures use `{ "error": { "message": "...", "details": ... } }`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Register `{ "name", "email", "password" }` |
| POST | `/api/auth/login` | No | Login `{ "email", "password" }` |
| GET | `/api/auth/me` | Yes | Current customer |
| POST | `/api/auth/logout` | No | Clear session cookie |
| GET | `/api/products?q=&category=&collection=&sort=&page=&limit=` | No | Search/filter/sort/paginated active products |
| GET | `/api/products/:id` | No | Product detail |
| GET | `/api/categories?kind=category\|collection` | No | Categories or collections |
| GET | `/api/cart` | Yes | Current customer cart |
| POST | `/api/cart/items` | Yes | Add `{ "productId", "quantity": 1 }` |
| PATCH | `/api/cart/items/:productId` | Yes | Set `{ "quantity" }` |
| DELETE | `/api/cart/items/:productId` | Yes | Remove one item |
| DELETE | `/api/cart` | Yes | Clear cart |
| GET | `/api/wishlist` | Yes | Current customer wishlist |
| POST | `/api/wishlist/items` | Yes | Add `{ "productId" }` |
| DELETE | `/api/wishlist/items/:productId` | Yes | Remove one item |
| POST | `/api/orders` | Yes | Submit a validated order |
| GET | `/api/orders?page=&limit=` | Yes | Own order history |
| GET | `/api/orders/:orderNumber` | Yes | Own order details |
| POST | `/api/orders/:orderNumber/cancel` | Yes | Cancel own still-Pending order and restore stock |

### Other request examples

Register with `POST /api/auth/register`:

```json
{ "name": "Aanya Sharma", "email": "aanya@example.com", "password": "a_secure_password_123" }
```

Add two units with `POST /api/cart/items`:

```json
{ "productId": "MONGODB_PRODUCT_ID", "quantity": 2 }
```

Set quantity with `PATCH /api/cart/items/MONGODB_PRODUCT_ID`:

```json
{ "quantity": 1 }
```

Add a wishlist item with `POST /api/wishlist/items`:

```json
{ "productId": "MONGODB_PRODUCT_ID" }
```

### Create order

Send an `Idempotency-Key` header (unique per checkout attempt) to make retries safe:

```json
{
  "items": [{ "productId": "MONGODB_PRODUCT_ID", "quantity": 1 }],
  "customer": {
    "fullName": "Aanya Sharma",
    "email": "aanya@example.com",
    "mobile": "9876543210",
    "address": "12 Park Street, Central Area",
    "state": "Maharashtra",
    "city": "Mumbai",
    "pinCode": "400001"
  }
}
```

Do not send prices or totals. The API reloads products, checks stock, calculates line totals/subtotal/total, and stores immutable product snapshots in a Pending order. A Mongo replica set transaction reserves stock and creates the order atomically. Cancellation is allowed only while Pending and restores stock transactionally. No administrator functionality exists in the frontend, so there are no admin APIs or role escalation paths.

### Postman

1. Set `baseUrl` to `http://localhost:5000` and enable Postman’s cookie jar.
2. Register with `POST {{baseUrl}}/api/auth/register` and `{ "name": "Aanya Sharma", "email": "aanya@example.com", "password": "a_secure_password_123" }`, or log in with `POST {{baseUrl}}/api/auth/login` and `{ "email": "aanya@example.com", "password": "a_secure_password_123" }`.
3. Call `GET /api/auth/me`, `GET /api/products`, and cart/wishlist endpoints. The auth cookie should be retained by Postman.
4. Seed products first, copy a returned Mongo `id`, and submit the order JSON with `POST /api/orders` and an `Idempotency-Key` header.
5. Inspect `GET /api/orders`, `GET /api/orders/:orderNumber`, then optionally cancel the Pending order. Verify the product stock before/after with MongoDB tools.
6. Confirm a second request with the same idempotency key returns the original order and does not decrement stock again.

## Tests

```powershell
npm test
```

Integration tests start an ephemeral single-node Mongo replica set with `mongodb-memory-server`; the first run may download a MongoDB test binary. Tests cover auth protection, public catalog search, cart/wishlist operations, validation, server-side pricing, idempotency, customer order privacy, concurrent stock limits, and cancellation stock restoration.

## Payment integration boundary

There are no payment SDKs, keys, callbacks, webhooks, or payment-success claims here. A future Razorpay integration can use the saved order number/ID and `paymentStatus` field; only a verified server-side gateway callback should change `paymentStatus` from Pending. Do not treat order creation as payment authorization.
