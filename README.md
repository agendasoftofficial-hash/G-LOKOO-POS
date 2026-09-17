# G-LOKOO POS v1.5.0

Repairs & Service now includes the full repair status workflow and status history.

## New in v1.2.2
- Received → Diagnosing → Repairing → Ready → Collected / Cancelled
- A repair cannot be marked Collected while it has an outstanding balance.
- Collection timestamp is recorded in `completed_at`.
- Reopening a collected repair clears `completed_at`.
- Status History button records and displays every status change.
- Repair payments continue to update the outstanding balance.

## Supabase
Run `repair-status-history-schema.sql` after `repairs-schema.sql`.
# G-LOKOO POS v0.6.0 — Receipts & Payments

This release continues the Supabase-backed G-LOKOO phone-shop POS.

## New in v0.6.0
- Professional sale-completed receipt preview.
- 80mm thermal-printer friendly receipt layout.
- Browser Print Receipt button.
- Receipt includes G-LOKOO branding, phone numbers, receipt number, date/time, items, phone IMEI, total, payment method and mobile-money reference.
- Added AirtelTigo Money and Bank Transfer payment options.
- AirtelTigo Money, MTN MoMo and Telecel Cash require a transaction reference.
- Existing phone IMEI protection remains: sold/reserved/returned units cannot be added as an in-stock sale.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

The project uses the existing `.env.local` Supabase configuration. Keep the publishable key in the frontend only; never put a Supabase service-role key in the browser.

## v0.8 Credit & Part Payments
Run `credit-payments-schema.sql` once in Supabase SQL Editor. It adds sale payment tracking, customer balances, credit/part-payment checkout, due dates, and the `sale_payments` table.


## v1.0 — Expenses & Profit

Run `profit-schema.sql` in Supabase SQL Editor once after the existing schema files.

The new Reports module calculates:
- Total sales
- Amount collected
- Outstanding credit
- Gross profit using historical unit cost
- Recorded shop expenses
- Net profit
- Payment-method totals
- Best-selling products
- Expense breakdown
- Sales by day

The Expenses module lets authorized POS users record and delete shop expenses by category and date.


## v1.1 — Staff & Permissions
Run `staff-schema.sql` in Supabase SQL Editor after the previous migrations. Create additional login accounts in Supabase Authentication > Users; new accounts receive a cashier profile automatically. Owner/admin can change roles in the POS Staff screen. The migration adds role-aware RLS and an audit log for role changes.


## v1.2 — Repairs & Service Management

Run `repairs-schema.sql` after `staff-schema.sql`. The Repairs screen now supports repair tickets, customer/device/IMEI details, technician assignment, status workflow, repair cost, deposits, outstanding balances, due dates, notes, and repair payments.


## v1.2.2 Staff restriction
- Cashier accounts can view Products but cannot see the Add Product action.
- Inventory, Admin and Owner retain product-management access.
- Database role policies remain defined in `staff-schema.sql`.


## v1.3 — Settings & Shop Configuration

Run `settings-schema.sql` once after the previous migrations.

The Settings screen is available to Owner/Admin accounts and stores:
- Shop name, subtitle, phone numbers and address
- Receipt footer and note
- 58mm / 80mm receipt paper preference
- Printer name reference
- Browser auto-print preference
- Low-stock threshold
- GHS (₵) payment configuration

Settings are stored in Supabase so they can be shared across POS devices.
Browser print security may still require confirmation; the POS cannot silently bypass the browser's print permission.


## v1.4 — Sales History

The Sales History module provides a searchable record of completed POS sales.

- Filter by date range
- Search by receipt number, customer, phone number, product or IMEI
- Filter Paid vs Outstanding sales
- View sale line items and payment status
- Open the existing thermal receipt for printing/reprinting
- Cashier/Admin access follows the existing role permissions

No new Supabase migration is required for v1.4; it uses the existing `sales` and `sale_items` tables.


## v1.5 — Sales Returns & Refunds
Run `returns-schema.sql` once in Supabase SQL Editor after the previous migrations. Owner/Admin accounts can find a sale by receipt or ID, return selected quantities, restore accessory stock, mark returned phone IMEIs as Returned, and record the refund method/reference and reason. Refunds are limited to the amount already paid on the sale.

## v2.4.0 Supplier Management
- Supplier directory with active/inactive status.
- Supplier purchase totals, paid totals and outstanding balances.
- Supplier payments with method/reference and recent payment history.
- Purchases can be linked to a supplier.
- Run `supplier-management-schema.sql` once in Supabase before using Suppliers.


## v2.16.0 — Reports 2.4
Updated reports with return-aware financial reconciliation, net profit, net collected, return details, CSV export and Print/PDF support.
