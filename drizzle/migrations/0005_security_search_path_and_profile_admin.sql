-- Follow-up hardening: qualify auth.uid() under restricted search_path and
-- allow active administrators/members to inspect inactive colleagues for reactivation.

create or replace function public.is_company_member(_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    join public.companies c on c.id = ur.company_id
    where ur.user_id = auth.uid()
      and ur.company_id = _company_id
      and ur.active = true
      and p.active = true
      and c.active = true
  );
$$;

create or replace function public.has_company_role(_company_id uuid, _roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    join public.companies c on c.id = ur.company_id
    where ur.user_id = auth.uid()
      and ur.company_id = _company_id
      and ur.role = any(_roles)
      and ur.active = true
      and p.active = true
      and c.active = true
  );
$$;

create or replace function public.shares_company_with(_other uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.user_roles mine
    join public.user_roles theirs on theirs.company_id = mine.company_id
    join public.profiles me on me.id = mine.user_id
    where mine.user_id = auth.uid()
      and theirs.user_id = _other
      and mine.active = true
      and me.active = true
  );
$$;

-- A disabled account may inspect only its own profile (so auth middleware can
-- reject it). An active company member may inspect a colleague's profile,
-- including an inactive one, to manage/reactivate that membership.
drop policy if exists "read own or active colleague profile" on public.profiles;
create policy "read own or colleague profile by active member"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.shares_company_with(id)
);

-- These trigger functions also call auth.uid(); fully qualify it because their
-- restricted search_path intentionally excludes the auth schema.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _row jsonb := to_jsonb(coalesce(new, old));
  _company uuid;
begin
  _company := case
    when tg_table_name = 'companies' then (_row->>'id')::uuid
    else (_row->>'company_id')::uuid
  end;

  insert into public.audit_logs(company_id, user_id, action, entity, entity_id, details)
  values (
    _company,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    (_row->>'id')::uuid,
    case
      when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
      else jsonb_build_object('record', _row)
    end
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.guard_company_confirmation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.data_confirmed_at is distinct from old.data_confirmed_at
     and new.data_confirmed_at is not null then
    new.data_confirmed_by := auth.uid();
    new.data_confirmed_at := now();
  elsif (
    new.legal_name, new.trade_name, new.cnpj, new.tax_regime,
    new.state_registration, new.municipal_registration, new.state, new.city
  ) is distinct from (
    old.legal_name, old.trade_name, old.cnpj, old.tax_regime,
    old.state_registration, old.municipal_registration, old.state, old.city
  ) then
    new.data_confirmed_at := null;
    new.data_confirmed_by := null;
  else
    new.data_confirmed_by := old.data_confirmed_by;
  end if;
  return new;
end;
$$;

revoke all on function public.is_company_member(uuid) from public, anon;
revoke all on function public.has_company_role(uuid, public.app_role[]) from public, anon;
revoke all on function public.shares_company_with(uuid) from public, anon;
grant execute on function public.is_company_member(uuid) to authenticated, service_role;
grant execute on function public.has_company_role(uuid, public.app_role[]) to authenticated, service_role;
grant execute on function public.shares_company_with(uuid) to authenticated, service_role;
revoke all on function public.write_audit_log() from public, anon, authenticated;
revoke all on function public.guard_company_confirmation() from public, anon, authenticated;
