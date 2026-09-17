# G-LOKOO POS v2.17.0 — Advanced Inventory

## What's new
- Products page upgraded to **Products & Inventory**.
- Search products by name/category.
- Owner/Admin/Inventory staff can edit product details.
- Owner/Admin/Inventory staff can make controlled stock adjustments.
- Stock adjustments require a quantity and reason.
- Optional notes can explain the adjustment.
- Stock cannot be reduced below zero.
- Every manual adjustment records before/after stock, quantity, reason, note, user and timestamp.
- Product **History** shows the latest 50 manual stock adjustments.
- Cashier remains view-only on Products & Inventory.

## Supabase migration
Run `inventory-adjustments-schema.sql` once in the Supabase SQL Editor.

Do not rerun the original full database schema.

## Important accounting behavior
Sales, returns and purchases continue to use the existing POS workflows. This release adds an auditable manual adjustment ledger; it does not rewrite historical sale/purchase transactions.
