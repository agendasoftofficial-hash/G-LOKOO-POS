# G-LOKOO POS v2.24.0 — Staff Management 2.0

## Added
- Create new staff login accounts from Staff & Permissions using the secure `/api/create-staff` endpoint.
- Assign Admin, Cashier, Inventory or Technician roles when creating an account.
- Active / Inactive staff status.
- Last login time from Supabase Authentication.
- Password reset email action for staff accounts.
- Staff summary cards: total, active, inactive and active owners.
- Search by staff name, email, phone or role.
- Audit entries for staff creation, activation/deactivation and role changes.
- Database protection so at least one active Owner always remains.
- Owners cannot deactivate their own account.
- Inactive profiles are blocked from entering the POS.

## Required SQL
Run `staff-management-2.0-schema.sql` once in Supabase SQL Editor.

Do not rerun older full schema files.

## Required Vercel environment variable
For the in-app **New Staff Account** feature, add this server-only Vercel environment variable:

`SUPABASE_SERVICE_ROLE_KEY`

Use the Supabase project's **service_role** key. Never put this key in `.env.local` as a `VITE_` variable and never expose it in browser code.

The API also reads the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` server-side.

## Local development
The Vite browser app can run with `npm run dev`. The `/api/create-staff` endpoint requires a Vercel-compatible server runtime; deploy to Vercel (or run with Vercel's local development command) to use New Staff Account.
