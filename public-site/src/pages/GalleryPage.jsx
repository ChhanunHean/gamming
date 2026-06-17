import { useOutletContext } from 'react-router-dom';

const gradients = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #059669)',
];

export default function GalleryPage() {
  const { info } = useOutletContext();
  const gallery = info?.gallery || [];

  return (
    <section className="section page-header">
      <div className="container">
        <h1>Photo Gallery</h1>
        <p className="lead">Take a look inside our gaming center.</p>

        <div className="gallery-grid">
          {gallery.map((item, index) => (
            <article key={item.title} className="gallery-card" style={{ background: gradients[index % gradients.length] }}>
              <div className="gallery-overlay">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
