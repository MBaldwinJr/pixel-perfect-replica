alter table public.user_roles add column if not exists active boolean not null default true;
create index if not exists idx_user_roles_active_company_user on public.user_roles(company_id, user_id) where active = true;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.profiles(id, full_name, email)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data->>'full_name',''),150),''), coalesce(new.email,''))
  on conflict (id) do nothing;
  return new;
end; $$;

create or replace function public.is_company_member(_company_id uuid) returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id join public.companies c on c.id = ur.company_id
    where ur.user_id = auth.uid() and ur.company_id = _company_id and ur.active and p.active and c.active);
$$;

create or replace function public.has_company_role(_company_id uuid, _roles public.app_role[]) returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id join public.companies c on c.id = ur.company_id
    where ur.user_id = auth.uid() and ur.company_id = _company_id and ur.role = any(_roles) and ur.active and p.active and c.active);
$$;

create or replace function public.shares_company_with(_other uuid) returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (select 1 from public.user_roles mine join public.user_roles theirs on theirs.company_id = mine.company_id
    join public.profiles me on me.id = mine.user_id join public.profiles colleague on colleague.id = theirs.user_id
    where mine.user_id = auth.uid() and theirs.user_id = _other and mine.active and theirs.active and me.active and colleague.active);
$$;

create or replace function public.protect_last_admin() returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare must_check boolean := false;
begin
  if tg_op = 'DELETE' then must_check := old.role = 'admin' and old.active;
  else must_check := old.role = 'admin' and old.active and (new.role is distinct from 'admin'::public.app_role or new.company_id is distinct from old.company_id or new.active is distinct from true);
  end if;
  if must_check then
    perform pg_advisory_xact_lock(hashtextextended(old.company_id::text, 0));
    if not exists (select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id
      where ur.company_id = old.company_id and ur.role = 'admin' and ur.active and p.active and ur.id <> old.id) then
      raise exception 'A empresa precisa manter ao menos um administrador ativo.' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

drop trigger if exists trg_user_roles_last_admin on public.user_roles;
create trigger trg_user_roles_last_admin before update or delete on public.user_roles for each row execute function public.protect_last_admin();

drop policy if exists "read own or colleague profile" on public.profiles;
drop policy if exists "read own or active colleague profile" on public.profiles;
create policy "read own or active colleague profile" on public.profiles for select to authenticated
using ((id = auth.uid() and active = true) or (active = true and public.shares_company_with(id)));

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

create or replace function public.protect_profile_last_admin() returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare company_record record;
begin
  if old.active = true and new.active = false then
    for company_record in select distinct ur.company_id from public.user_roles ur where ur.user_id = old.id and ur.role = 'admin' and ur.active order by ur.company_id loop
      perform pg_advisory_xact_lock(hashtextextended(company_record.company_id::text, 0));
      if not exists (select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id
        where ur.company_id = company_record.company_id and ur.role = 'admin' and ur.active and p.active and ur.user_id <> old.id) then
        raise exception 'A conta é o último administrador ativo da empresa % e não pode ser suspensa.', company_record.company_id using errcode = '23514';
      end if;
    end loop;
  end if;
  return new;
end; $$;

drop trigger if exists trg_profiles_last_admin on public.profiles;
create trigger trg_profiles_last_admin before update of active on public.profiles for each row execute function public.protect_profile_last_admin();
revoke all on function public.protect_profile_last_admin() from public, anon, authenticated;