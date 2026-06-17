import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { fetchPublicInfo } from '../api.js';

export default function Layout() {
  const [info, setInfo] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetchPublicInfo().then(setInfo).catch(console.error);
  }, []);

  const links = [
    { to: '/', label: 'Home', end: true },
    { to: '/about', label: 'About' },
    { to: '/location', label: 'Location' },
    { to: '/gallery', label: 'Gallery' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <div className="site">
      <header className="site-header">
        <div className="container header-inner">
          <NavLink to="/" className="brand">
            <span className="brand-icon">🎮</span>
            <div>
              <strong>{info?.name || 'Nexus Gaming Center'}</strong>
              <small>{info?.hours || 'Open 24/7'}</small>
            </div>
          </NavLink>

          <button type="button" className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            ☰
          </button>

          <nav className={`nav ${menuOpen ? 'open' : ''}`}>
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setMenuOpen(false)}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <Outlet context={{ info }} />
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <h3>{info?.name || 'Nexus Gaming Center'}</h3>
            <p>Premium gaming experience, open around the clock.</p>
          </div>
          <div>
            <h4>Contact</h4>
            <p>{info?.phone}</p>
            <p>{info?.email}</p>
          </div>
          <div>
            <h4>Hours</h4>
            <p>{info?.hours || 'Open 24/7'}</p>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>© {new Date().getFullYear()} Nexus Gaming Center. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
