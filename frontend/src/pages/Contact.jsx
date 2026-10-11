import { Link } from "react-router-dom";

function Contact() {
  return (
    <main className="section contact-page">
      <p className="eyebrow dark-eyebrow">WE ARE HERE TO HELP</p>
      <h1>Contact <em>Us.</em></h1>
      <p>We'd love to hear from you.</p>

      <p>
        Email:{" "}
        <a href="mailto:hello@trendwear.example">
          hello@trendwear.example
        </a>
      </p>

      <Link to="/shop" className="btn btn-dark">
        Explore Collection
      </Link>
    </main>
  );
}

export default Contact;