# PO Invoices Tracker (Access Replacement)

## Features added
- Master data management page for **Vendors**, **Cost Codes**, and **Users**.
- PO creation uses dropdown selections for **Vendor** and **Cost Codes**.
- CSV import endpoints for vendors, cost codes, budgets, purchase orders, and invoices.
- Role/user protection with authenticated users via `x-user-email` header and role-based permissions.

## Local development
```bash
docker compose up -d
```

App: `http://localhost:8080`

## Authentication and roles
- Every API request must include: `x-user-email`.
- User is looked up from `User` table.
- Permissions:
  - `ADMIN`: read/write/approve/export
  - `APPROVER`: read/approve/export
  - `VIEWER`: read only
- Optional bootstrap for first user:
  - set `ALLOW_BOOTSTRAP_ADMIN=true`
  - first unknown `x-user-email` is auto-created as ADMIN

## CSV imports
Upload CSV using multipart form field name `file`:
- `POST /api/imports/vendors`
- `POST /api/imports/cost-codes`
- `POST /api/imports/budgets`
- `POST /api/imports/purchase-orders`
- `POST /api/imports/invoices`

## Docker notes
- App waits for DB and retries `prisma db push` before starting.
- Compose includes DB healthcheck to avoid startup race.
