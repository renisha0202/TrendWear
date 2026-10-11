import { useEffect, useState } from "react";
import { StoreContext } from "./store-context";

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

  useEffect(() => {
    window.localStorage.setItem("wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  const saveCart = (updatedCart) => {
    try {
      window.localStorage.setItem("cart", JSON.stringify(updatedCart));
      setCart(updatedCart);
      return true;
    } catch {
      return false;
    }
  };

  const addToCart = (product) => {
    if (
      !product ||
      product.id == null ||
      typeof product.name !== "string" ||
      !Number.isFinite(product.price) ||
      product.price <= 0
    ) {
      return false;
    }

    const existingItem = cart.find((item) => item.id === product.id);
    const updatedCart = existingItem
      ? cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        )
      : [...cart, { ...product, quantity: 1 }];

    return saveCart(updatedCart);
  };

  const changeQuantity = (productId, change) => {
    const updatedCart = cart.map((item) =>
      item.id === productId
        ? { ...item, quantity: Math.max(1, (item.quantity || 1) + change) }
        : item
    );
    saveCart(updatedCart);
  };

  const removeFromCart = (productId) => {
    const updatedCart = cart.filter((item) => item.id !== productId);
    if (updatedCart.length === cart.length) return false;
    return saveCart(updatedCart);
  };

  const toggleWishlist = (product) => {
    setWishlist((currentWishlist) =>
      currentWishlist.some((item) => item.id === product.id)
        ? currentWishlist.filter((item) => item.id !== product.id)
        : [...currentWishlist, product]
    );
  };

  const value = {
    cart,
    wishlist,
    addToCart,
    changeQuantity,
    removeFromCart,
    toggleWishlist,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}