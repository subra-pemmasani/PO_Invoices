import { useEffect, useMemo, useState } from 'react';
import { api, setAuthEmail } from './api';
import BudgetForm from './components/BudgetForm';
import POForm from './components/POForm';
import InvoiceForm from './components/InvoiceForm';
import DashboardCharts from './components/DashboardCharts';

const screens = [
  'Dashboard',
  'Budget Management',
  'PO List',
  'PO Detail',
  'Create/Edit PO',
  'Invoice List',
  'Invoice Clearance Queue',
  'Vendor Master',
  'Cost Code Master',
  'User Management',
  'Imports'
];

export default function App() {
  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [authEmail, setAuthSessionEmail] = useState(localStorage.getItem('po_auth_email') || '');
  const [loginEmail, setLoginEmail] = useState(localStorage.getItem('po_auth_email') || '');
  const [currentUser, setCurrentUser] = useState(null);

  const [costCodes, setCostCodes] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [clearanceQueue, setClearanceQueue] = useState([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedPO, setSelectedPO] = useState(null);
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  const [vendorForm, setVendorForm] = useState({ name: '', email: '', phone: '' });
  const [costCodeForm, setCostCodeForm] = useState({ code: '', name: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'VIEWER' });

  const canEdit = currentUser?.role === 'ADMIN';
  const canApprove = currentUser?.role === 'ADMIN' || currentUser?.role === 'APPROVER';

  const refresh = async () => {
    if (!authEmail) return;
    try {
      const [me, cc, v, u, b, pos, inv, dash, queue] = await Promise.all([
        api.getMe(),
        api.getCostCodes(),
        api.getVendors(),
        api.getUsers(),
        api.getBudgets(),
        api.getPOs(),
        api.getInvoices(),
        api.getDashboard(new Date().getFullYear()),
        api.getClearanceQueue().catch(() => [])
      ]);
      setCurrentUser(me);
      setCostCodes(cc);
      setVendors(v);
      setUsers(u);
      setBudgets(b);
      setPurchaseOrders(pos);
      setInvoices(inv);
      setDashboard(dash);
      setClearanceQueue(queue);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    refresh();
  }, [authEmail]);

  useEffect(() => {
    if (!selectedPoId) return;
    api.getPOById(selectedPoId).then(setSelectedPO).catch((e) => setError(e.message));
  }, [selectedPoId]);

  const doUpload = async (entity, file) => {
    if (!file) return;
    try {
      const result = await api.uploadCsv(entity, file);
      setUploadStatus(`${entity}: processed ${result.rowsProcessed}, upserted ${result.rowsUpserted}, skipped ${result.rowsSkipped ?? 0}`);
      try {
        await refresh();
      } catch (_e) {
        setError('Upload succeeded, but refresh failed. Please reload the page.');
      }
    } catch (e) {
      setUploadStatus(`Upload failed: ${e.message}`);
    }
  };

  const filteredPOs = useMemo(() => purchaseOrders, [purchaseOrders]);

  if (!authEmail) {
    return (
      <div className="app panel">
        <h2>Sign In</h2>
        <p>Use seeded users: <strong>admin@demo.local</strong>, <strong>approver@demo.local</strong>, <strong>viewer@demo.local</strong>.</p>
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
          <span className="user-chip">{authEmail} ({currentUser?.role || '...'})</span>
          <button onClick={() => { setAuthEmail(''); setAuthSessionEmail(''); setLoginEmail(''); }}>Sign out</button>
          <a className="button-link" href={api.exportExcel()} target="_blank">Export Excel</a>
        </div>
      </header>

      <nav className="tabs">
        {screens.map((screen) => (
          <button key={screen} className={screen === activeScreen ? 'active' : ''} onClick={() => setActiveScreen(screen)}>{screen}</button>
        ))}
      </nav>

      {error && <div className="error">{error}</div>}

      {activeScreen === 'Dashboard' && (
        <section>
          <DashboardCharts summary={dashboard} />
        </section>
      )}

      {activeScreen === 'Budget Management' && (
        <section>
          <BudgetForm costCodes={costCodes} canEdit={canEdit} onSubmit={async (payload) => { await api.createBudget(payload); await refresh(); }} />
          <div className="panel"><h3>Budgets</h3><table><thead><tr><th>Year</th><th>Cost Code</th><th>Amount</th></tr></thead><tbody>{budgets.map((b) => <tr key={b.id}><td>{b.year}</td><td>{b.costCode?.code}</td><td>{Number(b.amount).toFixed(2)}</td></tr>)}</tbody></table></div>
        </section>
      )}

      {activeScreen === 'PO List' && (
        <section className="panel">
          <h3>PO List</h3>
          <table><thead><tr><th>PO #</th><th>Vendor</th><th>Status</th><th>Total</th><th>Select</th></tr></thead><tbody>{filteredPOs.map((po) => <tr key={po.id}><td>{po.poNumber}</td><td>{po.vendor?.name}</td><td>{po.status}</td><td>{Number(po.totalAmount).toFixed(2)}</td><td><button onClick={() => { setSelectedPoId(po.id); setActiveScreen('PO Detail'); }}>View</button></td></tr>)}</tbody></table>
        </section>
      )}

      {activeScreen === 'PO Detail' && (
        <section className="panel">
          <h3>PO Detail</h3>
          {!selectedPO && <p>Select a PO from PO List.</p>}
          {selectedPO && (
            <>
              <p><strong>PO:</strong> {selectedPO.poNumber} | <strong>Vendor:</strong> {selectedPO.vendor?.name} | <strong>Status:</strong> {selectedPO.status}</p>
              <p><strong>Description:</strong> {selectedPO.description || '-'}</p>
              <p><strong>Total Invoiced:</strong> {selectedPO.totalInvoiced?.toFixed(2)} | <strong>Total Cleared:</strong> {selectedPO.totalCleared?.toFixed(2)} | <strong>Remaining Uninvoiced:</strong> {selectedPO.remainingUninvoiced?.toFixed(2)}</p>
              {canEdit && (
                <div className="quick-login">
                  {['OPEN', 'PARTIALLY_INVOICED', 'FULLY_INVOICED', 'CLOSED', 'CANCELLED'].map((status) => (
                    <button key={status} onClick={async () => { await api.updatePOStatus(selectedPO.id, status); setSelectedPO(await api.getPOById(selectedPO.id)); await refresh(); }}>{status}</button>
                  ))}
                </div>
              )}
              <h4>Line Items</h4>
              <ul>{selectedPO.lineItems.map((li) => <li key={li.id}>{li.costCode?.code} - {Number(li.amount).toFixed(2)} ({li.description || 'no description'})</li>)}</ul>
              <h4>Linked Invoices</h4>
              <ul>{selectedPO.invoices.map((inv) => <li key={inv.id}>{inv.invoiceNumber} - {Number(inv.amount).toFixed(2)} - {inv.cleared ? 'Cleared' : 'Pending'}</li>)}</ul>
            </>
          )}
        </section>
      )}

      {activeScreen === 'Create/Edit PO' && (
        <section>
          <POForm costCodes={costCodes} vendors={vendors} canEdit={canEdit} onSubmit={async (payload) => { await api.createPO(payload); await refresh(); }} />
          <div className="panel"><p>Use PO List + PO Detail for review and status updates. Edit API is supported backend-side for future enhanced form editing.</p></div>
        </section>
      )}

      {activeScreen === 'Invoice List' && (
        <section>
          <InvoiceForm purchaseOrders={purchaseOrders} canEdit={canEdit} onSubmit={async (payload) => { await api.createInvoice(payload); await refresh(); }} />
          <div className="panel"><h3>Invoices</h3><table><thead><tr><th>Invoice #</th><th>PO #</th><th>Vendor</th><th>Amount</th><th>Date</th><th>Created By</th><th>Updated By</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td>{invoice.invoiceNumber}</td><td>{invoice.purchaseOrder?.poNumber}</td><td>{invoice.purchaseOrder?.vendor?.name}</td><td>{Number(invoice.amount).toFixed(2)}</td><td>{new Date(invoice.invoiceDate).toLocaleDateString()}</td><td>{invoice.createdBy || '-'}</td><td>{invoice.updatedBy || '-'}</td></tr>)}</tbody></table></div>
        </section>
      )}

      {activeScreen === 'Invoice Clearance Queue' && (
        <section className="panel">
          <h3>Invoice Clearance Queue</h3>
          {!canApprove && <p>Only Approver/Admin can clear invoices.</p>}
          <table><thead><tr><th>Invoice #</th><th>PO #</th><th>Vendor</th><th>Amount</th><th>Date</th><th>Action</th></tr></thead><tbody>{clearanceQueue.map((invoice) => <tr key={invoice.id}><td>{invoice.invoiceNumber}</td><td>{invoice.purchaseOrder?.poNumber}</td><td>{invoice.purchaseOrder?.vendor?.name}</td><td>{Number(invoice.amount).toFixed(2)}</td><td>{new Date(invoice.invoiceDate).toLocaleDateString()}</td><td><button disabled={!canApprove} onClick={async () => { await api.clearInvoice(invoice.id); await refresh(); }}>Clear</button></td></tr>)}</tbody></table>
        </section>
      )}

      {activeScreen === 'Vendor Master' && (
        <section className="panel">
          <h3>Vendor Master</h3>
          <form className="grid-3" onSubmit={async (e) => { e.preventDefault(); await api.createVendor(vendorForm); setVendorForm({ name: '', email: '', phone: '' }); await refresh(); }}>
            <input placeholder="Vendor name" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} required disabled={!canEdit} />
            <input placeholder="Vendor email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} disabled={!canEdit} />
            <input placeholder="Vendor phone" value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} disabled={!canEdit} />
            <button type="submit" disabled={!canEdit}>Save Vendor</button>
          </form>
          <ul>{vendors.map((v) => <li key={v.id}>{v.name} ({v.id})</li>)}</ul>
        </section>
      )}

      {activeScreen === 'Cost Code Master' && (
        <section className="panel">
          <h3>Cost Code Master</h3>
          <form className="grid-3" onSubmit={async (e) => { e.preventDefault(); await api.createCostCode(costCodeForm); setCostCodeForm({ code: '', name: '' }); await refresh(); }}>
            <input placeholder="Code" value={costCodeForm.code} onChange={(e) => setCostCodeForm({ ...costCodeForm, code: e.target.value })} required disabled={!canEdit} />
            <input placeholder="Name" value={costCodeForm.name} onChange={(e) => setCostCodeForm({ ...costCodeForm, name: e.target.value })} required disabled={!canEdit} />
            <button type="submit" disabled={!canEdit}>Save Cost Code</button>
          </form>
          <ul>{costCodes.map((c) => <li key={c.id}>{c.code} - {c.name} ({c.id})</li>)}</ul>
        </section>
      )}

      {activeScreen === 'User Management' && (
        <section className="panel">
          <h3>User Management</h3>
          <form className="grid-4" onSubmit={async (e) => { e.preventDefault(); await api.createUser(userForm); setUserForm({ name: '', email: '', role: 'VIEWER' }); await refresh(); }}>
            <input placeholder="Name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required disabled={!canEdit} />
            <input placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required disabled={!canEdit} />
            <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} disabled={!canEdit}><option value="ADMIN">ADMIN</option><option value="APPROVER">APPROVER</option><option value="VIEWER">VIEWER</option></select>
            <button type="submit" disabled={!canEdit}>Save User</button>
          </form>
          <ul>{users.map((u) => <li key={u.id}>{u.name} - {u.email} ({u.role})</li>)}</ul>
        </section>
      )}

      {activeScreen === 'Imports' && (
        <section className="panel">
          <h3>Imports</h3>
          <p>PO multi-line import workflow: import purchase-orders first, then po-line-items.</p>
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
        </section>
      )}
    </div>
  );
}
