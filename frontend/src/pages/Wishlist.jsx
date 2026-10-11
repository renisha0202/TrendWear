import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useStore } from "../useStore";

function Wishlist() {
  const { wishlist } = useStore();

  return (
    <main className="section wishlist-page">
      <p className="eyebrow dark-eyebrow">SAVED FOR LATER</p>
      <h1>Your <em>Wishlist.</em></h1>
      {wishlist.length ? (
        <div className="product-grid">
          {wishlist.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="empty-state">
          <p>Your wishlist is waiting for a favourite.</p>
          <Link to="/shop" className="btn btn-dark">Explore the collection <span>↗</span></Link>
        </div>
      )}
    </main>
  );
}

export default Wishlist;