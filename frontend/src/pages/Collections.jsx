import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";

function Collections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.catalog.categories("collection")
      .then((result) => {
        if (active) setCollections(result.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="section collections-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow dark-eyebrow">CURATED FOR YOU</p>
          <h1>Our <em>Collections.</em></h1>
          <p className="section-description">Find the pieces that fit your every day, and the moments beyond it.</p>
        </div>
      </div>
      {loading && <p className="empty-state" role="status">Loading collections…</p>}
      {error && <p className="empty-state" role="alert">{error}</p>}
      {!loading && !error && collections.length === 0 && <p className="empty-state">No collections are available right now.</p>}
      {!loading && !error && collections.length > 0 && <div className="collection-grid">
        {collections.map((collection) => (
          <Link
            key={collection.id}
            to={`/shop?collection=${collection.slug}`}
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
      </div>}
    </main>
  );
}

export default Collections;