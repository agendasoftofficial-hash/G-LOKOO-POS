# G-LOKOO POS v2.18.0 — Inventory Control

## Added
- Dedicated **Inventory Control** page for Owner/Admin/Inventory roles.
- Inventory value and stock-health cards.
- Low-stock alert list using the existing 10-unit dashboard threshold.
- Filterable accessory stock movement ledger.
- CSV export of filtered stock movements.
- Phone/IMEI stock status history ledger.
- Phone movement trigger records new phone units and status changes such as Sold, Returned, Reserved and sale reversal.

## Supabase migration
Run `inventory-control-schema.sql` **once** after the existing v2.17 inventory migration.

This migration is incremental and does not reset sales, purchases, products, phones or customers.

## Important
The current shop has a single inventory quantity per accessory product. True multi-location stock transfers are intentionally not enabled in v2.18 because they require location-level stock quantities. That can be added safely as a later migration without corrupting the existing global stock counts.
