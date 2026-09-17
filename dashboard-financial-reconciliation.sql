-- G-LOKOO POS - Dashboard Financial Reconciliation
-- Run this ONCE in Supabase SQL Editor.
-- Purpose: fix older sales created before amount_paid/balance_due were added.
-- Those older fully-paid sales have total > 0, amount_paid = 0, balance_due = 0.

-- 1) Backfill fully-paid legacy sales.
update public.sales
set amount_paid = total,
    balance_due = 0,
    payment_status = 'Paid'
where coalesce(total,0) > 0
  and coalesce(amount_paid,0) = 0
  and coalesce(balance_due,0) = 0;

-- 2) Backfill payment history for those legacy sales when no payment record exists.
-- This keeps the Payment Methods and customer payment history consistent.
insert into public.sale_payments
  (sale_id, customer_id, amount, payment_method, payment_reference, paid_by, paid_at)
select
  s.id,
  s.customer_id,
  s.total,
  coalesce(nullif(trim(s.payment_method),''),'Cash'),
  s.payment_reference,
  s.cashier_id,
  s.created_at
from public.sales s
where coalesce(s.total,0) > 0
  and coalesce(s.amount_paid,0) = s.total
  and coalesce(s.balance_due,0) = 0
  and not exists (
    select 1
    from public.sale_payments sp
    where sp.sale_id = s.id
  );

-- 3) Optional consistency check: every paid sale should satisfy total = paid + balance.
-- This only fixes rows where the stored balance is zero and amount_paid is missing.
update public.sales
set amount_paid = greatest(coalesce(total,0) - coalesce(balance_due,0),0),
    payment_status = case
      when greatest(coalesce(total,0) - coalesce(balance_due,0),0) >= coalesce(total,0) then 'Paid'
      when greatest(coalesce(total,0) - coalesce(balance_due,0),0) > 0 then 'Partially Paid'
      else 'Unpaid'
    end
where coalesce(amount_paid,0) = 0
  and coalesce(total,0) > 0
  and coalesce(balance_due,0) > 0;

-- Verify the result.
select
  count(*) as sales_count,
  coalesce(sum(total),0) as sales_total,
  coalesce(sum(amount_paid),0) as collected_total,
  coalesce(sum(balance_due),0) as outstanding_total
from public.sales;
