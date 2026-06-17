import { Link, useOutletContext } from 'react-router-dom';

export default function HomePage() {
  const { info } = useOutletContext();

  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <span className="badge">Open 24/7</span>
          <h1>Level Up Your Gaming Experience</h1>
          <p>
            {info?.about ||
              'Premium gaming PCs, console zones, and tournament spaces in a modern, comfortable environment.'}
          </p>
          <div className="hero-actions">
            <Link to="/location" className="btn primary">Find Us</Link>
            <Link to="/gallery" className="btn secondary">View Gallery</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Why Play Here?</h2>
          <div className="feature-grid">
            {(info?.features || []).map((feature) => (
              <article key={feature} className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>{feature}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container cta-panel">
          <div>
            <h2>Ready to Game?</h2>
            <p>Walk in anytime — we're open 24 hours a day, 7 days a week.</p>
          </div>
          <Link to="/contact" className="btn primary">Contact Us</Link>
        </div>
      </section>
    </>
  );
}
