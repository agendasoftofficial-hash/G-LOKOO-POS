# G-LOKOO POS v2.10.2 — Receipt Print FIX

Receipt printing now uses a dedicated print window instead of the main React page. This avoids Chrome printing the POS shell/blank page and produces an 80mm thermal-style receipt.

1. Keep `.env.local` with your Supabase values.
2. Run `npm install`.
3. Run `npm run dev`.
4. Sales History → View / Receipt → Print Receipt.
5. If Chrome blocks the print window, allow pop-ups for localhost:5173.
