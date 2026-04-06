import { prisma } from './prisma.js';

async function seed() {
  const year = new Date().getUTCFullYear();

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.local' },
    update: { role: 'ADMIN', name: 'Demo Admin' },
    create: { email: 'admin@demo.local', name: 'Demo Admin', role: 'ADMIN' }
  });

  await prisma.user.upsert({
    where: { email: 'approver@demo.local' },
    update: { role: 'APPROVER', name: 'Demo Approver' },
    create: { email: 'approver@demo.local', name: 'Demo Approver', role: 'APPROVER' }
  });

  await prisma.user.upsert({
    where: { email: 'viewer@demo.local' },
    update: { role: 'VIEWER', name: 'Demo Viewer' },
    create: { email: 'viewer@demo.local', name: 'Demo Viewer', role: 'VIEWER' }
  });

  const vendorA = await prisma.vendor.upsert({
    where: { name: 'Northwind Industrial' },
    update: {},
    create: { name: 'Northwind Industrial', email: 'ap@northwind.example', phone: '555-0100' }
  });

  const vendorB = await prisma.vendor.upsert({
    where: { name: 'Atlas Services' },
    update: {},
    create: { name: 'Atlas Services', email: 'billing@atlas.example', phone: '555-0120' }
  });

  const ccOps = await prisma.costCode.upsert({ where: { code: 'OPS-100' }, update: {}, create: { code: 'OPS-100', name: 'Operations' } });
  const ccIt = await prisma.costCode.upsert({ where: { code: 'IT-200' }, update: {}, create: { code: 'IT-200', name: 'IT Infrastructure' } });
  const ccFac = await prisma.costCode.upsert({ where: { code: 'FAC-300' }, update: {}, create: { code: 'FAC-300', name: 'Facilities' } });

  await prisma.budget.upsert({ where: { year_costCodeId: { year, costCodeId: ccOps.id } }, update: { amount: 150000 }, create: { year, costCodeId: ccOps.id, amount: 150000 } });
  await prisma.budget.upsert({ where: { year_costCodeId: { year, costCodeId: ccIt.id } }, update: { amount: 100000 }, create: { year, costCodeId: ccIt.id, amount: 100000 } });
  await prisma.budget.upsert({ where: { year_costCodeId: { year, costCodeId: ccFac.id } }, update: { amount: 80000 }, create: { year, costCodeId: ccFac.id, amount: 80000 } });

  const po1 = await prisma.purchaseOrder.upsert({
    where: { poNumber: `PO-${year}-001` },
    update: { vendorId: vendorA.id, issuedDate: new Date(`${year}-01-15`), totalAmount: 60000, description: 'Annual maintenance contract' },
    create: {
      poNumber: `PO-${year}-001`,
      vendorId: vendorA.id,
      issuedDate: new Date(`${year}-01-15`),
      totalAmount: 60000,
      description: 'Annual maintenance contract'
    }
  });

  const po2 = await prisma.purchaseOrder.upsert({
    where: { poNumber: `PO-${year}-002` },
    update: { vendorId: vendorB.id, issuedDate: new Date(`${year}-02-10`), totalAmount: 45000, description: 'Network upgrades' },
    create: {
      poNumber: `PO-${year}-002`,
      vendorId: vendorB.id,
      issuedDate: new Date(`${year}-02-10`),
      totalAmount: 45000,
      description: 'Network upgrades'
    }
  });

  const po1Ops = await prisma.pOLineItem.upsert({
    where: { id: `${po1.id}-ops` },
    update: { amount: 35000, costCodeId: ccOps.id, description: 'Maintenance labor' },
    create: { id: `${po1.id}-ops`, purchaseOrderId: po1.id, costCodeId: ccOps.id, amount: 35000, description: 'Maintenance labor' }
  });

  const po1Fac = await prisma.pOLineItem.upsert({
    where: { id: `${po1.id}-fac` },
    update: { amount: 25000, costCodeId: ccFac.id, description: 'Facility repairs' },
    create: { id: `${po1.id}-fac`, purchaseOrderId: po1.id, costCodeId: ccFac.id, amount: 25000, description: 'Facility repairs' }
  });

  const po2It = await prisma.pOLineItem.upsert({
    where: { id: `${po2.id}-it` },
    update: { amount: 45000, costCodeId: ccIt.id, description: 'Switches and firewalls' },
    create: { id: `${po2.id}-it`, purchaseOrderId: po2.id, costCodeId: ccIt.id, amount: 45000, description: 'Switches and firewalls' }
  });

  const inv1 = await prisma.invoice.upsert({
    where: { purchaseOrderId_invoiceNumber: { purchaseOrderId: po1.id, invoiceNumber: `INV-${year}-001` } },
    update: { invoiceDate: new Date(`${year}-03-05`), amount: 20000, allocationMode: 'PROPORTIONAL' },
    create: { purchaseOrderId: po1.id, invoiceNumber: `INV-${year}-001`, invoiceDate: new Date(`${year}-03-05`), amount: 20000, allocationMode: 'PROPORTIONAL' }
  });

  await prisma.invoice.upsert({
    where: { purchaseOrderId_invoiceNumber: { purchaseOrderId: po2.id, invoiceNumber: `INV-${year}-002` } },
    update: { invoiceDate: new Date(`${year}-03-20`), amount: 15000, allocationMode: 'EXACT' },
    create: { purchaseOrderId: po2.id, invoiceNumber: `INV-${year}-002`, invoiceDate: new Date(`${year}-03-20`), amount: 15000, allocationMode: 'EXACT' }
  }).then(async (inv2) => {
    await prisma.invoiceAllocation.upsert({
      where: { invoiceId_poLineItemId: { invoiceId: inv2.id, poLineItemId: po2It.id } },
      update: { amount: 15000 },
      create: { invoiceId: inv2.id, poLineItemId: po2It.id, amount: 15000 }
    });
  });

  await prisma.invoice.update({ where: { id: inv1.id }, data: { cleared: true, clearanceDate: new Date(`${year}-03-30`), clearedById: admin.id } });

  // ensure exact allocation example remains present
  await prisma.invoiceAllocation.upsert({
    where: { invoiceId_poLineItemId: { invoiceId: inv1.id, poLineItemId: po1Ops.id } },
    update: { amount: 12000 },
    create: { invoiceId: inv1.id, poLineItemId: po1Ops.id, amount: 12000 }
  });
  await prisma.invoiceAllocation.upsert({
    where: { invoiceId_poLineItemId: { invoiceId: inv1.id, poLineItemId: po1Fac.id } },
    update: { amount: 8000 },
    create: { invoiceId: inv1.id, poLineItemId: po1Fac.id, amount: 8000 }
  });

  console.log('Seed completed with demo users: admin@demo.local / approver@demo.local / viewer@demo.local');
}

seed()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
