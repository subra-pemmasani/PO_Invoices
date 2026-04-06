import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../prisma.js';
import { requirePermission } from '../middleware/auth.js';
import { syncPOStatus } from './purchaseOrders.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function parseCsv(buffer) {
  const text = buffer.toString('utf-8').trim();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    return headers.reduce((acc, key, i) => {
      acc[key] = values[i] ?? '';
      return acc;
    }, {});
  });
}

router.post('/:entity', requirePermission('write'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file is required as form-data field: file' });
    const rows = parseCsv(req.file.buffer);
    let created = 0;

    if (req.params.entity === 'cost-codes') {
      for (const row of rows) {
        await prisma.costCode.upsert({
          where: { code: row.code },
          update: { name: row.name },
          create: { code: row.code, name: row.name }
        });
        created += 1;
      }
    } else if (req.params.entity === 'vendors') {
      for (const row of rows) {
        await prisma.vendor.upsert({
          where: { name: row.name },
          update: { email: row.email || null, phone: row.phone || null },
          create: { name: row.name, email: row.email || null, phone: row.phone || null }
        });
        created += 1;
      }
    } else if (req.params.entity === 'budgets') {
      for (const row of rows) {
        await prisma.budget.upsert({
          where: { year_costCodeId: { year: Number(row.year), costCodeId: row.costCodeId } },
          update: { amount: Number(row.amount) },
          create: { year: Number(row.year), costCodeId: row.costCodeId, amount: Number(row.amount) }
        });
        created += 1;
      }
    } else if (req.params.entity === 'purchase-orders') {
      for (const row of rows) {
        const po = await prisma.purchaseOrder.upsert({
          where: { poNumber: row.poNumber },
          update: {
            vendorId: row.vendorId,
            issuedDate: new Date(row.issuedDate),
            description: row.description || null,
            totalAmount: Number(row.totalAmount || 0)
          },
          create: {
            poNumber: row.poNumber,
            vendorId: row.vendorId,
            issuedDate: new Date(row.issuedDate),
            description: row.description || null,
            totalAmount: Number(row.totalAmount || 0)
          }
        });
        await syncPOStatus(po.id);
        created += 1;
      }
    } else if (req.params.entity === 'invoices') {
      for (const row of rows) {
        const invoice = await prisma.invoice.upsert({
          where: { purchaseOrderId_invoiceNumber: { purchaseOrderId: row.purchaseOrderId, invoiceNumber: row.invoiceNumber } },
          update: {
            invoiceDate: new Date(row.invoiceDate),
            amount: Number(row.amount),
            description: row.description || null,
            allocationMode: row.allocationMode || 'PROPORTIONAL'
          },
          create: {
            purchaseOrderId: row.purchaseOrderId,
            invoiceNumber: row.invoiceNumber,
            invoiceDate: new Date(row.invoiceDate),
            amount: Number(row.amount),
            description: row.description || null,
            allocationMode: row.allocationMode || 'PROPORTIONAL'
          }
        });
        await syncPOStatus(invoice.purchaseOrderId);
        created += 1;
      }
    } else {
      return res.status(400).json({ error: 'Unsupported entity. Use vendors, cost-codes, budgets, purchase-orders, invoices' });
    }

    return res.json({ entity: req.params.entity, rowsProcessed: rows.length, rowsUpserted: created });
  } catch (error) {
    next(error);
  }
});

export default router;
