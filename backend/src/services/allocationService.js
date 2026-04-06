import { prisma } from '../prisma.js';

function yearOf(value) {
  return new Date(value).getUTCFullYear();
}

function inYear(value, year) {
  return yearOf(value) === year;
}

export async function allocateInvoiceByCostCode(invoice, yearFilter = null, useClearanceDate = false) {
  if (yearFilter) {
    const dateToCheck = useClearanceDate ? invoice.clearanceDate : invoice.invoiceDate;
    if (!dateToCheck || !inYear(dateToCheck, yearFilter)) return { allocated: new Map(), unallocated: Number(invoice.amount) };
  }

  const allocated = new Map();
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: invoice.purchaseOrderId },
    include: { lineItems: true }
  });

  if (invoice.allocationMode === 'EXACT') {
    const allocations = await prisma.invoiceAllocation.findMany({
      where: { invoiceId: invoice.id },
      include: { poLineItem: true }
    });
    for (const a of allocations) {
      const key = a.poLineItem.costCodeId;
      allocated.set(key, (allocated.get(key) || 0) + Number(a.amount));
    }
    const totalAllocated = [...allocated.values()].reduce((s, n) => s + n, 0);
    return { allocated, unallocated: Math.max(0, Number(invoice.amount) - totalAllocated) };
  }

  if (invoice.allocationMode === 'PROPORTIONAL') {
    const poTotal = po.lineItems.reduce((sum, li) => sum + Number(li.amount), 0);
    for (const li of po.lineItems) {
      const key = li.costCodeId;
      const share = poTotal === 0 ? 0 : Number(li.amount) / poTotal;
      allocated.set(key, (allocated.get(key) || 0) + Number(invoice.amount) * share);
    }
    return { allocated, unallocated: 0 };
  }

  return { allocated, unallocated: Number(invoice.amount) };
}

export async function getCostCodeSummary(year) {
  const budgets = await prisma.budget.findMany({ where: { year }, include: { costCode: true } });

  const poLineItems = await prisma.pOLineItem.findMany({
    where: { purchaseOrder: { issuedDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } },
    include: { costCode: true }
  });

  const invoices = await prisma.invoice.findMany({
    include: { purchaseOrder: true }
  });

  const byCostCode = new Map();
  for (const b of budgets) {
    byCostCode.set(b.costCodeId, {
      costCodeId: b.costCodeId,
      costCode: b.costCode.code,
      budget: Number(b.amount),
      committed: 0,
      invoiced: 0,
      cleared: 0
    });
  }

  for (const li of poLineItems) {
    const row = byCostCode.get(li.costCodeId) || {
      costCodeId: li.costCodeId,
      costCode: li.costCode.code,
      budget: 0,
      committed: 0,
      invoiced: 0,
      cleared: 0
    };
    row.committed += Number(li.amount);
    byCostCode.set(li.costCodeId, row);
  }

  let unallocatedInvoiced = 0;
  let unallocatedCleared = 0;
  for (const inv of invoices) {
    const invAlloc = await allocateInvoiceByCostCode(inv, year, false);
    for (const [costCodeId, amount] of invAlloc.allocated.entries()) {
      const row = byCostCode.get(costCodeId);
      if (!row) continue;
      row.invoiced += amount;
    }
    unallocatedInvoiced += invAlloc.unallocated;

    if (inv.cleared) {
      const clrAlloc = await allocateInvoiceByCostCode(inv, year, true);
      for (const [costCodeId, amount] of clrAlloc.allocated.entries()) {
        const row = byCostCode.get(costCodeId);
        if (!row) continue;
        row.cleared += amount;
      }
      unallocatedCleared += clrAlloc.unallocated;
    }
  }

  const summary = [...byCostCode.values()].map((row) => ({
    ...row,
    overBudget: row.committed > row.budget || row.invoiced > row.budget
  }));

  return { summary, unallocatedInvoiced, unallocatedCleared };
}
