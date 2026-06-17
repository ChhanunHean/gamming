import { useEffect, useState } from 'react';
import { api } from '../api.js';

const statusColors = { available: 'green', occupied: 'blue', maintenance: 'orange' };

export default function StationsPage() {
  const [stations, setStations] = useState([]);
  const [error, setError] = useState('');

  async function loadStations() {
    const data = await api.getStations();
    setStations(data);
  }

  useEffect(() => {
    loadStations().catch((e) => setError(e.message));
  }, []);

  async function updateStatus(id, status) {
    setError('');
    try {
      await api.updateStation(id, status);
      await loadStations();
    } catch (err) {
      setError(err.message);
    }
  }

  const stats = {
    total: stations.length,
    available: stations.filter((s) => s.status === 'available').length,
    occupied: stations.filter((s) => s.status === 'occupied').length,
    maintenance: stations.filter((s) => s.status === 'maintenance').length,
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Gaming Stations</h1>
        <p>Monitor and manage all gaming stations</p>
      </header>

      {error && <div className="alert error">{error}</div>}

      <div className="mini-stats bar">
        <div><span>Total</span><strong>{stats.total}</strong></div>
        <div><span>Available</span><strong className="available">{stats.available}</strong></div>
        <div><span>Occupied</span><strong className="occupied">{stats.occupied}</strong></div>
        <div><span>Maintenance</span><strong className="maintenance">{stats.maintenance}</strong></div>
      </div>

      <div className="station-grid">
        {stations.map((station) => (
          <article key={station.id} className={`station-card ${station.status}`}>
            <div className="station-header">
              <h3>{station.name}</h3>
              <span className={`status-pill ${statusColors[station.status]}`}>{station.status}</span>
            </div>

            {station.current_customer && (
              <p className="station-customer">
                👤 {station.current_customer}
                <small>since {new Date(station.current_check_in).toLocaleTimeString()}</small>
              </p>
            )}

            <div className="station-actions">
              {station.status !== 'available' && !station.current_customer && (
                <button type="button" className="btn small" onClick={() => updateStatus(station.id, 'available')}>
                  Set Available
                </button>
              )}
              {station.status !== 'maintenance' && !station.current_customer && (
                <button type="button" className="btn small secondary" onClick={() => updateStatus(station.id, 'maintenance')}>
                  Maintenance
                </button>
              )}
              {station.status === 'maintenance' && (
                <button type="button" className="btn small" onClick={() => updateStatus(station.id, 'available')}>
                  Back Online
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
