import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { products, collections } from "../products";

function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || "all";
  const collectionId = searchParams.get("collection") || "";
  const sort = searchParams.get("sort") || "featured";
  const categories = [...new Set(products.map((product) => product.category))];
  const filteredProducts = products
    .filter((product) => category === "all" || product.category === category)
    .filter((product) => !collectionId || product.collections.includes(collectionId))
    .sort((first, second) => {
      if (sort === "price-low") return first.price - second.price;
      if (sort === "price-high") return second.price - first.price;
      return 0;
    });
  const collectionName = collections.find((item) => item.id === collectionId)?.name;

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
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
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

      {filteredProducts.length > 0 ? <div className="product-grid">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div> : <p className="empty-state">No products match these filters.</p>}
    </main>
  );
}

export default Shop;