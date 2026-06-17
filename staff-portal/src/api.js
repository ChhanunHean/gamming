const TOKEN_KEY = 'gc_access_token';
const PENDING_KEY = 'gc_pending_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PENDING_KEY);
}

export function getPendingToken() {
  return localStorage.getItem(PENDING_KEY);
}

export function setPendingToken(token) {
  localStorage.setItem(PENDING_KEY, token);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`/api${path}`, { ...options, headers });

  if (response.status === 401 && token) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  verify2FA: (pendingToken, otp) =>
    request('/auth/verify-2fa', { method: 'POST', body: JSON.stringify({ pendingToken, otp }) }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request('/auth/me'),

  getDashboard: () => request('/dashboard/stats'),

  getActiveSessions: () => request('/sessions/active'),
  getSessions: () => request('/sessions'),
  checkIn: (data) => request('/sessions/check-in', { method: 'POST', body: JSON.stringify(data) }),
  checkOut: (id) => request(`/sessions/${id}/check-out`, { method: 'POST' }),

  getStations: () => request('/stations'),
  updateStation: (id, status) =>
    request(`/stations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getPayments: (period) => request(`/payments?period=${period || 'all'}`),
  recordPayment: (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),
  calculatePayment: (sessionId) => request(`/payments/calculate/${sessionId}`),

  getCustomerReport: (period) => request(`/reports/customers?period=${period}`),
  getRevenueReport: (period) => request(`/reports/revenue?period=${period}`),
  getStationReport: () => request('/reports/stations'),
  getStaffActivityReport: () => request('/reports/staff-activity'),

  getStaff: () => request('/staff'),
  createStaff: (data) => request('/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id, data) => request(`/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  reset2FA: (id) => request(`/staff/${id}/reset-2fa`, { method: 'POST' }),

  getAuditLogs: () => request('/audit-logs'),
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
