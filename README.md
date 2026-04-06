# PO Invoices Tracker

## Accounting correctness updates
- Dashboard summaries now filter by selected year correctly:
  - **Budget** by `Budget.year`
  - **Committed** by PO `issuedDate` year
  - **Invoiced** by `invoiceDate` year
  - **Cleared** by `clearanceDate` year
- Invoice allocation is now explicit via `allocationMode`:
  - `EXACT` (manual line-item allocations)
  - `PROPORTIONAL` (explicit proportional split)
  - `NONE` (no allocation, tracked as unallocated)
- Added server-side summary endpoints:
  - `GET /api/dashboard/cost-code-summary?year=YYYY`
  - `GET /api/dashboard/vendor-summary?year=YYYY`
  - `GET /api/dashboard/trends?year=YYYY`
  - `GET /api/dashboard/summary?year=YYYY`

## Auth
- Requests require `x-user-email`.
- Role-based permissions are enforced from DB user role.

## Run
```bash
docker compose up -d
```
