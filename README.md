# PO Invoices Tracker

## First login (important)
The app seeds demo users on startup. Use one of:
- `admin@demo.local` (ADMIN)
- `approver@demo.local` (APPROVER)
- `viewer@demo.local` (VIEWER)

If you login as `viewer@demo.local`, create/save actions are blocked by role permissions.

## Seeded sample data
On container boot, app runs:
1. `prisma generate`
2. retry `prisma db push`
3. `node src/seed.js`
4. start server

Seed includes:
- users, vendors, cost codes
- current-year budgets
- sample POs, line items, invoices, and allocations

## CSV templates
Download from app Imports tab or directly:
- `/csv-templates/vendors.csv`
- `/csv-templates/cost-codes.csv`
- `/csv-templates/budgets.csv`
- `/csv-templates/purchase-orders.csv`
- `/csv-templates/invoices.csv`

## Environment variables
Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Required:
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

Optional:
- `PORT` (default `8080`)
- `ALLOW_BOOTSTRAP_ADMIN` (default `false`)

## Run
```bash
docker compose up -d --build
```
