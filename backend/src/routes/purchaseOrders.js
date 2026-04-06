import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requirePermission } from '../middleware/auth.js';
import { derivePOStatus } from '../utils/poStatus.js';

const router = Router();

const lineItemSchema = z.object({
  costCodeId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional()
});

const poSchema = z.object({
  poNumber: z.string().min(1),
  vendor: z.string().min(1),
  issuedDate: z.string(),
  description: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1)
});

async function syncPOStatus(purchaseOrderId) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: { invoices: true }
  });
  const invoiced = po.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const status = derivePOStatus(po.totalAmount, invoiced);
  await prisma.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status } });
}

router.get('/', requirePermission('read'), async (_req, res, next) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: { lineItems: { include: { costCode: true } }, invoices: true },
      orderBy: { issuedDate: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('write'), async (req, res, next) => {
  try {
    const data = poSchema.parse(req.body);
    const totalAmount = data.lineItems.reduce((sum, item) => sum + item.amount, 0);

    const created = await prisma.purchaseOrder.create({
      data: {
        poNumber: data.poNumber,
        vendor: data.vendor,
        issuedDate: new Date(data.issuedDate),
        description: data.description,
        totalAmount,
        lineItems: {
          create: data.lineItems.map((item) => ({
            costCodeId: item.costCodeId,
            amount: item.amount,
            description: item.description
          }))
        }
      },
      include: { lineItems: true }
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requirePermission('write'), async (req, res, next) => {
  try {
    const data = poSchema.partial().parse(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      if (data.lineItems) {
        await tx.pOLineItem.deleteMany({ where: { purchaseOrderId: req.params.id } });
      }

      const totalAmount = data.lineItems
        ? data.lineItems.reduce((sum, item) => sum + item.amount, 0)
        : undefined;

      return tx.purchaseOrder.update({
        where: { id: req.params.id },
        data: {
          poNumber: data.poNumber,
          vendor: data.vendor,
          issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
          description: data.description,
          totalAmount,
          lineItems: data.lineItems
            ? {
                create: data.lineItems.map((item) => ({
                  costCodeId: item.costCodeId,
                  amount: item.amount,
                  description: item.description
                }))
              }
            : undefined
        }
      });
    });

    await syncPOStatus(req.params.id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requirePermission('write'), async (req, res, next) => {
  try {
    await prisma.purchaseOrder.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { syncPOStatus };
export default router;
