import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAuditLogs().then(setLogs).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Audit Logs</h1>
        <p>Track all staff activities and system events</p>
      </header>

      {error && <div className="alert error">{error}</div>}

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Staff</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="muted">No audit logs yet</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>{log.staff_name || 'System'}</td>
                    <td><code>{log.action}</code></td>
                    <td className="details-cell">{log.details || '—'}</td>
                    <td>{log.ip_address || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
