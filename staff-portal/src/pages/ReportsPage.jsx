import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ReportsPage() {
  const { isManager } = useAuth();
  const [period, setPeriod] = useState('daily');
  const [customerReport, setCustomerReport] = useState([]);
  const [revenueReport, setRevenueReport] = useState([]);
  const [stationReport, setStationReport] = useState([]);
  const [staffReport, setStaffReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [customers, revenue, stations] = await Promise.all([
          api.getCustomerReport(period),
          api.getRevenueReport(period),
          api.getStationReport(),
        ]);
        setCustomerReport(customers);
        setRevenueReport(revenue);
        setStationReport(stations);

        if (isManager) {
          const staff = await api.getStaffActivityReport();
          setStaffReport(staff);
        }
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [period, isManager]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Reports & Analytics</h1>
        <p>Customer visits, revenue, and station usage reports</p>
      </header>

      {error && <div className="alert error">{error}</div>}

      <div className="filter-bar">
        <label>
          Period
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
      </div>

      <div className="reports-grid">
        <section className="panel">
          <h2>Customer Visits</h2>
          {customerReport.length === 0 ? (
            <p className="muted">No data</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Period</th><th>Visits</th><th>Unique</th></tr>
                </thead>
                <tbody>
                  {customerReport.map((r) => (
                    <tr key={r.period}>
                      <td>{r.period}</td>
                      <td>{r.visits}</td>
                      <td>{r.unique_customers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Revenue</h2>
          {revenueReport.length === 0 ? (
            <p className="muted">No data</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Period</th><th>Revenue</th><th>Transactions</th></tr>
                </thead>
                <tbody>
                  {revenueReport.map((r) => (
                    <tr key={r.period}>
                      <td>{r.period}</td>
                      <td>${r.revenue.toFixed(2)}</td>
                      <td>{r.transactions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel full-width">
          <h2>Station Usage</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Status</th>
                  <th>Total Sessions</th>
                  <th>Active</th>
                  <th>Total Minutes</th>
                </tr>
              </thead>
              <tbody>
                {stationReport.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td><span className={`status-pill ${s.status === 'available' ? 'green' : s.status === 'occupied' ? 'blue' : 'orange'}`}>{s.status}</span></td>
                    <td>{s.total_sessions}</td>
                    <td>{s.active_sessions}</td>
                    <td>{s.total_minutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {isManager && staffReport && (
          <>
            <section className="panel">
              <h2>Staff Transactions</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Staff</th><th>Role</th><th>Payments</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {staffReport.transactions.map((t) => (
                      <tr key={t.name}>
                        <td>{t.name}</td>
                        <td>{t.role}</td>
                        <td>{t.payment_count}</td>
                        <td>${t.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <h2>Recent Login Attempts</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Username</th><th>Success</th><th>IP</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {staffReport.logins.slice(0, 15).map((l, i) => (
                      <tr key={i}>
                        <td>{l.username}</td>
                        <td>{l.success ? '✅' : '❌'}</td>
                        <td>{l.ip_address || '—'}</td>
                        <td>{new Date(l.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
