# G-LOKOO POS v2.10.7 – Receipt PDF Preview Scaling Fix

This update improves the normal-paper/PDF receipt preview when no thermal printer is configured.

- Uses a wider 200mm receipt area on Letter paper so the receipt is easier to read.
- Keeps 58mm/80mm thermal sizing when a printer name is configured.
- Keeps receipt information inside the printable area and allows long values to wrap.
- No Supabase/SQL changes are required.

Keep your existing `.env.local` file.
