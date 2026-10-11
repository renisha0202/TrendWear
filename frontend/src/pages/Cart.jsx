import { Link, useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus } from "lucide-react";
import { useStore } from "../useStore";

function Cart() {
  const navigate = useNavigate();
  const { cart, changeQuantity, removeFromCart } = useStore();

  const handleRemove = (item) => {
    if (removeFromCart(item.id)) {
      window.setTimeout(
        () => window.alert(`${item.name} removed from cart successfully!`),
        0
      );
    }
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (cart.length === 0) {
    return (
      <main className="section">
        <h1>Your Shopping Bag</h1>
        <p className="empty-state">Your cart is empty. Find something you love in the collection.</p>
        <Link to="/shop" className="btn btn-dark">
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="section cart-page">
      <p className="eyebrow dark-eyebrow">YOUR SELECTION</p>
      <h1>Your Shopping Bag</h1>

      {cart.map((item) => (
        <article
          key={item.id}
          className="cart-item"
        >
          <img
            src={item.image}
            alt={item.name}
            width="100"
          />

          <div>
            <h3>{item.name}</h3>
            <p>₹{item.price.toLocaleString("en-IN")}</p>

            <button
              type="button"
              onClick={() => changeQuantity(item.id, -1)}
              aria-label="Decrease quantity"
              disabled={item.quantity <= 1}
            >
              <Minus size={16} />
            </button>

              <span aria-live="polite">{item.quantity}</span>

            <button
              type="button"
              onClick={() => changeQuantity(item.id, 1)}
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>

            <button
              type="button"
              className="cart-remove"
              onClick={() => handleRemove(item)}
              aria-label={`Remove ${item.name}`}
            >
              <Trash2 size={16} /> Remove
            </button>
            <button
              type="button"
              className="cart-item-buy-now"
              onClick={() => navigate("/checkout", { state: { product: item, quantity: item.quantity } })}
            >
              Buy Now
            </button>
          </div>

          <p>
            ₹{(item.price * item.quantity).toLocaleString("en-IN")}
          </p>
        </article>
      ))}

      <div className="cart-summary">
        <p>Subtotal <strong>₹{total.toLocaleString("en-IN")}</strong></p>
        <small>Shipping and any applicable taxes are calculated at checkout.</small>
      </div>

      <Link to="/shop" className="btn btn-dark">
        Continue Shopping
      </Link>
    </main>
  );
}

export default Cart;