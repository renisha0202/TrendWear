import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { api } from "../api";
import { useProducts } from "../hooks/useProducts";

function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || "all";
  const collectionId = searchParams.get("collection") || "";
  const sort = searchParams.get("sort") || "featured";
  const { products, loading, error } = useProducts({
    ...(category !== "all" ? { category } : {}),
    ...(collectionId ? { collection: collectionId } : {}),
    sort,
  });
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [filterError, setFilterError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.catalog.categories("category"), api.catalog.categories("collection")])
      .then(([categoryResult, collectionResult]) => {
        if (!active) return;
        setCategories(categoryResult.data);
        setCollections(collectionResult.data);
      })
      .catch((requestError) => {
        if (active) setFilterError(requestError.message);
      });
    return () => { active = false; };
  }, []);

  const collectionName = collections.find((item) => item.slug === collectionId)?.name;

  const updateFilter = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (!value || value === "all" || value === "featured") {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
    setSearchParams(nextParams);
  };

  return (
    <main className="section">
      <div className="section-heading">
        <div>
          <p className="eyebrow dark-eyebrow">TRENDWEAR COLLECTION</p>
          <h1>{collectionName || "Shop"} <em>{collectionName ? "Edit." : "All."}</em></h1>
          <p className="section-description">
            Discover your next wardrobe favourite.
          </p>
        </div>
      </div>

      <div className="shop-controls" aria-label="Product filters">
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => updateFilter("category", event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        <label>
          <span>Sort by</span>
          <select value={sort} onChange={(event) => updateFilter("sort", event.target.value)}>
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
        {collectionId && <button type="button" className="text-link" onClick={() => updateFilter("collection", "")}>Clear collection</button>}
      </div>

      {filterError && <p className="empty-state" role="alert">{filterError}</p>}
      {loading && <p className="empty-state" role="status">Loading products…</p>}
      {error && <p className="empty-state" role="alert">{error}</p>}
      {!loading && !error && products.length > 0 ? <div className="product-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div> : !loading && !error && <p className="empty-state">No products match these filters.</p>}
    </main>
  );
}

export default Shop;