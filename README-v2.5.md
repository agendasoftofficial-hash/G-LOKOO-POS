# G-LOKOO POS v2.5 — Supplier Purchase Payments

This update connects Purchases / Stock In directly to Supplier Management.

### New
- Supplier is required when receiving a purchase.
- Record an optional amount paid to the supplier immediately.
- Choose Cash, MTN MoMo, Telecel Cash, AirtelTigo Money, Bank Transfer, or Card.
- Electronic payments require a reference.
- Supplier balance is updated automatically.
- Purchase, inventory, IMEI creation, and initial supplier payment are handled in one database transaction.

### Supabase
Run **supplier-management-schema.sql** once. It keeps the existing supplier schema and adds `receive_purchase_v3`.

Do not rerun the old full database schema.
