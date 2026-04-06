import { useState } from 'react';

const blankItem = { costCodeId: '', amount: '', description: '' };

export default function POForm({ costCodes, onSubmit }) {
  const [form, setForm] = useState({
    poNumber: '',
    vendor: '',
    issuedDate: new Date().toISOString().slice(0, 10),
    description: '',
    lineItems: [{ ...blankItem }]
  });

  const updateLineItem = (index, key, value) => {
    const next = [...form.lineItems];
    next[index][key] = value;
    setForm({ ...form, lineItems: next });
  };

  const submit = async (event) => {
    event.preventDefault();
    await onSubmit({
      ...form,
      lineItems: form.lineItems.map((item) => ({ ...item, amount: Number(item.amount) }))
    });
    setForm({ ...form, poNumber: '', description: '', lineItems: [{ ...blankItem }] });
  };

  return (
    <form className="panel" onSubmit={submit}>
      <h3>Create Purchase Order</h3>
      <div className="grid-4">
        <input value={form.poNumber} placeholder="PO Number" onChange={(e) => setForm({ ...form, poNumber: e.target.value })} required />
        <input value={form.vendor} placeholder="Vendor" onChange={(e) => setForm({ ...form, vendor: e.target.value })} required />
        <input type="date" value={form.issuedDate} onChange={(e) => setForm({ ...form, issuedDate: e.target.value })} required />
        <input value={form.description} placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>

      {form.lineItems.map((item, index) => (
        <div key={index} className="grid-3 line-item-row">
          <select value={item.costCodeId} onChange={(e) => updateLineItem(index, 'costCodeId', e.target.value)} required>
            <option value="">Cost code</option>
            {costCodes.map((cc) => (
              <option key={cc.id} value={cc.id}>{cc.code}</option>
            ))}
          </select>
          <input type="number" step="0.01" value={item.amount} placeholder="Line amount" onChange={(e) => updateLineItem(index, 'amount', e.target.value)} required />
          <input value={item.description} placeholder="Line description" onChange={(e) => updateLineItem(index, 'description', e.target.value)} />
        </div>
      ))}

      <div className="actions">
        <button type="button" onClick={() => setForm({ ...form, lineItems: [...form.lineItems, { ...blankItem }] })}>+ Add Line</button>
        <button type="submit">Save PO</button>
      </div>
    </form>
  );
}
