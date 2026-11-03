-- Guard account-level suspension as a second line of defense.
-- Company-level deactivation should use user_roles.active; profiles.active is global.
create or replace function public.protect_profile_last_admin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  company_record record;
begin
  if old.active = true and new.active = false then
    for company_record in
      select distinct ur.company_id
      from public.user_roles ur
      where ur.user_id = old.id
        and ur.role = 'admin'
        and ur.active = true
      order by ur.company_id
    loop
      perform pg_advisory_xact_lock(hashtextextended(company_record.company_id::text, 0));

      if not exists (
        select 1
        from public.user_roles ur
        join public.profiles p on p.id = ur.user_id
        where ur.company_id = company_record.company_id
          and ur.role = 'admin'
          and ur.active = true
          and p.active = true
          and ur.user_id <> old.id
      ) then
        raise exception 'A conta é o último administrador ativo da empresa % e não pode ser suspensa.', company_record.company_id
          using errcode = '23514';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_last_admin on public.profiles;
create trigger trg_profiles_last_admin
before update of active on public.profiles
for each row execute function public.protect_profile_last_admin();

revoke all on function public.protect_profile_last_admin() from public, anon, authenticated;
