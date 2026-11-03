-- Fase 1: fundação multiempresa com RBAC e auditoria
create type public.app_role as enum ('admin','diretoria','fiscal','compras','financeiro','comercial','auditor');
create type public.tax_regime as enum ('simples_nacional','lucro_presumido','lucro_real');
create type public.integration_status as enum ('nao_configurada','em_configuracao','ativa','inativa','erro');
create type public.integration_type as enum ('erp','adquirente','documento_fiscal','conciliacao');

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- companies
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (char_length(legal_name) between 2 and 200),
  trade_name text check (trade_name is null or char_length(trade_name) <= 200),
  cnpj char(14) not null unique check (cnpj ~ '^[0-9]{14}$'),
  tax_regime public.tax_regime not null,
  state_registration text check (state_registration is null or char_length(state_registration) <= 30),
  municipal_registration text check (municipal_registration is null or char_length(municipal_registration) <= 30),
  state char(2) not null check (state ~ '^[A-Z]{2}$'),
  city text check (city is null or char_length(city) <= 120),
  active boolean not null default true,
  data_confirmed_at timestamptz,
  data_confirmed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_companies_updated before update on public.companies for each row execute function public.set_updated_at();

-- branches
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 200),
  cnpj char(14) not null unique check (cnpj ~ '^[0-9]{14}$'),
  state char(2) not null check (state ~ '^[A-Z]{2}$'),
  city text check (city is null or char_length(city) <= 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_branches_company on public.branches(company_id);

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 150),
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_profiles_email on public.profiles(lower(email));

-- user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  branch_id uuid references public.branches(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index uq_user_roles on public.user_roles(company_id, user_id, role, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index idx_user_roles_user on public.user_roles(user_id);
create index idx_user_roles_company on public.user_roles(company_id);

-- audit_logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_company_created on public.audit_logs(company_id, created_at desc);

-- integration_configs
create table public.integration_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null check (char_length(provider) between 2 and 80),
  integration_type public.integration_type not null,
  status public.integration_status not null default 'nao_configurada',
  configuration jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, provider, integration_type)
);
create index idx_integrations_company on public.integration_configs(company_id);
create trigger trg_integrations_updated before update on public.integration_configs for each row execute function public.set_updated_at();

-- Bloqueia credenciais em texto aberto no JSON de configuração
create or replace function public.reject_sensitive_configuration() returns trigger language plpgsql set search_path = public as $$
begin
  if new.configuration::text ~* '"[^"]*(password|senha|secret|token|api[_-]?key|client[_-]?secret|private[_-]?key)[^"]*"\s*:' then
    raise exception 'Credenciais não podem ser armazenadas em configuration. Use o cofre de segredos do servidor.';
  end if;
  return new;
end; $$;
create trigger trg_integrations_no_secrets before insert or update on public.integration_configs for each row execute function public.reject_sensitive_configuration();

-- Funções de autorização (security definer evita recursão de RLS)
create or replace function public.is_company_member(_company_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid() and ur.company_id = _company_id and p.active
  )
$$;

create or replace function public.has_company_role(_company_id uuid, _roles public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid() and ur.company_id = _company_id and ur.role = any(_roles) and p.active
  )
$$;

create or replace function public.shares_company_with(_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles mine join public.user_roles theirs on theirs.company_id = mine.company_id
    where mine.user_id = auth.uid() and theirs.user_id = _other
  )
$$;

-- Impede remover o último administrador
create or replace function public.protect_last_admin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin' or new.company_id <> old.company_id) then
    if not exists (select 1 from public.user_roles where company_id = old.company_id and role = 'admin' and id <> old.id) then
      raise exception 'A empresa precisa manter ao menos um administrador.';
    end if;
  end if;
  return coalesce(new, old);
end; $$;
create trigger trg_user_roles_last_admin before update or delete on public.user_roles for each row execute function public.protect_last_admin();

-- Auditoria automática
create or replace function public.write_audit_log() returns trigger language plpgsql security definer set search_path = public as $$
declare
  _row jsonb := to_jsonb(coalesce(new, old));
  _company uuid;
begin
  _company := case when tg_table_name = 'companies' then (_row->>'id')::uuid else (_row->>'company_id')::uuid end;
  insert into public.audit_logs(company_id, user_id, action, entity, entity_id, details)
  values (_company, auth.uid(), lower(tg_op), tg_table_name, (_row->>'id')::uuid,
    case when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
         else jsonb_build_object('record', _row) end);
  return coalesce(new, old);
end; $$;
create trigger trg_audit_companies after insert or update or delete on public.companies for each row execute function public.write_audit_log();
create trigger trg_audit_branches after insert or update or delete on public.branches for each row execute function public.write_audit_log();
create trigger trg_audit_user_roles after insert or update or delete on public.user_roles for each row execute function public.write_audit_log();
create trigger trg_audit_integrations after insert or update or delete on public.integration_configs for each row execute function public.write_audit_log();

