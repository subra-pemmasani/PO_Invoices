import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requirePermission } from '../middleware/auth.js';
import { syncPOStatus } from './purchaseOrders.js';

const router = Router();
const enforceVendorInvoiceUnique = process.env.ENFORCE_VENDOR_INVOICE_UNIQUE === 'true';

const allocationSchema = z.object({
  poLineItemId: z.string().min(1),
  amount: z.number().positive()
});

const invoiceSchema = z.object({
  purchaseOrderId: z.string().min(1),
  vendorId: z.string().optional(),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string(),
  amount: z.number().positive(),
  description: z.string().optional(),
  allocationMode: z.enum(['EXACT', 'PROPORTIONAL', 'NONE']),
  allocations: z.array(allocationSchema).optional()
});

async function validateAllocation(data) {
  if (data.allocationMode !== 'EXACT') return;
  if (!data.allocations?.length) throw new Error('EXACT allocation requires allocations array');

  const total = data.allocations.reduce((sum, a) => sum + Number(a.amount), 0);
  if (Math.abs(total - Number(data.amount)) > 0.01) {
    throw new Error('EXACT allocations must total invoice amount');
  }

  const ids = data.allocations.map((a) => a.poLineItemId);
  const lineItems = await prisma.pOLineItem.findMany({ where: { id: { in: ids }, purchaseOrderId: data.purchaseOrderId } });
  if (lineItems.length !== ids.length) {
    throw new Error('One or more allocations do not belong to the selected purchase order');
  }
}

async function validateVendorRules(data, currentInvoiceId = null) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: data.purchaseOrderId } });
  if (!po) throw new Error('PO not found');

  if (data.vendorId && data.vendorId !== po.vendorId) {
    throw new Error('Vendor mismatch: invoice vendor does not match PO vendor');
  }

  if (enforceVendorInvoiceUnique) {
    const duplicate = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: data.invoiceNumber,
        purchaseOrder: { vendorId: po.vendorId },
        ...(currentInvoiceId ? { id: { not: currentInvoiceId } } : {})
      }
    });
    if (duplicate) throw new Error('Duplicate invoice number under same vendor');
  }

  return po;
}

router.get('/', requirePermission('read'), async (_req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { purchaseOrder: { include: { vendor: true, lineItems: { include: { costCode: true } } } }, clearedBy: true, allocations: true },
      orderBy: { invoiceDate: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

router.get('/clearance-queue', requirePermission('approve'), async (_req, res, next) => {
  try {
    const rows = await prisma.invoice.findMany({
      where: { cleared: false },
      include: { purchaseOrder: { include: { vendor: true } } },
      orderBy: { invoiceDate: 'asc' }
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('write'), async (req, res, next) => {
  try {
    const data = invoiceSchema.parse(req.body);
    await validateAllocation(data);
    const po = await validateVendorRules(data);

    const existingTotal = (await prisma.invoice.findMany({ where: { purchaseOrderId: data.purchaseOrderId } }))
      .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

    if (existingTotal + data.amount > Number(po.totalAmount)) {
      return res.status(400).json({
        error: 'Invoice exceeds PO total',
        poTotal: po.totalAmount,
        currentInvoiced: existingTotal
      });
    }

    const created = await prisma.invoice.create({
      data: {
        purchaseOrderId: data.purchaseOrderId,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: new Date(data.invoiceDate),
        amount: data.amount,
        description: data.description,
        allocationMode: data.allocationMode,
        createdBy: req.user.email,
        updatedBy: req.user.email,
        allocations: data.allocationMode === 'EXACT'
          ? { create: data.allocations.map((a) => ({ poLineItemId: a.poLineItemId, amount: a.amount })) }
          : undefined
      },
      include: { allocations: true }
    });

    await syncPOStatus(data.purchaseOrderId);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/clear', requirePermission('approve'), async (req, res, next) => {
  try {
    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        cleared: true,
        clearanceDate: new Date(),
        clearedById: req.user.id,
        updatedBy: req.user.email
      },
      include: { clearedBy: true }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requirePermission('write'), async (req, res, next) => {
  try {
    const data = invoiceSchema.partial().parse(req.body);
    const current = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    const nextPayload = {
      purchaseOrderId: data.purchaseOrderId ?? current.purchaseOrderId,
      invoiceNumber: data.invoiceNumber ?? current.invoiceNumber,
      amount: data.amount ?? Number(current.amount),
      allocationMode: data.allocationMode ?? current.allocationMode,
      allocations: data.allocations,
      vendorId: data.vendorId
    };
    await validateAllocation(nextPayload);
    const po = await validateVendorRules(nextPayload, req.params.id);

    const currentOthersTotal = (await prisma.invoice.findMany({ where: { purchaseOrderId: nextPayload.purchaseOrderId, id: { not: req.params.id } } }))
      .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

    if (currentOthersTotal + nextPayload.amount > Number(po.totalAmount)) {
      return res.status(400).json({
        error: 'Invoice exceeds PO total',
        poTotal: po.totalAmount,
        currentInvoiced: currentOthersTotal
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.allocationMode || data.allocations) {
        await tx.invoiceAllocation.deleteMany({ where: { invoiceId: req.params.id } });
      }

      return tx.invoice.update({
        where: { id: req.params.id },
        data: {
          purchaseOrderId: data.purchaseOrderId,
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
          amount: data.amount,
          description: data.description,
          allocationMode: data.allocationMode,
          updatedBy: req.user.email,
          allocations: (data.allocationMode ?? current.allocationMode) === 'EXACT' && data.allocations
            ? { create: data.allocations.map((a) => ({ poLineItemId: a.poLineItemId, amount: a.amount })) }
            : undefined
        }
      });
    });

    await syncPOStatus(updated.purchaseOrderId);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requirePermission('write'), async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.delete({ where: { id: req.params.id } });
    await syncPOStatus(invoice.purchaseOrderId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
