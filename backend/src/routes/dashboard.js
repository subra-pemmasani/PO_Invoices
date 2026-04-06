import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

router.get('/summary', requirePermission('read'), async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    const budgets = await prisma.budget.findMany({
      where: { year },
      include: { costCode: true }
    });

    const lineItems = await prisma.pOLineItem.findMany({
      include: { costCode: true }
    });

    const invoices = await prisma.invoice.findMany({
      include: {
        purchaseOrder: { include: { lineItems: true } }
      }
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

    for (const li of lineItems) {
      const item = byCostCode.get(li.costCodeId) || {
        costCodeId: li.costCodeId,
        costCode: li.costCode.code,
        budget: 0,
        committed: 0,
        invoiced: 0,
        cleared: 0
      };
      item.committed += Number(li.amount);
      byCostCode.set(li.costCodeId, item);
    }

    for (const invoice of invoices) {
      const poTotal = invoice.purchaseOrder.lineItems.reduce((sum, li) => sum + Number(li.amount), 0);
      for (const li of invoice.purchaseOrder.lineItems) {
        const weight = Number(li.amount) / (poTotal || 1);
        const attributedAmount = Number(invoice.amount) * weight;
        const item = byCostCode.get(li.costCodeId);
        if (!item) continue;
        item.invoiced += attributedAmount;
        if (invoice.cleared) {
          item.cleared += attributedAmount;
        }
      }
    }

    const budgetSummary = [...byCostCode.values()].map((row) => ({
      ...row,
      overBudget: row.committed > row.budget || row.invoiced > row.budget
    }));

    const vendorSummary = await prisma.purchaseOrder.groupBy({
      by: ['vendor'],
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } }
    });

    const monthlyRows = await prisma.invoice.findMany({ select: { amount: true, invoiceDate: true } });
    const monthlyMap = new Map();

    for (const inv of monthlyRows) {
      const month = new Date(inv.invoiceDate).toISOString().slice(0, 7);
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + Number(inv.amount));
    }

    const monthlyTrend = [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        amount,
        quarter: `Q${Math.floor((Number(month.slice(5, 7)) - 1) / 3) + 1}`
      }));

    const alerts = {
      overBudget: budgetSummary.filter((row) => row.overBudget),
      unclearedInvoices: await prisma.invoice.findMany({
        where: { cleared: false },
        include: { purchaseOrder: true },
        orderBy: { invoiceDate: 'asc' }
      })
    };

    res.json({ year, budgetSummary, vendorSummary, monthlyTrend, alerts });
  } catch (error) {
    next(error);
  }
});

export default router;
