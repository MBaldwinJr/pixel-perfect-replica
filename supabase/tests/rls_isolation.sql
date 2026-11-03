-- RLS isolation test. Runs inside a transaction and rolls back everything.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
 ('11111111-1111-4111-8111-111111111111','admin.peixoto@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('22222222-2222-4222-8222-222222222222','compras.peixoto@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('33333333-3333-4333-8333-333333333333','admin.outra@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('44444444-4444-4444-8444-444444444444','sem.perfil@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated');

insert into public.companies (id, legal_name, cnpj, tax_regime, state) values
 ('b0000000-0000-4000-8000-000000000002','Outra Empresa Teste','11222333000181','lucro_presumido','SC');
insert into public.user_roles (company_id, user_id, role) values
 ('a0000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','compras'),
 ('b0000000-0000-4000-8000-000000000002','33333333-3333-4333-8333-333333333333','admin');

create temp table results(test text, ok boolean);
grant all on results to authenticated;

-- first signup became Peixoto admin; second did not
insert into results select 'bootstrap: first user is Peixoto admin',
  exists(select 1 from public.user_roles where user_id='11111111-1111-4111-8111-111111111111' and role='admin' and company_id='a0000000-0000-4000-8000-000000000001');
insert into results select 'bootstrap: later users get no automatic role',
  not exists(select 1 from public.user_roles where user_id='44444444-4444-4444-8444-444444444444');

set local role authenticated;

-- Peixoto admin
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
insert into results select 'admin sees only own company', (select count(*) from public.companies)=1 and exists(select 1 from public.companies where id='a0000000-0000-4000-8000-000000000001');
insert into results select 'admin cannot see other company roles', not exists(select 1 from public.user_roles where company_id='b0000000-0000-4000-8000-000000000002');
update public.companies set city='Teste' where id='b0000000-0000-4000-8000-000000000002';
insert into results select 'admin cannot see audit of other company', not exists(select 1 from public.audit_logs where company_id='b0000000-0000-4000-8000-000000000002');
insert into results select 'admin sees Peixoto integrations', (select count(*) from public.integration_configs)=10;

-- Compras user
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
insert into results select 'compras reads own company', (select count(*) from public.companies)=1;
with u as (update public.companies set city='Hack' where id='a0000000-0000-4000-8000-000000000001' returning 1)
insert into results select 'compras cannot update company', (select count(*) from u)=0;
insert into results select 'compras cannot read audit', (select count(*) from public.audit_logs)=0;
insert into results select 'compras cannot read integrations', (select count(*) from public.integration_configs)=0;
insert into results select 'compras sees only own roles', (select count(*) from public.user_roles)=1;
do $$ begin
  begin
    insert into public.user_roles(company_id,user_id,role) values ('a0000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','admin');
    insert into results values ('compras cannot self-promote to admin', false);
  exception when others then insert into results values ('compras cannot self-promote to admin', true);
  end;
end $$;

-- Other company admin
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
insert into results select 'other admin cannot see Peixoto', not exists(select 1 from public.companies where id='a0000000-0000-4000-8000-000000000001');
insert into results select 'other admin cannot see Peixoto profiles', not exists(select 1 from public.profiles where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'));
do $$ begin
  begin
    insert into public.user_roles(company_id,user_id,role) values ('a0000000-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333333','admin');
    insert into results values ('other admin cannot join Peixoto', false);
  exception when others then insert into results values ('other admin cannot join Peixoto', true);
  end;
end $$;

-- No-role user
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
insert into results select 'user without role sees no company', (select count(*) from public.companies)=0;

-- Peixoto admin again: last admin protection + secret guard
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
do $$ begin
  begin
    delete from public.user_roles where user_id='11111111-1111-4111-8111-111111111111' and role='admin';
    insert into results values ('cannot remove last admin', false);
  exception when others then insert into results values ('cannot remove last admin', true);
  end;
  begin
    update public.integration_configs set configuration='{"api_key":"x"}' where provider='Cielo';
    insert into results values ('credentials rejected in configuration', false);
  exception when others then insert into results values ('credentials rejected in configuration', true);
  end;
end $$;

reset role;
-- Report and abort: the exception guarantees every test row above is rolled back.
do $$ begin
  raise exception E'RLS TEST REPORT\n%', (select string_agg(case when ok then 'PASS ' else 'FAIL ' end || test, E'\n') from results);
end $$;
rollback;
