-- G-LOKOO POS v1.3 - Shop Settings
-- Run once in Supabase SQL Editor after the previous migrations.
-- Safe to run more than once.

create table if not exists public.shop_settings (
  id integer primary key default 1 check (id = 1),
  shop_name text not null default 'G-LOKOO PHONES AND ACCESSORIES',
  shop_subtitle text not null default 'PHONES AND ACCESSORIES',
  phone_primary text not null default '0247917685',
  phone_secondary text not null default '050006067',
  address text not null default '',
  receipt_footer text not null default 'Thank you for shopping with G-LOKOO!',
  receipt_note text not null default 'Please keep this receipt for your records.',
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  receipt_width text not null default '80mm' check (receipt_width in ('58mm','80mm')),
  printer_name text not null default '',
  auto_print boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.shop_settings enable row level security;

drop policy if exists "management settings read" on public.shop_settings;
create policy "management settings read"
on public.shop_settings for select to authenticated
using (public.is_management());

drop policy if exists "management settings insert" on public.shop_settings;
create policy "management settings insert"
on public.shop_settings for insert to authenticated
with check (public.is_management());

drop policy if exists "management settings update" on public.shop_settings;
create policy "management settings update"
on public.shop_settings for update to authenticated
using (public.is_management())
with check (public.is_management());

insert into public.shop_settings (id)
values (1)
on conflict (id) do nothing;

grant select, insert, update on public.shop_settings to authenticated;
