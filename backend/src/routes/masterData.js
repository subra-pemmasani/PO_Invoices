import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

const costCodeSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1)
});

const vendorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional()
});

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'APPROVER', 'VIEWER'])
});

router.get('/cost-codes', requirePermission('read'), async (_req, res, next) => {
  try {
    const rows = await prisma.costCode.findMany({ orderBy: { code: 'asc' } });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/cost-codes', requirePermission('write'), async (req, res, next) => {
  try {
    const data = costCodeSchema.parse(req.body);
    const row = await prisma.costCode.create({ data });
    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
});

router.get('/vendors', requirePermission('read'), async (_req, res, next) => {
  try {
    const rows = await prisma.vendor.findMany({ orderBy: { name: 'asc' } });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/vendors', requirePermission('write'), async (req, res, next) => {
  try {
    const data = vendorSchema.parse(req.body);
    const row = await prisma.vendor.create({ data: { ...data, email: data.email || null } });
    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
});

router.get('/users', requirePermission('read'), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.post('/users', requirePermission('write'), async (req, res, next) => {
  try {
    const data = userSchema.parse(req.body);
    const user = await prisma.user.create({ data });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
