import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { collections } from "../products";

function Collections() {
  return (
    <main className="section collections-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow dark-eyebrow">CURATED FOR YOU</p>
          <h1>Our <em>Collections.</em></h1>
          <p className="section-description">Find the pieces that fit your every day, and the moments beyond it.</p>
        </div>
      </div>
      <div className="collection-grid">
        {collections.map((collection) => (
          <Link
            key={collection.id}
            to={`/shop?collection=${collection.id}`}
            className="collection-card"
          >
            <img src={collection.image} alt="" loading="lazy" />
            <span className="collection-card-content">
              <span>{collection.name}</span>
              <small>{collection.description}</small>
            </span>
            <ArrowUpRight aria-hidden="true" size={19} />
          </Link>
        ))}
      </div>
    </main>
  );
}

export default Collections;