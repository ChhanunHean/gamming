import { useOutletContext } from 'react-router-dom';

export default function LocationPage() {
  const { info } = useOutletContext();

  return (
    <section className="section page-header">
      <div className="container">
        <h1>Location</h1>
        <p className="lead">Find us easily — we're centrally located and open 24/7.</p>

        <div className="location-grid">
          <div className="location-info">
            <article className="info-card">
              <h3>Address</h3>
              <p>{info?.address}</p>
            </article>
            <article className="info-card">
              <h3>Opening Hours</h3>
              <p className="highlight">{info?.hours || 'Open 24/7'}</p>
            </article>
            <article className="info-card">
              <h3>Getting Here</h3>
              <p>Free parking available. Accessible by public transport.</p>
            </article>
          </div>

          <div className="map-placeholder">
            <div className="map-inner">
              <span>📍</span>
              <h3>Map</h3>
              <p>{info?.address}</p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(info?.address || '')}`}
                target="_blank"
                rel="noreferrer"
                className="btn secondary"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
