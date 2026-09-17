# G-LOKOO POS v2.10.5 — Receipt Width / Hidden Information Fix

## What changed
- Receipt printing now uses the saved `receipt_width` setting: 58mm or 80mm.
- Print content is locked to the selected thermal-paper width instead of relying on the browser's Letter/A4 page width.
- Added safe left/right padding so labels and values are not clipped by printer margins.
- Receipt information uses responsive grid columns and word wrapping to prevent long customer names, references, product names, or IMEIs from hiding content.
- The total and prices stay visible on the right side.
- Chrome Print Preview may still display a Letter/A4 preview when no thermal printer/driver is installed. That does not mean the receipt HTML width is wrong; the actual thermal printer will use its configured 58mm/80mm paper width.

## No SQL changes
No Supabase SQL migration is required for this print-only fix.

## Important
Keep your existing `.env.local` file in your working project. It is intentionally not included in the updated ZIP.
