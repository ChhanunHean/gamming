import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setPendingToken } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(form.username, form.password);
      setPendingToken(result.pendingToken);
      navigate('/verify-2fa', { state: { staff: result.staff } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-header">
          <span className="auth-icon">🎮</span>
          <h1>Staff Portal</h1>
          <p>Gaming Center Management System</p>
        </div>

        {error && <div className="alert error">{error}</div>}

        <label>
          Username
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            autoFocus
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </label>

        <button type="submit" className="btn primary full" disabled={loading}>
          {loading ? 'Signing in...' : 'Continue to 2FA'}
        </button>

        <p className="auth-note">
          Two-factor authentication is required for all staff accounts.
        </p>
      </form>
    </div>
  );
}
