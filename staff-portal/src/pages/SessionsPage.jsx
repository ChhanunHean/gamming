import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function SessionsPage() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [stations, setStations] = useState([]);
  const [form, setForm] = useState({ customerName: '', stationId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadData() {
    const [sessions, sts] = await Promise.all([api.getActiveSessions(), api.getStations()]);
    setActiveSessions(sessions);
    setStations(sts.filter((s) => s.status === 'available'));
  }

  useEffect(() => {
    loadData().catch((e) => setError(e.message));
  }, []);

  async function handleCheckIn(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.checkIn({ customerName: form.customerName, stationId: parseInt(form.stationId, 10) });
      setForm({ customerName: '', stationId: '' });
      setSuccess('Customer checked in successfully');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut(id) {
    setError('');
    setSuccess('');
    try {
      await api.checkOut(id);
      setSuccess('Customer checked out successfully');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Customer Sessions</h1>
        <p>Check customers in and out of gaming stations</p>
      </header>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="page-grid">
        <section className="panel">
          <h2>Check In Customer</h2>
          <form className="form" onSubmit={handleCheckIn}>
            <label>
              Customer Name
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="Enter customer name"
                required
              />
            </label>
            <label>
              Gaming Station
              <select
                value={form.stationId}
                onChange={(e) => setForm({ ...form, stationId: e.target.value })}
                required
              >
                <option value="">Select station</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Checking in...' : 'Check In'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Active Sessions ({activeSessions.length})</h2>
          {activeSessions.length === 0 ? (
            <p className="muted">No active sessions</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Station</th>
                    <th>Check-In</th>
                    <th>Elapsed</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.customer_name}</td>
                      <td>{s.station_name}</td>
                      <td>{new Date(s.check_in_time).toLocaleString()}</td>
                      <td>{s.elapsed_minutes} min</td>
                      <td>
                        <button type="button" className="btn small" onClick={() => handleCheckOut(s.id)}>
                          Check Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
