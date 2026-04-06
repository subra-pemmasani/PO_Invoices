# PO Invoices Tracker (Access Replacement)

Full-stack web application for budget planning, purchase order management, invoice tracking, clearance workflow, and reporting.

## Stack
- Frontend: React + Vite + Recharts
- Backend: Node.js + Express
- Database: PostgreSQL
- ORM: Prisma

## Features
- **Budget module**: annual budgets by cost code
- **Purchase orders**: line items by cost code, auto total, status tracking (`OPEN`, `PARTIAL`, `FULLY_INVOICED`)
- **Invoices**: multiple invoices per PO with PO total validation
- **Clearance workflow**: invoice clearing with user + date audit fields
- **Dashboard**: budget vs committed vs invoiced vs cleared, vendor spend, monthly/quarterly trend, alerts
- **Role-based access**: Admin / Approver / Viewer via request headers
- **Excel export**: PO and invoice workbook download

## Quick Start

### 1) Start PostgreSQL
```bash
docker compose up -d
```

### 2) Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```

Server runs at `http://localhost:4000`.

### 3) Frontend
```bash
cd frontend
npm install
npm run dev
```

UI runs at `http://localhost:5173`.

## API (selected)
- `GET/POST/PUT/DELETE /api/budgets`
- `GET/POST/PUT/DELETE /api/purchase-orders`
- `GET/POST/PUT/DELETE /api/invoices`
- `POST /api/invoices/:id/clear`
- `GET /api/dashboard/summary?year=2026`
- `GET /api/exports/excel`
- `GET/POST /api/master/cost-codes`
- `GET/POST /api/master/users`

## RBAC headers
- `x-role: ADMIN | APPROVER | VIEWER`
- `x-user-id: <user-id>` (required when clearing invoices)

## Suggested next enhancements
- Integrate real auth provider and JWT
- Add pagination + server-side filtering
- Add test suites (unit/integration/e2e)
- Add optimistic locking for concurrent edits
