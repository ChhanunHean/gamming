import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`stat-card ${color || ''}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!stats) return <div className="page-loading">Loading dashboard...</div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Real-time overview of gaming center operations</p>
      </header>

      <section className="stat-grid">
        <StatCard label="Active Customers" value={stats.customers.active} color="blue" />
        <StatCard label="Customers Today" value={stats.customers.today} color="green" />
        <StatCard label="Total Visits" value={stats.customers.totalVisits} />
        <StatCard label="Occupancy Rate" value={`${stats.stations.occupancyRate}%`} color="purple" />
      </section>

      <section className="stat-grid">
        <StatCard label="Revenue Today" value={`$${stats.revenue.today.toFixed(2)}`} color="green" />
        <StatCard label="Revenue This Week" value={`$${stats.revenue.week.toFixed(2)}`} />
        <StatCard label="Revenue This Month" value={`$${stats.revenue.month.toFixed(2)}`} color="blue" />
        <StatCard label="Pending Payments" value={stats.operations.pendingPayments} color="orange" />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>Station Status</h2>
          <div className="mini-stats">
            <div><span>Total</span><strong>{stats.stations.total}</strong></div>
            <div><span>Occupied</span><strong className="occupied">{stats.stations.occupied}</strong></div>
            <div><span>Available</span><strong className="available">{stats.stations.available}</strong></div>
            <div><span>Maintenance</span><strong className="maintenance">{stats.stations.maintenance}</strong></div>
          </div>
          <Link to="/stations" className="panel-link">Manage stations →</Link>
        </section>

        <section className="panel">
          <h2>Most Used Stations</h2>
          <ul className="rank-list">
            {stats.stations.topStations.map((s) => (
              <li key={s.name}>
                <span>{s.name}</span>
                <strong>{s.usage_count} sessions</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Peak Hours</h2>
          <ul className="rank-list">
            {stats.operations.peakHours.map((h) => (
              <li key={h.hour}>
                <span>{h.hour}:00</span>
                <strong>{h.visits} visits</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Revenue by Method (Month)</h2>
          <ul className="rank-list">
            {stats.revenue.byMethod.length === 0 ? (
              <li><span>No payments yet</span></li>
            ) : (
              stats.revenue.byMethod.map((m) => (
                <li key={m.payment_method}>
                  <span>{m.payment_method}</span>
                  <strong>${m.total.toFixed(2)} ({m.count})</strong>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="quick-actions">
        <Link to="/sessions" className="btn primary">Manage Sessions</Link>
        <Link to="/payments" className="btn secondary">Record Payment</Link>
      </div>
    </div>
  );
}
