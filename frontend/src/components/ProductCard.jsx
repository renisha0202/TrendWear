import { Heart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../useStore";

function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const isWishlisted = wishlist.some((item) => item.id === product.id);

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <img
          src={product.image}
          alt={product.name}
          className="product-image"
          loading="lazy"
        />

        {product.badge && (
          <span className="product-badge">
            {product.badge}
          </span>
        )}

        <button
          type="button"
          className={`wishlist-btn ${isWishlisted ? "active" : ""}`}
          aria-label={`${isWishlisted ? "Remove from" : "Add to"} wishlist: ${product.name}`}
          aria-pressed={isWishlisted}
          onClick={() => toggleWishlist(product)}
        >
          <Heart
            size={19}
            fill={isWishlisted ? "currentColor" : "none"}
          />
        </button>

        <button
          type="button"
          className="quick-add"
          aria-label={`Add ${product.name} to cart`}
          onClick={() => {
            if (addToCart(product)) {
              window.setTimeout(
                () => window.alert(`${product.name} added to cart successfully!`),
                0
              );
            }
          }}
        >
          Add to Cart
        </button>
      </div>

      <div className="product-info">
        <p className="product-category">{product.category}</p>
        <h3>{product.name}</h3>

        <div className="product-bottom">
          <span className="product-price">
            ₹{product.price.toLocaleString("en-IN")}
          </span>

          <span className="product-rating">
            <Star size={14} fill="currentColor" />
            {product.rating}
          </span>
        </div>

        <div className="product-actions">
          <button
            type="button"
            className="btn btn-dark"
            onClick={() => {
              navigate("/checkout", { state: { product, quantity: 1 } });
            }}
          >
            Buy Now
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;