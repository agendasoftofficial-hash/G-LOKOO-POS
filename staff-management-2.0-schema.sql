-- G-LOKOO POS Staff Management 2.0
-- Run once after the existing staff/audit schema.

alter table public.profiles
  add column if not exists active boolean not null default true;

create or replace function public.get_staff_directory()
returns table(
  id uuid,
  full_name text,
  phone text,
  role text,
  active boolean,
  created_at timestamptz,
  email text,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
)
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not public.is_management() then
    raise exception 'Management access required';
  end if;
  return query
  select p.id,p.full_name,p.phone,p.role,p.active,p.created_at,
         u.email,u.last_sign_in_at,u.email_confirmed_at
  from public.profiles p
  join auth.users u on u.id=p.id
  order by p.created_at desc;
end;
$$;

grant execute on function public.get_staff_directory() to authenticated;

create or replace function public.guard_staff_management()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  remaining_owners integer;
begin
  if old.id = auth.uid() and new.active = false then
    raise exception 'You cannot deactivate your own account.';
  end if;

  if old.role = 'owner' and (new.role <> 'owner' or new.active = false) then
    select count(*) into remaining_owners
    from public.profiles
    where id <> old.id and role='owner' and active=true;
    if remaining_owners = 0 then
      raise exception 'At least one active Owner account must remain.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_staff_management on public.profiles;
create trigger trg_guard_staff_management
before update of role,active on public.profiles
for each row execute procedure public.guard_staff_management();

create or replace function public.audit_profile_management()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.active is distinct from new.active then
    perform public.write_audit(
      case when new.active then 'STAFF_ACTIVATED' else 'STAFF_DEACTIVATED' end,
      'profiles',new.id::text,
      jsonb_build_object('staff_name',new.full_name,'old_active',old.active,'new_active',new.active)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_profile_management on public.profiles;
create trigger trg_audit_profile_management
after update of active on public.profiles
for each row execute procedure public.audit_profile_management();
