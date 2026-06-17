import { useOutletContext } from 'react-router-dom';

export default function ContactPage() {
  const { info } = useOutletContext();

  return (
    <section className="section page-header">
      <div className="container narrow">
        <h1>Contact Us</h1>
        <p className="lead">Have questions? Reach out — we're here 24/7.</p>

        <div className="contact-grid">
          <article className="info-card">
            <h3>Phone</h3>
            <p><a href={`tel:${info?.phone}`}>{info?.phone}</a></p>
          </article>
          <article className="info-card">
            <h3>Email</h3>
            <p><a href={`mailto:${info?.email}`}>{info?.email}</a></p>
          </article>
          <article className="info-card">
            <h3>Address</h3>
            <p>{info?.address}</p>
          </article>
          <article className="info-card">
            <h3>Hours</h3>
            <p className="highlight">{info?.hours || 'Open 24/7'}</p>
          </article>
        </div>

        <div className="notice">
          <p>
            <strong>Note:</strong> This is an informational website. Customer accounts,
            online booking, and online payments are not available. Visit us in person to play!
          </p>
        </div>
      </div>
    </section>
  );
}
