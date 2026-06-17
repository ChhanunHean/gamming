import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'staff' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newTotp, setNewTotp] = useState(null);

  async function loadStaff() {
    const data = await api.getStaff();
    setStaff(data);
  }

  useEffect(() => {
    loadStaff().catch((e) => setError(e.message));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setNewTotp(null);

    try {
      const result = await api.createStaff(form);
      setSuccess(`Staff account created for ${result.username}`);
      setNewTotp({ username: result.username, secret: result.totpSecret, url: result.otpauthUrl });
      setForm({ name: '', username: '', password: '', role: 'staff' });
      await loadStaff();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(id, isActive) {
    try {
      await api.updateStaff(id, { isActive: !isActive });
      await loadStaff();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReset2FA(id) {
    try {
      const result = await api.reset2FA(id);
      setNewTotp({ secret: result.totpSecret, url: result.otpauthUrl });
      setSuccess('2FA secret reset. Share the new secret with the staff member.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Staff Management</h1>
        <p>Manage staff accounts and permissions</p>
      </header>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {newTotp && (
        <div className="alert info">
          <strong>2FA Setup for {newTotp.username || 'staff'}:</strong>
          <p>Secret: <code>{newTotp.secret}</code></p>
          {newTotp.url && <p className="muted">Add to authenticator app using the OTP Auth URL from server logs.</p>}
        </div>
      )}

      <div className="page-grid">
        <section className="panel">
          <h2>Add Staff Account</h2>
          <form className="form" onSubmit={handleCreate}>
            <label>
              Full Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Username
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </label>
            <label>
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </label>
            <button type="submit" className="btn primary">Create Account</button>
          </form>
        </section>

        <section className="panel">
          <h2>Staff Accounts ({staff.length})</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.username}</td>
                    <td><span className={`role-badge ${s.role}`}>{s.role}</span></td>
                    <td>{s.is_active ? 'Active' : 'Disabled'}</td>
                    <td className="actions">
                      <button type="button" className="btn small secondary" onClick={() => toggleActive(s.id, s.is_active)}>
                        {s.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button type="button" className="btn small" onClick={() => handleReset2FA(s.id)}>
                        Reset 2FA
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
