# G-LOKOO POS v2.10.4 — Receipt Print Preview Fix

This version fixes the thermal receipt print popup so the receipt content uses the available paper width instead of appearing as a tiny narrow block in the middle of a large preview page.

- Keeps the 80mm thermal receipt page definition.
- Uses responsive print width so 80mm thermal printers receive a full-width receipt.
- Works better with Chrome / Microsoft Print to PDF preview when the selected printer does not expose an 80mm custom paper size.
- No Supabase changes are required.

Test: Sales History → View / Receipt → Open Printable Receipt / Print Receipt.
