import express from 'express';
import cors from 'cors';
import budgetsRouter from './routes/budgets.js';
import poRouter from './routes/purchaseOrders.js';
import invoicesRouter from './routes/invoices.js';
import dashboardRouter from './routes/dashboard.js';
import exportRouter from './routes/exports.js';
import masterDataRouter from './routes/masterData.js';
import { mockAuth } from './middleware/auth.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(mockAuth);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/budgets', budgetsRouter);
app.use('/api/purchase-orders', poRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/exports', exportRouter);
app.use('/api/master', masterDataRouter);

app.use((error, _req, res, _next) => {
  if (error?.issues) {
    return res.status(400).json({ error: 'Validation failed', details: error.issues });
  }
  return res.status(500).json({ error: error.message || 'Unexpected server error' });
});

export default app;
