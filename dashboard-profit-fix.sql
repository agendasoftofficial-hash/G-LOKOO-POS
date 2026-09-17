-- G-LOKOO POS Dashboard 2.0 - Accurate phone profit fix
-- Run this ONCE in Supabase SQL Editor. It is safe to rerun.

-- Phone sale_items were previously inserted before phone_units.sale_id was updated,
-- so the old trigger could not find the phone cost and recorded unit_cost as 0.
-- Look up phone cost by IMEI instead.

create or replace function public.fill_sale_item_unit_cost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.unit_cost is null or new.unit_cost = 0 then
    if new.imei is not null then
      select cost into new.unit_cost
      from public.phone_units
      where imei_1 = new.imei or imei_2 = new.imei
      limit 1;
    elsif new.product_id is not null then
      select cost into new.unit_cost
      from public.products
      where id = new.product_id;
    end if;
  end if;
  new.unit_cost := coalesce(new.unit_cost,0);
  return new;
end;
$$;

drop trigger if exists trg_fill_sale_item_unit_cost on public.sale_items;
create trigger trg_fill_sale_item_unit_cost
before insert on public.sale_items
for each row execute procedure public.fill_sale_item_unit_cost();

-- Repair existing phone sale costs using IMEI.
update public.sale_items si
set unit_cost = coalesce((
  select pu.cost
  from public.phone_units pu
  where si.imei is not null
    and (pu.imei_1 = si.imei or pu.imei_2 = si.imei)
  limit 1
), si.unit_cost, 0)
where si.imei is not null;

-- Repair existing accessory sale costs from the product cost.
update public.sale_items si
set unit_cost = coalesce((
  select p.cost
  from public.products p
  where p.id = si.product_id
  limit 1
), si.unit_cost, 0)
where si.imei is null;

create or replace view public.sales_profit_detail as
select
  si.sale_id,
  s.receipt_no,
  s.created_at,
  si.product_id,
  si.product_name,
  si.imei,
  si.quantity,
  si.unit_price,
  si.line_total,
  coalesce(si.unit_cost,0) as unit_cost,
  (coalesce(si.unit_cost,0) * si.quantity) as line_cost,
  (si.line_total - (coalesce(si.unit_cost,0) * si.quantity)) as line_profit,
  s.payment_method,
  s.payment_status,
  s.amount_paid,
  s.balance_due
from public.sale_items si
join public.sales s on s.id = si.sale_id;

grant select on public.sales_profit_detail to authenticated;
