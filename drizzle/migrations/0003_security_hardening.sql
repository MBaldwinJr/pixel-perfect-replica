-- Security hardening for Peixoto Tax Intelligence.
-- Apply only after reviewing the target Supabase project and taking a backup.

-- 1) Company membership activation is scoped per company, not globally per profile.
alter table public.user_roles
  add column if not exists active boolean not null default true;

create index if not exists idx_user_roles_active_company_user
  on public.user_roles(company_id, user_id)
  where active = true;

-- 2) Remove automatic administrator promotion during public signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles(id, full_name, email)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data->>'full_name',''),150),''),
    coalesce(new.email,'')
  )
  on conflict (id) do nothing;

  -- A newly registered account receives no company membership or role.
  -- Bootstrap the first administrator through a trusted, out-of-band procedure.
  return new;
end;
$$;

-- 3) Authorization helpers require active membership and active accounts.
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
    join public.profiles colleague on colleague.id = theirs.user_id
    where mine.user_id = auth.uid()
      and theirs.user_id = _other
      and mine.active = true
      and theirs.active = true
      and me.active = true
      and colleague.active = true
  );
$$;

-- 4) Protect the last active administrator, including concurrent changes.
create or replace function public.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  must_check boolean := false;
begin
  if tg_op = 'DELETE' then
    must_check := old.role = 'admin' and old.active;
  else
    must_check := old.role = 'admin'
      and old.active
      and (
        new.role is distinct from 'admin'::public.app_role
        or new.company_id is distinct from old.company_id
        or new.active is distinct from true
      );
  end if;

  if must_check then
    -- Serialize admin-removal decisions for this company.
    perform pg_advisory_xact_lock(hashtextextended(old.company_id::text, 0));

    if not exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      where ur.company_id = old.company_id
        and ur.role = 'admin'
        and ur.active = true
        and p.active = true
        and ur.id <> old.id
    ) then
      raise exception 'A empresa precisa manter ao menos um administrador ativo.'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_roles_last_admin on public.user_roles;
create trigger trg_user_roles_last_admin
before update or delete on public.user_roles
for each row execute function public.protect_last_admin();

-- 5) Profile reads cannot expose inactive accounts through colleague access.
drop policy if exists "read own or colleague profile" on public.profiles;
create policy "read own or active colleague profile"
on public.profiles
for select
to authenticated
using (
  (id = auth.uid() and active = true)
  or (active = true and public.shares_company_with(id))
);

-- 6) Restrict executable privileges on SECURITY DEFINER helpers.
-- RLS invokes these helpers as authenticated; trigger functions are not RPC APIs.
revoke all on function public.is_company_member(uuid) from public, anon;
revoke all on function public.has_company_role(uuid, public.app_role[]) from public, anon;
revoke all on function public.shares_company_with(uuid) from public, anon;
grant execute on function public.is_company_member(uuid) to authenticated, service_role;
grant execute on function public.has_company_role(uuid, public.app_role[]) to authenticated, service_role;
grant execute on function public.shares_company_with(uuid) to authenticated, service_role;

revoke all on function public.protect_last_admin() from public, anon, authenticated;
revoke all on function public.write_audit_log() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.reject_sensitive_configuration() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.guard_company_confirmation() from public, anon, authenticated;

-- 7) Ensure the profile table's own row is the only profile an account can read
-- unless the active-colleague policy above grants access.
