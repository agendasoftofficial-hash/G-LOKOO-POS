-- G-LOKOO POS v1.0 - Expenses & Accurate Profit
-- Run this once AFTER the existing G-LOKOO schema, purchases-schema.sql,
-- and credit-payments-schema.sql.

-- Keep the unit cost that applied when each sale was made.
alter table public.sale_items
  add column if not exists unit_cost numeric(12,2) not null default 0;

-- Existing sales: backfill cost from the current inventory records where possible.
update public.sale_items si
set unit_cost = coalesce(
  case
    when si.imei is not null then (
      select pu.cost from public.phone_units pu
      and (pu.imei_1 = si.imei or pu.imei_2 = si.imei)
      limit 1
    )
    else (select p.cost from public.products p where p.id = si.product_id)
  end, 0
)
where si.unit_cost = 0;

-- Automatically capture cost for every future sale item.
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

-- Sale item date makes period reporting reliable even if a product is later deleted.
alter table public.sale_items
  add column if not exists created_at timestamptz not null default now();

create index if not exists sale_items_created_at_idx on public.sale_items(created_at desc);
create index if not exists expenses_date_idx on public.expenses(expense_date desc);

-- Helpful reporting view.
create or replace view public.sales_profit_detail as
select
  si.sale_id,
  s.receipt_no,
  s.created_at,
  si.product_name,
  si.imei,
  si.quantity,
  si.unit_price,
  si.line_total,
  si.unit_cost,
  (si.unit_cost * si.quantity) as line_cost,
  (si.line_total - (si.unit_cost * si.quantity)) as line_profit,
  s.payment_method,
  s.payment_status,
  s.amount_paid,
  s.balance_due
from public.sale_items si
join public.sales s on s.id = si.sale_id;

grant select on public.sales_profit_detail to authenticated;
