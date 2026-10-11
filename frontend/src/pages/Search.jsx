import { Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { products } from "../products";

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const normalizedQuery = query.trim().toLowerCase();
  const results = products.filter((product) =>
    `${product.name} ${product.category}`.toLowerCase().includes(normalizedQuery)
  );

  return (
    <main className="section search-page">
      <p className="eyebrow dark-eyebrow">FIND YOUR NEXT FAVOURITE</p>
      <h1>Search <em>TrendWear.</em></h1>
      <label className="search-field">
        <Search size={19} aria-hidden="true" />
        <span className="sr-only">Search products</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setSearchParams(event.target.value ? { q: event.target.value } : {})}
          placeholder="Search by product or category"
          autoFocus
        />
      </label>
      {normalizedQuery ? <p className="search-count" role="status">{results.length} {results.length === 1 ? "piece" : "pieces"} found</p> : <p className="search-count">Explore all of our considered pieces.</p>}
      {results.length > 0 ? (
        <div className="product-grid">
          {results.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <p className="empty-state">No pieces match “{query}”. Try another name or category.</p>
      )}
    </main>
  );
}

export default SearchPage;