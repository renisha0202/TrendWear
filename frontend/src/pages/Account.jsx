import { useState } from "react";

function Account() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setMessage(`Thanks. Account services are not available yet for ${email}.`);
  };

  return (
    <main className="section account-page">
      <p className="eyebrow dark-eyebrow">YOUR TRENDWEAR</p>
      <h1>Welcome <em>back.</em></h1>
      <p className="section-description">Account sign-in is not connected. Submit an email to see the current status.</p>
      <form className="account-form" onSubmit={handleSubmit}>
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
        <button className="btn btn-dark" type="submit">Continue <span>↗</span></button>
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
    </main>
  );
}

export default Account;