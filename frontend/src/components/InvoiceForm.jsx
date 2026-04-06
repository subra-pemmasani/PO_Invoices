import { useMemo, useState } from 'react';

export default function InvoiceForm({ purchaseOrders, onSubmit, canEdit }) {
  const [form, setForm] = useState({
    purchaseOrderId: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    amount: '',
    description: '',
    allocationMode: 'PROPORTIONAL'
  });

  const selectedPO = useMemo(() => purchaseOrders.find((po) => po.id === form.purchaseOrderId), [purchaseOrders, form.purchaseOrderId]);
  const totalInvoicedSoFar = selectedPO ? selectedPO.invoices.reduce((s, i) => s + Number(i.amount), 0) : 0;
  const remaining = selectedPO ? Number(selectedPO.totalAmount) - totalInvoicedSoFar : 0;

  const submit = async (event) => {
    event.preventDefault();
    await onSubmit({ ...form, amount: Number(form.amount), vendorId: selectedPO?.vendorId });
    setForm({ ...form, invoiceNumber: '', amount: '', description: '' });
  };

  return (
    <form className="panel" onSubmit={submit}>
      <h3>Create Invoice</h3>
      <div className="grid-5">
        <select value={form.purchaseOrderId} onChange={(e) => setForm({ ...form, purchaseOrderId: e.target.value })} required disabled={!canEdit}>
          <option value="">Select PO</option>
          {purchaseOrders.map((po) => (
            <option key={po.id} value={po.id}>{po.poNumber} - {po.vendor?.name}</option>
          ))}
        </select>
        <input value={form.invoiceNumber} placeholder="Invoice #" onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} required disabled={!canEdit} />
        <input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} required disabled={!canEdit} />
        <input type="number" step="0.01" value={form.amount} placeholder="Amount" onChange={(e) => setForm({ ...form, amount: e.target.value })} required disabled={!canEdit} />
        <input value={form.description} placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={!canEdit} />
      </div>
      <div className="grid-3">
        <select value={form.allocationMode} onChange={(e) => setForm({ ...form, allocationMode: e.target.value })} disabled={!canEdit}>
          <option value="PROPORTIONAL">Proportional (explicit)</option>
          <option value="NONE">No allocation</option>
        </select>
      </div>

      {selectedPO && (
        <div className="panel nested">
          <h4>Selected PO Snapshot</h4>
          <p><strong>Vendor:</strong> {selectedPO.vendor?.name}</p>
          <p><strong>PO Total:</strong> {Number(selectedPO.totalAmount).toFixed(2)}</p>
          <p><strong>Invoiced So Far:</strong> {totalInvoicedSoFar.toFixed(2)}</p>
          <p><strong>Remaining Balance:</strong> {remaining.toFixed(2)}</p>
          <h5>Cost Code Breakdown</h5>
          <ul>
            {selectedPO.lineItems.map((li) => (
              <li key={li.id}>{li.costCode?.code} - {Number(li.amount).toFixed(2)}</li>
            ))}
          </ul>
        </div>
      )}

      <button type="submit" disabled={!canEdit}>Save Invoice</button>
    </form>
  );
}
