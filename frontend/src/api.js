const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined) headers.set("Content-Type", "application/json");

  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers,
      credentials: "include",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error("Unable to reach TrendWear API. Check the backend server and VITE_API_URL.");
  }

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || "The request could not be completed.");
    error.status = response.status;
    error.details = payload.error?.details;
    if (
      response.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/register"
    ) {
      window.dispatchEvent(new Event("trendwear:unauthorized"));
    }
    throw error;
  }
  return payload;
}

const json = (method, body) => ({ method, body });

export const api = {
  auth: {
    register: (body) => request("/auth/register", json("POST", body)),
    login: (body) => request("/auth/login", json("POST", body)),
    me: () => request("/auth/me"),
    logout: () => request("/auth/logout", json("POST", {})),
  },
  catalog: {
    products: (params = {}) => {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
      );
      return request(`/products${query.size ? `?${query}` : ""}`);
    },
    product: (productId) => request(`/products/${encodeURIComponent(productId)}`),
    categories: (kind = "category") => request(`/categories?kind=${encodeURIComponent(kind)}`),
  },
  cart: {
    get: () => request("/cart"),
    add: (productId, quantity = 1) => request("/cart/items", json("POST", { productId, quantity })),
    update: (productId, quantity) => request(`/cart/items/${encodeURIComponent(productId)}`, json("PATCH", { quantity })),
    remove: (productId) => request(`/cart/items/${encodeURIComponent(productId)}`, { method: "DELETE" }),
  },
  wishlist: {
    get: () => request("/wishlist"),
    add: (productId) => request("/wishlist/items", json("POST", { productId })),
    remove: (productId) => request(`/wishlist/items/${encodeURIComponent(productId)}`, { method: "DELETE" }),
  },
  orders: {
    create: (body, idempotencyKey) => request("/orders", {
      ...json("POST", body),
      ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
    }),
    list: (params = {}) => {
      const query = new URLSearchParams(params);
      return request(`/orders${query.size ? `?${query}` : ""}`);
    },
    get: (orderNumber) => request(`/orders/${encodeURIComponent(orderNumber)}`),
    cancel: (orderNumber) => request(`/orders/${encodeURIComponent(orderNumber)}/cancel`, json("POST", {})),
  },
};
