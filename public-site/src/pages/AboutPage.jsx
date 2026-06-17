import { useOutletContext } from 'react-router-dom';

export default function AboutPage() {
  const { info } = useOutletContext();

  return (
    <section className="section page-header">
      <div className="container narrow">
        <h1>About Us</h1>
        <p className="lead">{info?.about}</p>

        <div className="info-cards">
          <article>
            <h3>Our Mission</h3>
            <p>
              To provide a world-class gaming environment where players of all skill levels
              can compete, connect, and enjoy the best gaming hardware available.
            </p>
          </article>
          <article>
            <h3>What We Offer</h3>
            <ul>
              {(info?.features || []).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </article>
          <article>
            <h3>Operating Hours</h3>
            <p className="highlight">{info?.hours || 'Open 24/7'}</p>
            <p>We never close — game on your schedule.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
