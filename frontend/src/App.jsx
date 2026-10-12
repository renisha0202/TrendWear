import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Contact from "./pages/Contact";
import Collections from "./pages/Collections";
import About from "./pages/About";
import SearchPage from "./pages/Search";
import Wishlist from "./pages/Wishlist";
import Account from "./pages/Account";
import Checkout from "./pages/Checkout";
import { StoreProvider } from "./StoreContext";
import { useStore } from "./useStore";

function RequireAuth() {
  const { user, authLoading } = useStore();
  const location = useLocation();

  if (authLoading) {
    return <main className="section account-page"><p role="status">Checking your account…</p></main>;
  }
  if (!user) {
    return <Navigate to="/account" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

function App() {
  return (
    <StoreProvider>
      <Navbar />

      <Routes>
        <Route path="/account" element={<Account />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/about" element={<About />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/checkout" element={<Checkout />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </StoreProvider>
  );
}

export default App;