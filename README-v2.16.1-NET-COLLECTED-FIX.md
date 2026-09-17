# G-LOKOO POS v2.16.1 — Net Collected Fix

## Fix
- Net Collected now subtracts only actual cash/electronic refunds.
- Credit reversals are excluded from cash collected because the customer had not paid that credit amount.
- Reports now load `cash_refund` and `credit_reversal` from `sale_returns`.
- CSV export separates Cash Refunds Paid and Credit Reversals.

### Example
For a ₵120 credit sale returned before any payment:
- Credit reversal: ₵120
- Cash refund: ₵0
- Net Collected: ₵0

No new SQL migration is required if the existing credit-return schema has already been applied.

Build note: dependency installation/build verification was not available in this environment because the copied project does not contain a usable Vite executable.
