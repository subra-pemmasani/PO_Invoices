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

## Local development

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

Server runs at `http://localhost:8080`.

### 3) Frontend
```bash
cd frontend
npm install
npm run dev
```

UI runs at `http://localhost:5173`.

## Hostinger Docker Manager deployment
This repo now includes a production `Dockerfile` that serves both API and frontend from one container.

### Required environment variables
- `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public`
- Optional: `PORT` (defaults to `8080`)

### Container behavior
- On startup, container retries `prisma db push` until DB is reachable, then starts Express.
- Express serves:
  - API under `/api/*`
  - React app static files from `/`

### Common "didn’t send any data" causes
1. **No database URL configured** → container exits before listening.
2. **Database host blocked/firewalled** → startup fails on Prisma connection.
3. **Wrong exposed/internal port** → map external traffic to container port `8080`.
4. **App started before DB accepted connections** → fixed by retry loop + DB healthcheck in compose.
5. **Old image without frontend static serving** → ensure latest image is deployed.


### Verify app container is healthy
```bash
docker compose ps
docker compose logs app --tail=100
```

You should see `Server listening on http://0.0.0.0:8080` in app logs.

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
