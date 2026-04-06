# PO Invoices Tracker

## First login (important)
The app seeds demo users on startup. Use one of:
- `admin@demo.local` (ADMIN)
- `approver@demo.local` (APPROVER)
- `viewer@demo.local` (VIEWER)

If you login as `viewer@demo.local`, create/save actions are blocked by role permissions.

## Why you saw "Missing x-user-email header"
This happens when the session email was not persisted before API calls. Login flow has been fixed to use a dedicated login field and only start authenticated calls after submit.

## Seeded sample data
On container boot, app runs:
1. `prisma generate`
2. retry `prisma db push`
3. `node src/seed.js`
4. start server

Seed includes users, vendors, cost codes, budgets, sample POs, line items, invoices, and allocations.

## Imports with IDs (recommended workflow)
In Imports tab, use **Download current data with IDs** for:
- vendors
- cost-codes
- budgets
- purchase-orders
- po-line-items
- invoices

Then copy IDs directly into your import CSVs.

### PO with multiple cost-code lines
Use 2 CSVs:
1. import `purchase-orders` (PO headers)
2. import `po-line-items` (each line row = one cost-code line)

## CSV templates
- `/csv-templates/vendors.csv`
- `/csv-templates/cost-codes.csv`
- `/csv-templates/budgets.csv`
- `/csv-templates/purchase-orders.csv`
- `/csv-templates/po-line-items.csv`
- `/csv-templates/invoices.csv`

## Run
```bash
docker compose up -d --build
```
