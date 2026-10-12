
import { Link, NavLink } from "react-router-dom";
import {
  Search,
  Heart,
  UserRound,
  ShoppingBag,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useStore } from "../useStore";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cart, wishlist, user } = useStore();
  const cartQuantity = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          TrendWear<span>.</span>
        </Link>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <NavLink to="/" onClick={() => setMenuOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/shop" onClick={() => setMenuOpen(false)}>
            Shop
          </NavLink>
          <NavLink to="/collections" onClick={() => setMenuOpen(false)}>
            Collections
          </NavLink>
          <NavLink to="/about" onClick={() => setMenuOpen(false)}>
            About
          </NavLink>
        </nav>

        <div className="nav-actions">
          <Link to="/search" className="icon-btn" aria-label="Search products" title="Search">
            <Search size={20} />
          </Link>
          <Link to="/wishlist" className="icon-btn" aria-label={`Wishlist, ${wishlist.length} items`} title="Wishlist">
            <Heart size={20} />
            {wishlist.length > 0 && <span className="cart-count">{wishlist.length}</span>}
          </Link>
          <Link
            to="/account"
            className="icon-btn account-link"
            aria-label={user ? `Account, signed in as ${user.name}` : "Account"}
            title="Account"
          >
            <UserRound size={20} />
            {user && <span className="account-greeting">Hi, {user.name}</span>}
          </Link>
          <Link
            to="/cart"
            className="icon-btn cart-link"
            aria-label={`Shopping bag, ${cartQuantity} items`}
            title="Shopping bag"
          >
            <ShoppingBag size={20} />
            {cartQuantity > 0 && (
              <span className="cart-count" aria-live="polite">
                {cartQuantity}
              </span>
            )}
          </Link>
        </div>

        <button
          className="mobile-menu-btn"
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="announcement">
        Complimentary shipping on orders above ₹2,999
      </div>
    </header>
  );
}

export default Navbar;
