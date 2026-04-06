const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const AUTH_EMAIL_KEY = 'po_auth_email';

function getAuthEmail() {
  return localStorage.getItem(AUTH_EMAIL_KEY) || '';
}

export function setAuthEmail(email) {
  if (!email) localStorage.removeItem(AUTH_EMAIL_KEY);
  else localStorage.setItem(AUTH_EMAIL_KEY, email);
}

async function request(path, options = {}) {
  const email = getAuthEmail();
  const baseHeaders = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    'x-user-email': email
  };
  const mergedHeaders = { ...baseHeaders, ...(options.headers || {}) };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Request failed');
  }

  if (response.status === 204) return null;
  return response.json();
}

async function downloadCsv(entity) {
  const email = getAuthEmail();
  const response = await fetch(`${API_BASE}/imports/export/${entity}`, {
    headers: { 'x-user-email': email }
  });
  if (!response.ok) throw new Error('Failed to download CSV');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${entity}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  getDashboard: (year) => request(`/dashboard/summary?year=${year}`),

  getMe: () => request('/master/me'),
  getPOById: (id) => request(`/purchase-orders/${id}`),
  updatePOStatus: (id, status) => request(`/purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getClearanceQueue: () => request('/invoices/clearance-queue'),

  getBudgets: () => request('/budgets'),
  createBudget: (payload) => request('/budgets', { method: 'POST', body: JSON.stringify(payload) }),
  getCostCodes: () => request('/master/cost-codes'),
  createCostCode: (payload) => request('/master/cost-codes', { method: 'POST', body: JSON.stringify(payload) }),
  getVendors: () => request('/master/vendors'),
  createVendor: (payload) => request('/master/vendors', { method: 'POST', body: JSON.stringify(payload) }),
  getUsers: () => request('/master/users'),
  createUser: (payload) => request('/master/users', { method: 'POST', body: JSON.stringify(payload) }),
  getPOs: () => request('/purchase-orders'),
  createPO: (payload) => request('/purchase-orders', { method: 'POST', body: JSON.stringify(payload) }),
  getInvoices: () => request('/invoices'),
  createInvoice: (payload) => request('/invoices', { method: 'POST', body: JSON.stringify(payload) }),
  clearInvoice: (id) => request(`/invoices/${id}/clear`, { method: 'POST' }),
  uploadCsv: async (entity, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/imports/${entity}`, { method: 'POST', body: form });
  },
  downloadCsv,
  exportExcel: () => `${API_BASE}/exports/excel`
};
