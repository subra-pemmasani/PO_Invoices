import { useState } from 'react';

export default function BudgetForm({ costCodes, onSubmit }) {
  const [form, setForm] = useState({ costCodeId: '', year: new Date().getFullYear(), amount: '' });

  const submit = async (event) => {
    event.preventDefault();
    await onSubmit({ ...form, year: Number(form.year), amount: Number(form.amount) });
    setForm((prev) => ({ ...prev, amount: '' }));
  };

  return (
    <form className="panel" onSubmit={submit}>
      <h3>Create / Update Budget</h3>
      <div className="grid-3">
        <select value={form.costCodeId} onChange={(e) => setForm({ ...form, costCodeId: e.target.value })} required>
          <option value="">Select cost code</option>
          {costCodes.map((cc) => (
            <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
          ))}
        </select>
        <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
        <input type="number" step="0.01" value={form.amount} placeholder="Amount" onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
      </div>
      <button type="submit">Save Budget</button>
    </form>
  );
}
