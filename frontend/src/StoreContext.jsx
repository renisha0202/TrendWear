import { useEffect, useState } from "react";
import { StoreContext } from "./store-context";
import { api } from "./api";

const authSessionKey = "trendwear_session_present";
let currentUserRequest;

function hasSessionHint() {
  try {
    return window.localStorage.getItem(authSessionKey) === "true";
  } catch {
    return false;
  }
}

function setSessionHint(present) {
  try {
    if (present) window.localStorage.setItem(authSessionKey, "true");
    else window.localStorage.removeItem(authSessionKey);
  } catch {
  }
}

function getCurrentUser() {
  if (!currentUserRequest) {
    currentUserRequest = api.auth.me().finally(() => {
      currentUserRequest = null;
    });
  }
  return currentUserRequest;
}

function readSavedItems(key) {
  try {
    const savedItems = JSON.parse(window.localStorage.getItem(key) || "[]");
    if (!Array.isArray(savedItems)) return [];
    return savedItems
      .filter((item) => item && typeof item === "object")
      .map((item) =>
        key === "cart"
          ? { ...item, quantity: Math.max(1, Number(item.quantity) || 1) }
          : item
      );
  } catch {
    return [];
  }
}

export function StoreProvider({ children }) {
  const [cart, setCart] = useState(() => readSavedItems("cart"));
  const [wishlist, setWishlist] = useState(() => readSavedItems("wishlist"));
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(() => hasSessionHint());
  const [storeError, setStoreError] = useState("");

  useEffect(() => {
    const handleUnauthorized = () => {
      setSessionHint(false);
      setUser(null);
      setCart(readSavedItems("cart"));
      setWishlist(readSavedItems("wishlist"));
      setAuthLoading(false);
    };
    window.addEventListener("trendwear:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("trendwear:unauthorized", handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!hasSessionHint()) {
      return undefined;
    }

    let active = true;
    getCurrentUser()
      .then(async (result) => {
        if (!active) return;
        await loadAccountData(result.data.user);
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) setSessionHint(false);
        else setStoreError(error.message);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function loadAccountData(account) {
    setUser(account);
    setAuthLoading(false);
    setStoreError("");
    try {
      let [cartResult, wishlistResult] = await Promise.all([
        api.cart.get(),
        api.wishlist.get(),
      ]);

      const guestCart = readSavedItems("cart");
      const guestWishlist = readSavedItems("wishlist");
      let remainingCart = [];
      let remainingWishlist = [];
      if (guestCart.length || guestWishlist.length) {
        const catalog = await api.catalog.products({ limit: 50 });
        const productsById = catalog.data;
        const findProduct = (item) => productsById.find((product) =>
          product.id === String(item.id) || product.legacyId === Number(item.id)
        );

        for (const item of guestCart) {
          const product = findProduct(item);
          const quantity = Math.floor(Number(item.quantity));
          if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
            remainingCart.push(item);
            continue;
          }
          try {
            cartResult = await api.cart.add(product.id, quantity);
          } catch {
            remainingCart.push(item);
          }
        }

        for (const item of guestWishlist) {
          const product = findProduct(item);
          if (!product) {
            remainingWishlist.push(item);
            continue;
          }
          try {
            wishlistResult = await api.wishlist.add(product.id);
          } catch {
            remainingWishlist.push(item);
          }
        }
        try {
          window.localStorage.setItem("cart", JSON.stringify(remainingCart));
          window.localStorage.setItem("wishlist", JSON.stringify(remainingWishlist));
        } catch {
          setStoreError("Some guest shopping data could not be cleared after account sync.");
        }
        if (remainingCart.length || remainingWishlist.length) {
          setStoreError("Some guest items could not be synced and remain saved on this device.");
        }
      }

      setCart(cartResult.data.items);
      setWishlist(wishlistResult.data.products);
    } catch (error) {
      setStoreError(error.message);
    }
  }

  const signIn = async (credentials) => {
    const result = await api.auth.login(credentials);
    setSessionHint(true);
    await loadAccountData(result.data.user);
  };

  const signUp = async (details) => {
    const result = await api.auth.register(details);
    setSessionHint(true);
    await loadAccountData(result.data.user);
  };

  const signOut = async () => {
    await api.auth.logout();
    setSessionHint(false);
    setUser(null);
    setCart(readSavedItems("cart"));
    setWishlist(readSavedItems("wishlist"));
    setStoreError("");
  };

  const saveAnonymousCart = (updatedCart) => {
    try {
      window.localStorage.setItem("cart", JSON.stringify(updatedCart));
      setCart(updatedCart);
      setStoreError("");
      return true;
    } catch {
      setStoreError("Your browser could not save cart data.");
      return false;
    }
  };

  const addToCart = async (product) => {
    if (
      !product ||
      product.id == null ||
      typeof product.name !== "string" ||
      !Number.isFinite(product.price) ||
      product.price <= 0
    ) {
      setStoreError("This product cannot be added to the cart.");
      return false;
    }

    if (user) {
      try {
        const result = await api.cart.add(product.id);
        setCart(result.data.items);
        setStoreError("");
        return true;
      } catch (error) {
        setStoreError(error.message);
        return false;
      }
    }

    const existingItem = cart.find((item) => item.id === product.id);
    const updatedCart = existingItem
      ? cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        )
      : [...cart, { ...product, quantity: 1 }];

    return saveAnonymousCart(updatedCart);
  };

  const changeQuantity = async (productId, change) => {
    const currentItem = cart.find((item) => item.id === productId);
    if (!currentItem) return false;
    const quantity = Math.min(99, Math.max(1, (currentItem.quantity || 1) + change));
    if (user) {
      try {
        const result = await api.cart.update(productId, quantity);
        setCart(result.data.items);
        setStoreError("");
        return true;
      } catch (error) {
        setStoreError(error.message);
        return false;
      }
    }
    const updatedCart = cart.map((item) =>
      item.id === productId
        ? { ...item, quantity }
        : item
    );
    return saveAnonymousCart(updatedCart);
  };

  const removeFromCart = async (productId) => {
    if (user) {
      try {
        const result = await api.cart.remove(productId);
        setCart(result.data.items);
        setStoreError("");
        return true;
      } catch (error) {
        setStoreError(error.message);
        return false;
      }
    }
    const updatedCart = cart.filter((item) => item.id !== productId);
    if (updatedCart.length === cart.length) return false;
    return saveAnonymousCart(updatedCart);
  };

  const toggleWishlist = async (product) => {
    if (user) {
      const isWishlisted = wishlist.some((item) => item.id === product.id);
      try {
        const result = isWishlisted
          ? await api.wishlist.remove(product.id)
          : await api.wishlist.add(product.id);
        setWishlist(result.data.products);
        setStoreError("");
        return true;
      } catch (error) {
        setStoreError(error.message);
        return false;
      }
    }
    const updatedWishlist = wishlist.some((item) => item.id === product.id)
      ? wishlist.filter((item) => item.id !== product.id)
      : [...wishlist, product];
    try {
      window.localStorage.setItem("wishlist", JSON.stringify(updatedWishlist));
      setWishlist(updatedWishlist);
      setStoreError("");
      return true;
    } catch {
      setStoreError("Your browser could not save wishlist data.");
      return false;
    }
  };

  const value = {
    cart,
    wishlist,
    user,
    authLoading,
    storeError,
    clearStoreError: () => setStoreError(""),
    signIn,
    signUp,
    signOut,
    addToCart,
    changeQuantity,
    removeFromCart,
    toggleWishlist,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}