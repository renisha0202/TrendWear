import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../useStore";

function Account() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authLoading, storeError, signIn, signUp, signOut } = useStore();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setFieldErrors({});

    if (mode === "register") {
      const validation = {};
      if (name.trim().length < 2) validation.name = "Enter your full name.";
      if (!/^\+?[1-9]\d{6,14}$/.test(phone.trim())) validation.phone = "Enter a valid phone number.";
      if (!gender) validation.gender = "Select a gender option.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) validation.email = "Enter a valid email address.";
      if (password.length < 10) validation.password = "Use a password with at least 10 characters.";
      if (!confirmPassword) validation.confirmPassword = "Confirm your password.";
      else if (confirmPassword !== password) validation.confirmPassword = "Passwords do not match.";
      setFieldErrors(validation);
      if (Object.keys(validation).length) return;
    }

    setBusy(true);
    try {
      if (mode === "register") await signUp({ name, phone, gender, email, password });
      else await signIn({ email, password });

      const checkout = location.state?.checkout;
      if (checkout) navigate("/checkout", { replace: true, state: checkout });
      else if (location.state?.from) {
        const { pathname, search, hash, state } = location.state.from;
        navigate(`${pathname}${search || ""}${hash || ""}`, { replace: true, state });
      } else navigate("/", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setError("");
    try {
      await signOut();
      setMessage("You have signed out.");
      navigate("/account", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (authLoading) {
    return <main className="section account-page"><p role="status">Checking your account…</p></main>;
  }

  if (user) {
    return (
      <main className="section account-page">
        <p className="eyebrow dark-eyebrow">YOUR TRENDWEAR</p>
        <h1>Welcome <em>{user.name}.</em></h1>
        <p className="section-description">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
        {(error || storeError) && <p className="form-message" role="alert">{error || storeError}</p>}
        {message && <p className="form-message" role="status">{message}</p>}
        <button className="btn btn-dark" type="button" onClick={handleSignOut}>Sign Out</button>
      </main>
    );
  }

  return (
    <main className="section account-page">
      <p className="eyebrow dark-eyebrow">YOUR TRENDWEAR</p>
      <h1>{mode === "register" ? <>Create your <em>account.</em></> : <>Welcome <em>back.</em></>}</h1>
      <p className="section-description">{mode === "register" ? "Create an account to keep your cart and wishlist together." : "Sign in to sync your shopping bag and wishlist and place orders."}</p>
      {location.state?.checkout?.product && <p className="form-message">Sign in to continue checkout for {location.state.checkout.product.name}.</p>}
      <form className="account-form" onSubmit={handleSubmit} noValidate>
        {mode === "register" && <>
          <label htmlFor="account-name">Full name</label>
          <input id="account-name" type="text" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" />
          {fieldErrors.name && <p className="form-message" role="alert">{fieldErrors.name}</p>}
          <label htmlFor="account-phone">Phone number</label>
          <input id="account-phone" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+919876543210" />
          {fieldErrors.phone && <p className="form-message" role="alert">{fieldErrors.phone}</p>}
          <label htmlFor="account-gender">Gender</label>
          <select id="account-gender" required value={gender} onChange={(event) => setGender(event.target.value)}>
            <option value="" disabled>Select an option</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non-binary">Non-binary</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
          {fieldErrors.gender && <p className="form-message" role="alert">{fieldErrors.gender}</p>}
        </>}
        <label htmlFor="account-email">Email address</label>
        <input
          id="account-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        {fieldErrors.email && <p className="form-message" role="alert">{fieldErrors.email}</p>}
        <label htmlFor="account-password">Password</label>
        <input
          id="account-password"
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          required
          minLength={mode === "register" ? 10 : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={mode === "register" ? "At least 10 characters" : "Your password"}
        />
        {fieldErrors.password && <p className="form-message" role="alert">{fieldErrors.password}</p>}
        {mode === "register" && <>
          <label htmlFor="account-confirm-password">Confirm password</label>
          <input
            id="account-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Enter your password again"
          />
          {fieldErrors.confirmPassword && <p className="form-message" role="alert">{fieldErrors.confirmPassword}</p>}
        </>}
        {(error || storeError) && <p className="form-message" role="alert">{error || storeError}</p>}
        <button className="btn btn-dark" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "register" ? "Create Account" : "Sign In"} <span>↗</span></button>
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
      <button className="account-mode-toggle" type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setMessage(""); setFieldErrors({}); }}>
        {mode === "register" ? "Already have an account? Sign in" : "New to TrendWear? Create an account"}
      </button>
      {location.state?.checkout && <p><Link to="/checkout" state={location.state.checkout}>Return to checkout</Link></p>}
    </main>
  );
}

export default Account;