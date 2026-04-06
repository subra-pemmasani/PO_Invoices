import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import budgetsRouter from './routes/budgets.js';
import poRouter from './routes/purchaseOrders.js';
import invoicesRouter from './routes/invoices.js';
import dashboardRouter from './routes/dashboard.js';
import exportRouter from './routes/exports.js';
import masterDataRouter from './routes/masterData.js';
import importRouter from './routes/imports.js';
import { authenticateUser } from './middleware/auth.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

app.use(cors());
app.use(express.json());
app.use(authenticateUser);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/budgets', budgetsRouter);
app.use('/api/purchase-orders', poRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/exports', exportRouter);
app.use('/api/master', masterDataRouter);
app.use('/api/imports', importRouter);

app.use(express.static(publicDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  return res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((error, _req, res, _next) => {
  if (error?.issues) {
    return res.status(400).json({ error: 'Validation failed', details: error.issues });
  }
  return res.status(500).json({ error: error.message || 'Unexpected server error' });
});

export default app;
