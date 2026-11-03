# Security hardening runbook

## Migration order

Apply these SQL migrations to a **staging/test Supabase project first**, in order:

1. `drizzle/migrations/0003_security_hardening.sql`
2. `drizzle/migrations/0004_guard_global_account_suspension.sql`

Take a database backup before applying to production. These migrations change authorization helpers, RLS policies, membership state and administrator-protection triggers. They have **not** been applied to any hosted database by this repository change.

## Bootstrap the first administrator

Public self-registration is disabled in the application and the database signup trigger no longer grants a role automatically. The first administrator must be provisioned through a trusted database session after the account has been created and its profile exists.

Replace the email placeholder with the exact email of the person authorized by company management. Review the selected row before running the insert.

```sql
select id, email, active
from public.profiles
where lower(email) = lower('ADMIN_EMAIL_HERE');

-- Run only after confirming that the returned account is the intended administrator.
insert into public.user_roles (company_id, user_id, role)
select
  'a0000000-0000-4000-8000-000000000001'::uuid,
  p.id,
  'admin'::public.app_role
from public.profiles p
where lower(p.email) = lower('ADMIN_EMAIL_HERE')
  and p.active = true
  and not exists (
    select 1
    from public.user_roles ur
    where ur.company_id = 'a0000000-0000-4000-8000-000000000001'::uuid
      and ur.role = 'admin'
      and ur.active = true
  );
```

Verify the result:

```sql
select ur.company_id, p.email, ur.role, ur.active, p.active as account_active
from public.user_roles ur
join public.profiles p on p.id = ur.user_id
where ur.company_id = 'a0000000-0000-4000-8000-000000000001'::uuid
  and ur.role = 'admin';
```

Do not run the insert for an unverified email or when an active administrator already exists.

## Validation checklist

- Run `supabase/tests/rls_isolation.sql` against a disposable Supabase database after applying the migrations.
- Run `npm install`, `npm run lint`, `npm test` and `npm run build` in the project environment.
- Confirm that a public signup creates no company role.
- Confirm that an administrator can create a user and assign only the intended company roles.
- Confirm that deactivating a company membership removes access to that company without suspending the same person in other companies.
- Confirm that removing/demoting/deactivating the last active administrator is rejected.
- Confirm that audit records are created for membership changes.
- Review existing `user_roles` before production rollout. The migration does not retroactively determine whether any existing administrator was originally created through the old public-signup bootstrap behavior.

## Environment file

The tracked `.env` file was removed and environment patterns were added to `.gitignore`. The removal does not erase the file from prior Git history. The previously reviewed file contained public Supabase client configuration rather than a detected service-role key; nevertheless, inspect repository history and rotate any credential if a real secret is ever found.
