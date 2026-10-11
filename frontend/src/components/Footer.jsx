
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const currentYear = new Date().getFullYear();

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link to="/" className="brand footer-logo">
            TrendWear<span>.</span>
          </Link>
          <p>Thoughtful fashion. Effortless confidence.</p>
        </div>

        <div className="footer-column">
          <h4>EXPLORE</h4>
          <Link to="/">Home</Link>
          <Link to="/shop">Shop All</Link>
          <Link to="/collections">Collections</Link>
          <Link to="/about">About TrendWear</Link>
        </div>

        <div className="footer-column">
          <h4>NEED HELP?</h4>
          <Link to="/contact">Contact Us</Link>
          <Link to="/contact">Customer Support</Link>
        </div>

        <div className="footer-column">
          <h4>FOLLOW OUR STORY</h4>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noreferrer"
          >
            <svg
  xmlns="http://www.w3.org/2000/svg"
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.8"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <rect x="3" y="3" width="18" height="18" rx="5" />
  <circle cx="12" cy="12" r="4" />
  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
</svg>
{" "}Instagram <ArrowUpRight size={14} />
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {currentYear} TrendWear. All rights reserved.</p>
        <p>DESIGNED WITH INTENTION.</p>
      </div>
    </footer>
  );
}

export default Footer;
