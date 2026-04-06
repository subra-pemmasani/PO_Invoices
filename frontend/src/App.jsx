import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import BudgetForm from './components/BudgetForm';
import POForm from './components/POForm';
import InvoiceForm from './components/InvoiceForm';
import DashboardCharts from './components/DashboardCharts';

const tabs = ['Dashboard', 'Budgets', 'Purchase Orders', 'Invoices'];

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [costCodes, setCostCodes] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [vendorFilter, setVendorFilter] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      const [cc, b, pos, inv, dash] = await Promise.all([
        api.getCostCodes(),
        api.getBudgets(),
        api.getPOs(),
        api.getInvoices(),
        api.getDashboard(new Date().getFullYear())
      ]);
      setCostCodes(cc);
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
  }, []);

  const filteredPOs = useMemo(() => {
    const term = vendorFilter.trim().toLowerCase();
    if (!term) return purchaseOrders;
    return purchaseOrders.filter((po) => po.vendor.toLowerCase().includes(term));
  }, [purchaseOrders, vendorFilter]);

  return (
    <div className="app">
      <header>
        <h1>Budget, PO & Invoice Tracker</h1>
        <a className="button-link" href={api.exportExcel()} target="_blank">Export Excel</a>
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
                  <tr key={row.vendor}><td>{row.vendor}</td><td>{Number(row._sum.totalAmount).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel">
            <h3>Alerts</h3>
            <p>Over budget cost codes: {dashboard?.alerts?.overBudget?.length ?? 0}</p>
            <p>Uncleared invoices: {dashboard?.alerts?.unclearedInvoices?.length ?? 0}</p>
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
          <POForm costCodes={costCodes} onSubmit={async (payload) => { await api.createPO(payload); await refresh(); }} />
          <div className="panel">
            <h3>Purchase Orders</h3>
            <input placeholder="Filter by vendor" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} />
            <table>
              <thead><tr><th>PO #</th><th>Vendor</th><th>Status</th><th>Total</th><th>Issued</th></tr></thead>
              <tbody>
                {filteredPOs.map((po) => (
                  <tr key={po.id}><td>{po.poNumber}</td><td>{po.vendor}</td><td>{po.status}</td><td>{Number(po.totalAmount).toFixed(2)}</td><td>{new Date(po.issuedDate).toLocaleDateString()}</td></tr>
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
    </div>
  );
}
