-- Confirmação administrativa: sempre registrada com o usuário autenticado e
-- invalidada quando dados cadastrais mudam.
create or replace function public.guard_company_confirmation() returns trigger language plpgsql set search_path = public as $$
begin
  if new.data_confirmed_at is distinct from old.data_confirmed_at and new.data_confirmed_at is not null then
    new.data_confirmed_by := auth.uid();
    new.data_confirmed_at := now();
  elsif (new.legal_name, new.trade_name, new.cnpj, new.tax_regime, new.state_registration, new.municipal_registration, new.state, new.city)
        is distinct from (old.legal_name, old.trade_name, old.cnpj, old.tax_regime, old.state_registration, old.municipal_registration, old.state, old.city) then
    new.data_confirmed_at := null;
    new.data_confirmed_by := null;
  else
    new.data_confirmed_by := old.data_confirmed_by;
  end if;
  return new;
end; $$;
create trigger trg_companies_confirmation before update on public.companies for each row execute function public.guard_company_confirmation();

-- Auditoria de ativação/desativação de perfis
create trigger trg_audit_profiles after update of active on public.profiles for each row execute function public.write_audit_log();