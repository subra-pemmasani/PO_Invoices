import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requirePermission } from '../middleware/auth.js';
import { syncPOStatus } from './purchaseOrders.js';

const router = Router();

const allocationSchema = z.object({
  poLineItemId: z.string().min(1),
  amount: z.number().positive()
});

const invoiceSchema = z.object({
  purchaseOrderId: z.string().min(1),
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

router.get('/', requirePermission('read'), async (_req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { purchaseOrder: true, clearedBy: true, allocations: true },
      orderBy: { invoiceDate: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('write'), async (req, res, next) => {
  try {
    const data = invoiceSchema.parse(req.body);
    await validateAllocation(data);

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: data.purchaseOrderId },
      include: { invoices: true }
    });

    const existingTotal = po.invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
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
    const userId = req.user?.id;

    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        cleared: true,
        clearanceDate: new Date(),
        clearedById: userId
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
      amount: data.amount ?? Number(current.amount),
      allocationMode: data.allocationMode ?? current.allocationMode,
      allocations: data.allocations
    };
    await validateAllocation(nextPayload);

    const purchaseOrderId = data.purchaseOrderId ?? current.purchaseOrderId;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { invoices: true }
    });

    const currentOthersTotal = po.invoices
      .filter((invoice) => invoice.id !== req.params.id)
      .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    const nextAmount = data.amount ?? Number(current.amount);

    if (currentOthersTotal + nextAmount > Number(po.totalAmount)) {
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
