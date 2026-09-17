# G-LOKOO POS v2.19.1 — Dashboard Supplier Payment Fix

## Fix
Dashboard 3.0 was querying `supplier_payments.created_at`, but the supplier payment table uses `paid_at`.

The dashboard now filters supplier payments using `paid_at`, matching the existing supplier-management schema.

## No SQL required
This is a frontend query fix. Do not rerun the supplier schema.
