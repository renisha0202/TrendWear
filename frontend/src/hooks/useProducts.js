import { useEffect, useState } from "react";
import { api } from "../api";

export function useProducts(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  ).toString();
  const [result, setResult] = useState({ query: "", products: [], loading: true, error: "" });

  useEffect(() => {
    let active = true;
    api.catalog.products(Object.fromEntries(new URLSearchParams(query)))
      .then((result) => {
        if (active) setResult({ query, products: result.data || [], loading: false, error: "" });
      })
      .catch((requestError) => {
        if (active) {
          setResult({ query, products: [], loading: false, error: requestError.message });
        }
      });

    return () => {
      active = false;
    };
  }, [query]);

  const isCurrentQuery = result.query === query;
  return {
    products: isCurrentQuery ? result.products : [],
    loading: !isCurrentQuery || result.loading,
    error: isCurrentQuery ? result.error : "",
  };
}
