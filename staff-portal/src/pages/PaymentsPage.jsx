import { useEffect, useState } from 'react';
import { api } from '../api.js';

const methods = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'qr', label: 'QR Payment' },
  { value: 'ewallet', label: 'E-Wallet' },
];

export default function PaymentsPage() {
  const [sessions, setSessions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ sessionId: '', paymentMethod: 'cash' });
  const [calculated, setCalculated] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadData() {
    const allSessions = await api.getSessions();
    const unpaid = allSessions.filter((s) => s.status === 'completed');
    const existingPayments = await api.getPayments('all');
    const paidIds = new Set(existingPayments.map((p) => p.session_id));
    setSessions(unpaid.filter((s) => !paidIds.has(s.id)));
    setPayments(existingPayments);
  }

  useEffect(() => {
    loadData().catch((e) => setError(e.message));
  }, []);

  async function handleSessionSelect(sessionId) {
    setForm({ ...form, sessionId });
    if (sessionId) {
      const calc = await api.calculatePayment(sessionId);
      setCalculated(calc);
    } else {
      setCalculated(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payment = await api.recordPayment({
        sessionId: parseInt(form.sessionId, 10),
        paymentMethod: form.paymentMethod,
        amount: calculated?.amount,
      });
      setSuccess(`Payment recorded! Receipt: ${payment.receipt_number} — $${payment.amount.toFixed(2)}`);
      setForm({ sessionId: '', paymentMethod: 'cash' });
      setCalculated(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Payment Management</h1>
        <p>Record customer payments and view today's transactions</p>
      </header>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="page-grid">
        <section className="panel">
          <h2>Record Payment</h2>
          <form className="form" onSubmit={handleSubmit}>
            <label>
              Completed Session
              <select
                value={form.sessionId}
                onChange={(e) => handleSessionSelect(e.target.value)}
                required
              >
                <option value="">Select session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.customer_name} — {s.station_name} ({s.duration_minutes} min)
                  </option>
                ))}
              </select>
            </label>

            {calculated && (
              <div className="calc-box">
                <span>Duration: {calculated.durationMinutes} minutes</span>
                <strong>Amount: ${calculated.amount.toFixed(2)}</strong>
              </div>
            )}

            <label>
              Payment Method
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              >
                {methods.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>

            <button type="submit" className="btn primary" disabled={loading || !form.sessionId}>
              {loading ? 'Processing...' : 'Record Payment'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Today's Payments</h2>
          {payments.length === 0 ? (
            <p className="muted">No payments recorded today</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td><code>{p.receipt_number}</code></td>
                      <td>{p.customer_name}</td>
                      <td>${p.amount.toFixed(2)}</td>
                      <td>{p.payment_method}</td>
                      <td>{new Date(p.payment_date).toLocaleTimeString()}</td>
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
