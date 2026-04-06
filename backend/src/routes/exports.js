import { Router } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../prisma.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

router.get('/excel', requirePermission('export'), async (_req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();

    const poSheet = workbook.addWorksheet('Purchase Orders');
    poSheet.columns = [
      { header: 'PO Number', key: 'poNumber' },
      { header: 'Vendor', key: 'vendor' },
      { header: 'Issued Date', key: 'issuedDate' },
      { header: 'Status', key: 'status' },
      { header: 'Total Amount', key: 'totalAmount' }
    ];

    const pos = await prisma.purchaseOrder.findMany();
    pos.forEach((po) => poSheet.addRow(po));

    const invoiceSheet = workbook.addWorksheet('Invoices');
    invoiceSheet.columns = [
      { header: 'PO Number', key: 'poNumber' },
      { header: 'Invoice Number', key: 'invoiceNumber' },
      { header: 'Invoice Date', key: 'invoiceDate' },
      { header: 'Amount', key: 'amount' },
      { header: 'Cleared', key: 'cleared' },
      { header: 'Clearance Date', key: 'clearanceDate' }
    ];

    const invoices = await prisma.invoice.findMany({ include: { purchaseOrder: true } });
    invoices.forEach((inv) => {
      invoiceSheet.addRow({
        poNumber: inv.purchaseOrder.poNumber,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        amount: inv.amount,
        cleared: inv.cleared,
        clearanceDate: inv.clearanceDate
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="po-invoice-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

export default router;
