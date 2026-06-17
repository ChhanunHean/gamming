import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPendingToken } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function TwoFactorPage() {
  const { verify2FA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const staff = location.state?.staff;
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pendingToken = getPendingToken();

  if (!pendingToken) {
    navigate('/login', { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await verify2FA(pendingToken, otp);
      navigate('/', { replace: true });
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
          <span className="auth-icon">🔐</span>
          <h1>Two-Factor Authentication</h1>
          <p>
            {staff ? `Welcome, ${staff.name}. ` : ''}
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        {error && <div className="alert error">{error}</div>}

        <label>
          One-Time Password
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            required
            autoFocus
          />
        </label>

        <button type="submit" className="btn primary full" disabled={loading || otp.length !== 6}>
          {loading ? 'Verifying...' : 'Verify & Sign In'}
        </button>

        <button type="button" className="btn link" onClick={() => navigate('/login')}>
          Back to login
        </button>
      </form>
    </div>
  );
}
