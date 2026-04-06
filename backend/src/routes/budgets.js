import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

const budgetSchema = z.object({
  costCodeId: z.string().min(1),
  year: z.number().int().gte(2000).lte(2100),
  amount: z.number().nonnegative()
});

router.get('/', requirePermission('read'), async (_req, res, next) => {
  try {
    const budgets = await prisma.budget.findMany({ include: { costCode: true }, orderBy: [{ year: 'desc' }] });
    res.json(budgets);
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('write'), async (req, res, next) => {
  try {
    const data = budgetSchema.parse(req.body);
    const created = await prisma.budget.upsert({
      where: { year_costCodeId: { year: data.year, costCodeId: data.costCodeId } },
      update: { amount: data.amount, updatedBy: req.user.email },
      create: { ...data, createdBy: req.user.email, updatedBy: req.user.email }
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requirePermission('write'), async (req, res, next) => {
  try {
    const data = budgetSchema.partial().parse(req.body);
    const updated = await prisma.budget.update({ where: { id: req.params.id }, data: { ...data, updatedBy: req.user.email } });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requirePermission('write'), async (req, res, next) => {
  try {
    await prisma.budget.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
