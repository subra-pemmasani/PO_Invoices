# PO Invoices Tracker

## Priority 2 UX updates
Frontend now includes dedicated screens:
- Dashboard
- Budget Management
- PO List
- PO Detail
- Create/Edit PO
- Invoice List
- Invoice Clearance Queue
- Vendor Master
- Cost Code Master
- User Management
- Imports

Invoice creation shows selected PO snapshot:
- vendor
- PO total
- invoiced so far
- remaining balance
- cost code breakdown

PO detail screen shows:
- header details
- line items
- linked invoices
- total invoiced
- total cleared
- remaining uninvoiced balance

## Priority 3 controls and auditability
### Audit fields
Added created/updated audit columns in data model:
- `createdBy`
- `updatedBy`
- existing `createdAt` / `updatedAt`
- existing `clearedBy` / `clearanceDate`

### Soft rules
- prevent duplicate PO numbers (unique DB constraint)
- optional duplicate invoice per vendor check (`ENFORCE_VENDOR_INVOICE_UNIQUE=true`)
- prevent over-invoicing
- vendor mismatch validation on invoice create/update

### PO statuses
- OPEN
- PARTIALLY_INVOICED
- FULLY_INVOICED
- CLOSED
- CANCELLED

### Role-aware UI
- Admin: create/edit
- Approver: clear invoices
- Viewer: read-only

## Import workflow
For PO with many cost-code lines:
1. import `purchase-orders`
2. import `po-line-items`

Use Imports screen export buttons to download current data with IDs.

## Run
```bash
docker compose up -d --build
```
