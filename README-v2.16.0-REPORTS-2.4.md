# G-LOKOO POS v2.16.0 — Reports 2.4

Reports 2.4 upgrades the reporting screen with period reconciliation and return-aware profit calculations.

## Included
- Sales, repair revenue, returns and net business revenue
- Gross profit after returned-item profit reversal
- Net profit after expenses
- Net collected amount
- Payment-method breakdown
- Cashier performance
- Best sellers with net units/revenue/profit after returns in the selected period
- Return detail table
- Financial reconciliation panel
- Inventory valuation and low-stock alerts
- CSV export
- Print / Save as PDF through the browser print dialog
- Custom date ranges and quick filters

No new SQL migration is required. The report reads the existing `sale_returns` and `sale_return_items` tables when they are present.

## Important
The project build was not run in this environment because dependency installation timed out. The source was updated from the working Dashboard 2.4 project.
