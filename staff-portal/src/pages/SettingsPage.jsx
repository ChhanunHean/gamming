import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.getSettings().then(setSettings).catch((e) => setError(e.message));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err.message);
    }
  }

  function update(key, value) {
    setSettings({ ...settings, [key]: value });
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>System Settings</h1>
        <p>Configure gaming center settings and pricing</p>
      </header>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <section className="panel narrow">
        <form className="form" onSubmit={handleSave}>
          <h2>General</h2>
          <label>
            Center Name
            <input value={settings.center_name || ''} onChange={(e) => update('center_name', e.target.value)} />
          </label>
          <label>
            Address
            <input value={settings.center_address || ''} onChange={(e) => update('center_address', e.target.value)} />
          </label>
          <label>
            Phone
            <input value={settings.center_phone || ''} onChange={(e) => update('center_phone', e.target.value)} />
          </label>
          <label>
            Email
            <input value={settings.center_email || ''} onChange={(e) => update('center_email', e.target.value)} />
          </label>
          <label>
            Hours
            <input value={settings.center_hours || ''} onChange={(e) => update('center_hours', e.target.value)} />
          </label>

          <h2>Pricing & Security</h2>
          <label>
            Hourly Rate ($)
            <input type="number" step="0.01" value={settings.hourly_rate || ''} onChange={(e) => update('hourly_rate', e.target.value)} />
          </label>
          <label>
            Inactivity Timeout (minutes)
            <input type="number" value={settings.inactivity_timeout_minutes || ''} onChange={(e) => update('inactivity_timeout_minutes', e.target.value)} />
          </label>

          <button type="submit" className="btn primary">Save Settings</button>
        </form>
      </section>
    </div>
  );
}
