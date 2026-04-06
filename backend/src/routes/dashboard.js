import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requirePermission } from '../middleware/auth.js';
import { getCostCodeSummary } from '../services/allocationService.js';

const router = Router();

async function getVendorSummary(year) {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year + 1}-01-01`);

  const pos = await prisma.purchaseOrder.findMany({
    where: { issuedDate: { gte: start, lt: end } },
    include: { vendor: true }
  });

  const vendorMap = new Map();
  for (const po of pos) {
    vendorMap.set(po.vendor.name, (vendorMap.get(po.vendor.name) || 0) + Number(po.totalAmount));
  }

  return [...vendorMap.entries()]
    .map(([vendor, total]) => ({ vendor, total }))
    .sort((a, b) => b.total - a.total);
}

async function getTrendSummary(year) {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year + 1}-01-01`);
  const rows = await prisma.invoice.findMany({
    where: { invoiceDate: { gte: start, lt: end } },
    select: { amount: true, invoiceDate: true }
  });

  const monthlyMap = new Map();
  for (const inv of rows) {
    const month = new Date(inv.invoiceDate).toISOString().slice(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + Number(inv.amount));
  }

  return [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month,
      amount,
      quarter: `Q${Math.floor((Number(month.slice(5, 7)) - 1) / 3) + 1}`
    }));
}

router.get('/cost-code-summary', requirePermission('read'), async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const payload = await getCostCodeSummary(year);
    res.json({ year, ...payload });
  } catch (error) {
    next(error);
  }
});

router.get('/vendor-summary', requirePermission('read'), async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const vendorSummary = await getVendorSummary(year);
    res.json({ year, vendorSummary });
  } catch (error) {
    next(error);
  }
});

router.get('/trends', requirePermission('read'), async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const monthlyTrend = await getTrendSummary(year);
    res.json({ year, monthlyTrend });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', requirePermission('read'), async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const { summary: budgetSummary, unallocatedInvoiced, unallocatedCleared } = await getCostCodeSummary(year);
    const vendorSummary = await getVendorSummary(year);
    const monthlyTrend = await getTrendSummary(year);

    const alerts = {
      overBudget: budgetSummary.filter((row) => row.overBudget),
      unclearedInvoices: await prisma.invoice.findMany({
        where: { cleared: false, invoiceDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
        include: { purchaseOrder: true },
        orderBy: { invoiceDate: 'asc' }
      }),
      unallocatedInvoiced,
      unallocatedCleared
    };

    res.json({ year, budgetSummary, vendorSummary, monthlyTrend, alerts });
  } catch (error) {
    next(error);
  }
});

export default router;
