# G-LOKOO POS v2.7.0

## Purchase History 2.0

Added a complete purchase history workflow:
- Search by purchase number, invoice number, or supplier
- Filter by supplier
- Filter by purchase date range
- View purchase line items and phone IMEI details
- View supplier payment history from the purchase detail screen
- Print purchase record
- Export filtered purchase history to CSV
- Summary cards update with the selected filters

No new SQL migration is required. This version uses the existing `purchases`, `purchase_items`, `suppliers`, and `supplier_payments` tables.

Keep `.env.local` in the project locally and do not commit it to GitHub.
