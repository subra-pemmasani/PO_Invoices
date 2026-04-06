const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-role': 'ADMIN',
      'x-user-id': 'demo-admin'
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
  getPOs: () => request('/purchase-orders'),
  createPO: (payload) => request('/purchase-orders', { method: 'POST', body: JSON.stringify(payload) }),
  getInvoices: () => request('/invoices'),
  createInvoice: (payload) => request('/invoices', { method: 'POST', body: JSON.stringify(payload) }),
  clearInvoice: (id) => request(`/invoices/${id}/clear`, { method: 'POST' }),
  exportExcel: () => `${API_BASE}/exports/excel`
};
