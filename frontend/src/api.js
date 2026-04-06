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
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      'x-user-email': email,
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Request failed');
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  getDashboard: (year) => request(`/dashboard/summary?year=${year}`),
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
    return request(`/imports/${entity}`, { method: 'POST', body: form, headers: {} });
  },
  exportExcel: () => `${API_BASE}/exports/excel`
};
