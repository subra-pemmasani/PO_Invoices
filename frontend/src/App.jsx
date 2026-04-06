import { useEffect, useMemo, useState } from 'react';
import { api, setAuthEmail } from './api';
import BudgetForm from './components/BudgetForm';
import POForm from './components/POForm';
import InvoiceForm from './components/InvoiceForm';
import DashboardCharts from './components/DashboardCharts';

const tabs = ['Dashboard', 'Master Data', 'Budgets', 'Purchase Orders', 'Invoices', 'Imports'];

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [authEmail, setAuthSessionEmail] = useState(localStorage.getItem('po_auth_email') || '');
  const [loginEmail, setLoginEmail] = useState(localStorage.getItem('po_auth_email') || '');
  const [costCodes, setCostCodes] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [vendorFilter, setVendorFilter] = useState('');
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  const [vendorForm, setVendorForm] = useState({ name: '', email: '', phone: '' });
  const [costCodeForm, setCostCodeForm] = useState({ code: '', name: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'VIEWER' });

  const refresh = async () => {
    if (!authEmail) return;
    try {
      const [cc, v, u, b, pos, inv, dash] = await Promise.all([
        api.getCostCodes(),
        api.getVendors(),
        api.getUsers(),
        api.getBudgets(),
        api.getPOs(),
        api.getInvoices(),
        api.getDashboard(new Date().getFullYear())
      ]);
      setCostCodes(cc);
      setVendors(v);
      setUsers(u);
      setBudgets(b);
      setPurchaseOrders(pos);
      setInvoices(inv);
      setDashboard(dash);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    refresh();
  }, [authEmail]);

  const filteredPOs = useMemo(() => {
    const term = vendorFilter.trim().toLowerCase();
    if (!term) return purchaseOrders;
    return purchaseOrders.filter((po) => po.vendor?.name?.toLowerCase().includes(term));
  }, [purchaseOrders, vendorFilter]);

  const doUpload = async (entity, file) => {
    if (!file) return;
    try {
      const result = await api.uploadCsv(entity, file);
      setUploadStatus(`${entity}: ${result.rowsUpserted} rows processed`);
      await refresh();
    } catch (e) {
      setUploadStatus(`Upload failed: ${e.message}`);
    }
  };

  if (!authEmail) {
    return (
      <div className="app panel">
        <h2>Sign In</h2>
        <p>Use one of the seeded users: <strong>admin@demo.local</strong>, <strong>approver@demo.local</strong>, or <strong>viewer@demo.local</strong>.</p>
        <form onSubmit={(e) => { e.preventDefault(); setAuthEmail(loginEmail); setAuthSessionEmail(loginEmail); }}>
          <input value={loginEmail} placeholder="admin@demo.local" onChange={(e) => setLoginEmail(e.target.value)} required />
          <button type="submit">Continue</button>
          <div className="quick-login">
            <button type="button" onClick={() => setLoginEmail('admin@demo.local')}>Use Admin</button>
            <button type="button" onClick={() => setLoginEmail('approver@demo.local')}>Use Approver</button>
            <button type="button" onClick={() => setLoginEmail('viewer@demo.local')}>Use Viewer</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>Budget, PO & Invoice Tracker</h1>
        <div className="actions">
          <span className="user-chip">{authEmail}</span>
          <button onClick={() => { setAuthEmail(''); setAuthSessionEmail(''); setLoginEmail(''); refresh(); }}>Sign out</button>
          <a className="button-link" href={api.exportExcel()} target="_blank">Export Excel</a>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map((tab) => (
          <button key={tab} className={tab === activeTab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </nav>

      {error && <div className="error">{error}</div>}

      {activeTab === 'Dashboard' && (
        <section>
          <DashboardCharts summary={dashboard} />
          <div className="panel">
            <h3>Vendor Spend Summary</h3>
            <table>
              <thead><tr><th>Vendor</th><th>Total Spend</th></tr></thead>
              <tbody>
                {dashboard?.vendorSummary?.map((row) => (
                  <tr key={row.vendor}><td>{row.vendor}</td><td>{Number(row.total).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'Master Data' && (
        <section>
          <div className="panel">
            <h3>Add Vendor</h3>
            <form className="grid-3" onSubmit={async (e) => { e.preventDefault(); await api.createVendor(vendorForm); setVendorForm({ name: '', email: '', phone: '' }); await refresh(); }}>
              <input placeholder="Vendor name" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} required />
              <input placeholder="Vendor email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
              <input placeholder="Vendor phone" value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
              <button type="submit">Save Vendor</button>
            </form>
          </div>

          <div className="panel">
            <h3>Add Cost Code</h3>
            <form className="grid-3" onSubmit={async (e) => { e.preventDefault(); await api.createCostCode(costCodeForm); setCostCodeForm({ code: '', name: '' }); await refresh(); }}>
              <input placeholder="Code" value={costCodeForm.code} onChange={(e) => setCostCodeForm({ ...costCodeForm, code: e.target.value })} required />
              <input placeholder="Name" value={costCodeForm.name} onChange={(e) => setCostCodeForm({ ...costCodeForm, name: e.target.value })} required />
              <button type="submit">Save Cost Code</button>
            </form>
          </div>

          <div className="panel">
            <h3>Add User</h3>
            <form className="grid-4" onSubmit={async (e) => { e.preventDefault(); await api.createUser(userForm); setUserForm({ name: '', email: '', role: 'VIEWER' }); await refresh(); }}>
              <input placeholder="Name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
              <input placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
              <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                <option value="ADMIN">ADMIN</option>
                <option value="APPROVER">APPROVER</option>
                <option value="VIEWER">VIEWER</option>
              </select>
              <button type="submit">Save User</button>
            </form>
          </div>

          <div className="panel">
            <h3>Current Master Data</h3>
            <p>Vendors: {vendors.length} | Cost Codes: {costCodes.length} | Users: {users.length}</p>
          </div>
        </section>
      )}

      {activeTab === 'Budgets' && (
        <section>
          <BudgetForm costCodes={costCodes} onSubmit={async (payload) => { await api.createBudget(payload); await refresh(); }} />
          <div className="panel">
            <h3>Budgets</h3>
            <table>
              <thead><tr><th>Year</th><th>Cost Code</th><th>Amount</th></tr></thead>
              <tbody>
                {budgets.map((b) => (
                  <tr key={b.id}><td>{b.year}</td><td>{b.costCode?.code}</td><td>{Number(b.amount).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'Purchase Orders' && (
        <section>
          <POForm costCodes={costCodes} vendors={vendors} onSubmit={async (payload) => { await api.createPO(payload); await refresh(); }} />
          <div className="panel">
            <h3>Purchase Orders</h3>
            <input placeholder="Filter by vendor" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} />
            <table>
              <thead><tr><th>PO #</th><th>Vendor</th><th>Status</th><th>Total</th><th>Issued</th></tr></thead>
              <tbody>
                {filteredPOs.map((po) => (
                  <tr key={po.id}><td>{po.poNumber}</td><td>{po.vendor?.name}</td><td>{po.status}</td><td>{Number(po.totalAmount).toFixed(2)}</td><td>{new Date(po.issuedDate).toLocaleDateString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'Invoices' && (
        <section>
          <InvoiceForm purchaseOrders={purchaseOrders} onSubmit={async (payload) => { await api.createInvoice(payload); await refresh(); }} />
          <div className="panel">
            <h3>Invoices</h3>
            <table>
              <thead><tr><th>Invoice #</th><th>PO #</th><th>Amount</th><th>Date</th><th>Cleared</th><th>Actions</th></tr></thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{invoice.purchaseOrder?.poNumber}</td>
                    <td>{Number(invoice.amount).toFixed(2)}</td>
                    <td>{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                    <td>{invoice.cleared ? 'Yes' : 'No'}</td>
                    <td>{!invoice.cleared && <button onClick={async () => { await api.clearInvoice(invoice.id); await refresh(); }}>Mark Cleared</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'Imports' && (
        <section>
          <div className="panel">
            <h3>CSV Uploads</h3>
            <p>Upload CSV files with headers matching backend fields. Download template or existing data with IDs:</p>
            <ul>
              <li><a href="/csv-templates/vendors.csv" download>vendors.csv template</a></li>
              <li><a href="/csv-templates/cost-codes.csv" download>cost-codes.csv template</a></li>
              <li><a href="/csv-templates/budgets.csv" download>budgets.csv template</a></li>
              <li><a href="/csv-templates/purchase-orders.csv" download>purchase-orders.csv template</a></li>
              <li><a href="/csv-templates/po-line-items.csv" download>po-line-items.csv template</a></li>
              <li><a href="/csv-templates/invoices.csv" download>invoices.csv template</a></li>
            </ul>
            <div className="grid-3">
              <label>Vendors CSV <input type="file" accept=".csv" onChange={(e) => doUpload('vendors', e.target.files?.[0])} /></label>
              <label>Cost Codes CSV <input type="file" accept=".csv" onChange={(e) => doUpload('cost-codes', e.target.files?.[0])} /></label>
              <label>Budgets CSV <input type="file" accept=".csv" onChange={(e) => doUpload('budgets', e.target.files?.[0])} /></label>
              <label>PO CSV <input type="file" accept=".csv" onChange={(e) => doUpload('purchase-orders', e.target.files?.[0])} /></label>
              <label>PO Line Items CSV <input type="file" accept=".csv" onChange={(e) => doUpload('po-line-items', e.target.files?.[0])} /></label>
              <label>Invoices CSV <input type="file" accept=".csv" onChange={(e) => doUpload('invoices', e.target.files?.[0])} /></label>
            </div>

            <h4>Download current data with IDs</h4>
            <div className="quick-login">
              <button type="button" onClick={() => api.downloadCsv('vendors')}>Export vendors.csv</button>
              <button type="button" onClick={() => api.downloadCsv('cost-codes')}>Export cost-codes.csv</button>
              <button type="button" onClick={() => api.downloadCsv('budgets')}>Export budgets.csv</button>
              <button type="button" onClick={() => api.downloadCsv('purchase-orders')}>Export purchase-orders.csv</button>
              <button type="button" onClick={() => api.downloadCsv('po-line-items')}>Export po-line-items.csv</button>
              <button type="button" onClick={() => api.downloadCsv('invoices')}>Export invoices.csv</button>
            </div>
            {uploadStatus && <p>{uploadStatus}</p>}
          </div>
        </section>
      )}
    </div>
  );
}
