import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { prisma } from '../prisma.js';
import { requirePermission } from '../middleware/auth.js';
import { syncPOStatus } from './purchaseOrders.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function parseCsv(buffer) {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => String(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

async function refreshPoTotal(poId) {
  const lines = await prisma.pOLineItem.findMany({ where: { purchaseOrderId: poId } });
  const totalAmount = lines.reduce((sum, li) => sum + Number(li.amount), 0);
  await prisma.purchaseOrder.update({ where: { id: poId }, data: { totalAmount } });
  await syncPOStatus(poId);
}

router.get('/export/:entity', requirePermission('read'), async (req, res, next) => {
  try {
    let rows = [];
    if (req.params.entity === 'vendors') {
      rows = await prisma.vendor.findMany({ select: { id: true, name: true, email: true, phone: true }, orderBy: { name: 'asc' } });
    } else if (req.params.entity === 'cost-codes') {
      rows = await prisma.costCode.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } });
    } else if (req.params.entity === 'budgets') {
      rows = await prisma.budget.findMany({ select: { id: true, year: true, costCodeId: true, amount: true }, orderBy: [{ year: 'desc' }] });
    } else if (req.params.entity === 'purchase-orders') {
      rows = await prisma.purchaseOrder.findMany({ select: { id: true, poNumber: true, vendorId: true, issuedDate: true, description: true, totalAmount: true }, orderBy: { issuedDate: 'desc' } });
    } else if (req.params.entity === 'po-line-items') {
      rows = await prisma.pOLineItem.findMany({ select: { id: true, purchaseOrderId: true, costCodeId: true, amount: true, description: true } });
    } else if (req.params.entity === 'invoices') {
      rows = await prisma.invoice.findMany({ select: { id: true, purchaseOrderId: true, invoiceNumber: true, invoiceDate: true, amount: true, description: true, allocationMode: true } });
    } else {
      return res.status(400).json({ error: 'Unsupported entity for export' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.entity}.csv"`);
    res.send(toCsv(rows));
  } catch (error) {
    next(error);
  }
});

router.post('/:entity', requirePermission('write'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file is required as form-data field: file' });
    const rows = parseCsv(req.file.buffer);
    let upserted = 0;
    let skipped = 0;

    if (req.params.entity === 'cost-codes') {
      for (const row of rows) {
        if (!row.code || !row.name) {
          skipped += 1;
          continue;
        }
        await prisma.costCode.upsert({
          where: { code: row.code },
          update: { name: row.name },
          create: { code: row.code, name: row.name }
        });
        upserted += 1;
      }
    } else if (req.params.entity === 'vendors') {
      for (const row of rows) {
        const name = String(row.name || '').trim();
        if (!name) {
          skipped += 1;
          continue;
        }
        const email = String(row.email || '').trim() || null;
        const phone = String(row.phone || '').trim() || null;
        await prisma.vendor.upsert({
          where: { name },
          update: { email, phone },
          create: { name, email, phone, createdBy: req.user.email, updatedBy: req.user.email }
        });
        upserted += 1;
      }
    } else if (req.params.entity === 'budgets') {
      for (const row of rows) {
        if (!row.year || !row.costCodeId || row.amount === undefined || row.amount === null || row.amount === '') {
          skipped += 1;
          continue;
        }
        await prisma.budget.upsert({
          where: { year_costCodeId: { year: Number(row.year), costCodeId: row.costCodeId } },
          update: { amount: Number(row.amount), updatedBy: req.user.email },
          create: { year: Number(row.year), costCodeId: row.costCodeId, amount: Number(row.amount), createdBy: req.user.email, updatedBy: req.user.email }
        });
        upserted += 1;
      }
    } else if (req.params.entity === 'purchase-orders') {
      for (const row of rows) {
        if (!row.poNumber || !row.vendorId || !row.issuedDate) {
          skipped += 1;
          continue;
        }
        const po = await prisma.purchaseOrder.upsert({
          where: { poNumber: row.poNumber },
          update: {
            vendorId: row.vendorId,
            issuedDate: new Date(row.issuedDate),
            description: row.description || null,
            totalAmount: Number(row.totalAmount || 0),
            updatedBy: req.user.email
          },
          create: {
            poNumber: row.poNumber,
            vendorId: row.vendorId,
            issuedDate: new Date(row.issuedDate),
            description: row.description || null,
            totalAmount: Number(row.totalAmount || 0),
            createdBy: req.user.email,
            updatedBy: req.user.email
          }
        });
        await syncPOStatus(po.id);
        upserted += 1;
      }
    } else if (req.params.entity === 'po-line-items') {
      for (const row of rows) {
        if (!row.purchaseOrderId || !row.costCodeId || !row.amount) {
          skipped += 1;
          continue;
        }
        await prisma.pOLineItem.create({
          data: {
            purchaseOrderId: row.purchaseOrderId,
            costCodeId: row.costCodeId,
            amount: Number(row.amount),
            description: row.description || null
          }
        });
        await refreshPoTotal(row.purchaseOrderId);
        upserted += 1;
      }
    } else if (req.params.entity === 'invoices') {
      for (const row of rows) {
        if (!row.purchaseOrderId || !row.invoiceNumber || !row.invoiceDate || !row.amount) {
          skipped += 1;
          continue;
        }
        const invoice = await prisma.invoice.upsert({
          where: { purchaseOrderId_invoiceNumber: { purchaseOrderId: row.purchaseOrderId, invoiceNumber: row.invoiceNumber } },
          update: {
            invoiceDate: new Date(row.invoiceDate),
            amount: Number(row.amount),
            description: row.description || null,
            allocationMode: row.allocationMode || 'PROPORTIONAL',
            updatedBy: req.user.email
          },
          create: {
            purchaseOrderId: row.purchaseOrderId,
            invoiceNumber: row.invoiceNumber,
            invoiceDate: new Date(row.invoiceDate),
            amount: Number(row.amount),
            description: row.description || null,
            allocationMode: row.allocationMode || 'PROPORTIONAL',
            createdBy: req.user.email,
            updatedBy: req.user.email
          }
        });
        await syncPOStatus(invoice.purchaseOrderId);
        upserted += 1;
      }
    } else {
      return res.status(400).json({ error: 'Unsupported entity. Use vendors, cost-codes, budgets, purchase-orders, po-line-items, invoices' });
    }

    return res.json({ entity: req.params.entity, rowsProcessed: rows.length, rowsUpserted: upserted, rowsSkipped: skipped });
  } catch (error) {
    next(error);
  }
});

export default router;
