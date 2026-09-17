-- G-LOKOO POS v1.2.4 - Customer permissions hardening
-- Run after staff-schema.sql. Safe to run more than once.

-- Cashiers can read and create customers for normal sales,
-- but customer records cannot be edited or deleted by Cashiers.
drop policy if exists "sales customers update" on public.customers;
create policy "management customers update" on public.customers
for update to authenticated
using (public.is_management())
with check (public.is_management());

drop policy if exists "management customers delete" on public.customers;
create policy "management customers delete" on public.customers
for delete to authenticated
using (public.is_management());

-- Keep customer creation available to Cashiers because they need to
-- register a new customer during a sale.
drop policy if exists "sales customers insert" on public.customers;
create policy "sales customers insert" on public.customers
for insert to authenticated
with check (public.current_user_role() in ('owner','admin','cashier'));

-- Read access remains available to sales staff.
drop policy if exists "sales customers read" on public.customers;
create policy "sales customers read" on public.customers
for select to authenticated
using (public.current_user_role() in ('owner','admin','cashier'));