-- Grants
grant select, update on public.companies to authenticated;
grant select, insert, update, delete on public.branches to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select on public.audit_logs to authenticated;
grant select, insert, update, delete on public.integration_configs to authenticated;
grant all on public.companies, public.branches, public.profiles, public.user_roles, public.audit_logs, public.integration_configs to service_role;

alter table public.companies enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.integration_configs enable row level security;

create policy "members read company" on public.companies for select to authenticated using (public.is_company_member(id));
create policy "admins update company" on public.companies for update to authenticated using (public.has_company_role(id, array['admin']::public.app_role[])) with check (public.has_company_role(id, array['admin']::public.app_role[]));

create policy "members read branches" on public.branches for select to authenticated using (public.is_company_member(company_id));
create policy "admins insert branches" on public.branches for insert to authenticated with check (public.has_company_role(company_id, array['admin']::public.app_role[]));
create policy "admins update branches" on public.branches for update to authenticated using (public.has_company_role(company_id, array['admin']::public.app_role[])) with check (public.has_company_role(company_id, array['admin']::public.app_role[]));
create policy "admins delete branches" on public.branches for delete to authenticated using (public.has_company_role(company_id, array['admin']::public.app_role[]));

create policy "read own or colleague profile" on public.profiles for select to authenticated using (id = auth.uid() or public.shares_company_with(id));
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "read own roles or admin/auditor" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_company_role(company_id, array['admin','diretoria','auditor']::public.app_role[]));
create policy "admins insert roles" on public.user_roles for insert to authenticated with check (public.has_company_role(company_id, array['admin']::public.app_role[]));
create policy "admins update roles" on public.user_roles for update to authenticated using (public.has_company_role(company_id, array['admin']::public.app_role[])) with check (public.has_company_role(company_id, array['admin']::public.app_role[]));
create policy "admins delete roles" on public.user_roles for delete to authenticated using (public.has_company_role(company_id, array['admin']::public.app_role[]));

create policy "admin/diretoria/auditor read audit" on public.audit_logs for select to authenticated using (company_id is not null and public.has_company_role(company_id, array['admin','diretoria','auditor']::public.app_role[]));

create policy "authorized read integrations" on public.integration_configs for select to authenticated using (public.has_company_role(company_id, array['admin','diretoria','fiscal','financeiro','auditor']::public.app_role[]));
create policy "admins insert integrations" on public.integration_configs for insert to authenticated with check (public.has_company_role(company_id, array['admin']::public.app_role[]));
create policy "admins update integrations" on public.integration_configs for update to authenticated using (public.has_company_role(company_id, array['admin']::public.app_role[])) with check (public.has_company_role(company_id, array['admin']::public.app_role[]));
create policy "admins delete integrations" on public.integration_configs for delete to authenticated using (public.has_company_role(company_id, array['admin']::public.app_role[]));

-- Dados iniciais (sujeitos à confirmação administrativa: data_confirmed_at nulo)
insert into public.companies (id, legal_name, cnpj, tax_regime, state)
values ('a0000000-0000-4000-8000-000000000001', 'Peixoto Materiais de Construção', '13364076000148', 'lucro_real', 'RS');

insert into public.integration_configs (company_id, provider, integration_type) values
 ('a0000000-0000-4000-8000-000000000001','Agne Sistemas','erp'),
 ('a0000000-0000-4000-8000-000000000001','Cielo','adquirente'),
 ('a0000000-0000-4000-8000-000000000001','Cielo Link de Pagamento','adquirente'),
 ('a0000000-0000-4000-8000-000000000001','PagBank','adquirente'),
 ('a0000000-0000-4000-8000-000000000001','PagBank (Votoran)','adquirente'),
 ('a0000000-0000-4000-8000-000000000001','Vero','adquirente'),
 ('a0000000-0000-4000-8000-000000000001','XML NF-e de entrada','documento_fiscal'),
 ('a0000000-0000-4000-8000-000000000001','XML NF-e de saída','documento_fiscal'),
 ('a0000000-0000-4000-8000-000000000001','Arquivos de conciliação','conciliacao'),
 ('a0000000-0000-4000-8000-000000000001','Relatórios de recebimentos','conciliacao');

-- Perfil automático no cadastro; o primeiro usuário vira administrador da Peixoto
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare _company uuid := 'a0000000-0000-4000-8000-000000000001';
begin
  insert into public.profiles(id, full_name, email)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data->>'full_name',''),150),''), coalesce(new.email,''));
  if exists (select 1 from public.companies where id = _company)
     and not exists (select 1 from public.user_roles where company_id = _company and role = 'admin') then
    insert into public.user_roles(company_id, user_id, role) values (_company, new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();