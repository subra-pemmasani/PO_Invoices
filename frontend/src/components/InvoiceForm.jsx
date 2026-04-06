import { useState } from 'react';

export default function InvoiceForm({ purchaseOrders, onSubmit }) {
  const [form, setForm] = useState({
    purchaseOrderId: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    amount: '',
    description: '',
    allocationMode: 'PROPORTIONAL'
  });

  const submit = async (event) => {
    event.preventDefault();
    await onSubmit({ ...form, amount: Number(form.amount) });
    setForm({ ...form, invoiceNumber: '', amount: '', description: '' });
  };

  return (
    <form className="panel" onSubmit={submit}>
      <h3>Create Invoice</h3>
      <div className="grid-5">
        <select value={form.purchaseOrderId} onChange={(e) => setForm({ ...form, purchaseOrderId: e.target.value })} required>
          <option value="">Select PO</option>
          {purchaseOrders.map((po) => (
            <option key={po.id} value={po.id}>{po.poNumber} - {po.vendor?.name}</option>
          ))}
        </select>
        <input value={form.invoiceNumber} placeholder="Invoice #" onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} required />
        <input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} required />
        <input type="number" step="0.01" value={form.amount} placeholder="Amount" onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input value={form.description} placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid-3">
        <select value={form.allocationMode} onChange={(e) => setForm({ ...form, allocationMode: e.target.value })}>
          <option value="PROPORTIONAL">Proportional (explicit)</option>
          <option value="NONE">No allocation</option>
        </select>
      </div>
      <button type="submit">Save Invoice</button>
    </form>
  );
}
