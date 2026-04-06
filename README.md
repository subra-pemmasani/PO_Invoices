# PO Invoices Tracker

## Deployment hardening updates
- OpenSSL runtime dependencies are installed in the Docker image at build time (not via runtime `apk` in startup command).
- Startup command now performs:
  1) `prisma generate`
  2) retry loop for `prisma db push`
  3) start API/web server
- Database credentials are no longer hardcoded in `docker-compose.yml`; they come from environment variables.
- Postgres remains internal-only (no DB port published).

## Environment variables
Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Required variables:
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `PORT` (optional, default `8080`)
- `ALLOW_BOOTSTRAP_ADMIN` (optional)

## Run
```bash
docker compose up -d --build
```

## Accounting correctness updates
- Dashboard summaries filter by selected year:
  - **Budget** by `Budget.year`
  - **Committed** by PO `issuedDate` year
  - **Invoiced** by `invoiceDate` year
  - **Cleared** by `clearanceDate` year
- Invoice allocation is explicit via `allocationMode`:
  - `EXACT` (manual line-item allocations)
  - `PROPORTIONAL` (explicit proportional split)
  - `NONE` (no allocation, tracked as unallocated)
- Summary endpoints:
  - `GET /api/dashboard/cost-code-summary?year=YYYY`
  - `GET /api/dashboard/vendor-summary?year=YYYY`
  - `GET /api/dashboard/trends?year=YYYY`
  - `GET /api/dashboard/summary?year=YYYY`
