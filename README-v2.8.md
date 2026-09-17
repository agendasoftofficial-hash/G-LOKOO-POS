# G-LOKOO POS v2.8.0 — Dashboard Finance

Adds dashboard finance visibility on top of v2.7 Purchase History:
- Purchases in selected period
- Current supplier balance (Owner/Admin only)
- Sales count
- Return count
- Existing sales/profit/stock/repair/return analytics retained

No new SQL is required. This uses the existing `purchases` and `supplier_balances` objects.

Run with the existing `.env.local`, then `npm run dev`.
