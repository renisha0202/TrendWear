
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { products } from "../products";

function Home() {
  return (
    <main>

      <section className="hero">
        <img
          className="hero-image"
          src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1800&q=90"
          alt="Women's premium fashion collection"
        />

        <div className="hero-overlay" />

        <div className="hero-content">
          <p className="eyebrow">THE NEW SEASON · 2026</p>

          <h1>
            Elegance in
            <br />
            every <em>detail.</em>
          </h1>

          <p className="hero-description">
            Thoughtfully curated fashion for the woman
            who defines her own style.
          </p>

          <Link to="/collections" className="btn btn-light">
            Explore Collection <span>↗</span>
          </Link>

          <p className="hero-note">TIMELESS PIECES. ENDLESS POSSIBILITIES.</p>
        </div>

        <span className="hero-index">01 / 04</span>
      </section>

      <section className="benefits">
        <p>CONSIDERED DESIGN</p>
        <span>✦</span>
        <p>QUALITY THAT LASTS</p>
        <span>✦</span>
        <p>MADE FOR YOUR MOMENTS</p>
      </section>

      <section className="collection section" id="collections">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark-eyebrow">THE EDIT</p>
            <h2>Pieces to <em>love.</em></h2>
            <p className="section-description">
              Discover your next wardrobe favourite.
            </p>
          </div>

          <Link to="/shop" className="text-link">
            VIEW ALL PRODUCTS ↗
          </Link>
        </div>

        <div className="product-grid">
          {products.map((product) => (
            <ProductCard
  key={product.id}
  product={product}
/>
          ))}
        </div>
      </section>

      <section className="editorial section" id="about">
        <div className="editorial-image">
          <img
            src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85"
            alt="Contemporary women's fashion"
            loading="lazy"
          />
        </div>

        <div className="editorial-content">
          <p className="eyebrow dark-eyebrow">OUR PHILOSOPHY</p>
          <h2>Less, but <em>better.</em></h2>
          <p>
            We believe great style is never about having more.
            It is about choosing pieces that feel like you,
            season after season.
          </p>
          <Link to="/about" className="btn btn-dark">
            Discover TrendWear <span>↗</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Home;
