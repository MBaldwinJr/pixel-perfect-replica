# Peixoto Tax Intelligence — Fase 1 (Fundação)

## Arquitetura

```text
src/
  domain/            Regras puras (perfis, módulos/permissões, CNPJ, schema da empresa) + testes
  features/
    auth/            Sessão, login, cadastro, redefinição de senha
    company/         Empresa, integrações, auditoria (service -> hooks -> componentes)
    users/           Usuários e perfis; funções de servidor para ações privilegiadas
    dashboard/       KPIs estruturais, Central de Alertas, Últimas Atividades
  components/layout/ Sidebar, cabeçalho, logotipo tipográfico, estados de carregamento/erro/vazio
  routes/            /auth, /reset-password, /_authenticated/{dashboard,configuracoes,modulos/$slug}
supabase/tests/      Teste SQL de RLS (executa em transação e desfaz tudo)
drizzle/migrations/  Migrations versionadas aplicadas no banco
```

Componentes chamam hooks; hooks chamam services; ações que exigem privilégio
(criar usuário, desativar usuário) rodam em funções de servidor que verificam
`has_company_role(..., 'admin')` antes de usar a chave de serviço, que nunca chega ao navegador.

## Migrations

| Arquivo | Conteúdo                                                                                                                                                                                                                                                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0000    | Enums, tabelas `companies`, `branches`, `profiles`, `user_roles`, `audit_logs`, `integration_configs`; funções de autorização; RLS; auditoria automática; bloqueio de credenciais em JSON; proteção do último administrador; cadastro inicial da Peixoto; integrações planejadas; criação automática de perfil (primeiro usuário vira administrador) |
| 0001    | Confirmação administrativa do cadastro (registrada com o usuário autenticado e invalidada quando dados mudam)                                                                                                                                                                                                                                        |
| 0002    | Remoção de gatilho de auditoria redundante em `profiles`                                                                                                                                                                                                                                                                                             |

## Políticas RLS

- `companies`: leitura para membros ativos; alteração só por Administrador. Sem inserção/remoção pelo cliente.
- `branches`: leitura para membros; escrita por Administrador da mesma empresa.
- `profiles`: leitura do próprio perfil ou de colegas da mesma empresa; usuário altera apenas `full_name`. `active` só via servidor.
- `user_roles`: leitura dos próprios perfis, ou de todos para Administrador/Diretoria/Auditor da empresa; escrita só por Administrador da empresa. Não é possível remover o último administrador.
- `audit_logs`: leitura por Administrador/Diretoria/Auditor; escrita somente por gatilhos/servidor; imutável.
- `integration_configs`: leitura por Administrador/Diretoria/Fiscal/Financeiro/Auditor; escrita por Administrador; chaves como `password`, `token`, `secret`, `api_key` são rejeitadas.

Todas as funções de autorização exigem `profiles.active = true` e filtram por `company_id`.

## Testes

- `bunx vitest run src/domain/domain.test.ts` — CNPJ, permissões por módulo, schema da empresa.
- `supabase/tests/rls_isolation.sql` — 18 verificações de isolamento entre empresas e perfis.
