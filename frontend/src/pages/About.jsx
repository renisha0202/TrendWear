import { Link } from "react-router-dom";

function About() {
  return (
    <main className="about-page">
      <section className="about-intro section">
        <p className="eyebrow dark-eyebrow">THE STORY OF TRENDWEAR</p>
        <h1>Style with <em>intention.</em></h1>
        <p className="about-lede">
          TrendWear is built around a simple idea: getting dressed should feel like coming into your own.
        </p>
      </section>
      <section className="editorial section about-editorial">
        <div className="editorial-image">
          <img
            src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85"
            alt="A considered contemporary fashion look"
            loading="lazy"
          />
        </div>
        <div className="editorial-content">
          <p className="eyebrow dark-eyebrow">OUR PHILOSOPHY</p>
          <h2>Less, but <em>better.</em></h2>
          <p>
            We curate versatile silhouettes, thoughtful details, and enduring style. Each piece is chosen to work hard in your wardrobe and feel right for more than one season.
          </p>
          <p>
            Quality is in the way a garment fits, feels, and earns its place in your everyday rotation. That is the standard we keep coming back to.
          </p>
          <Link to="/collections" className="btn btn-dark">Explore Collection <span>↗</span></Link>
        </div>
      </section>
    </main>
  );
}

export default About;