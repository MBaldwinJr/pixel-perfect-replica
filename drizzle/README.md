# Database migration policy

The SQL files in `drizzle/migrations/` are the current source of truth for the Supabase database.

- Do not run `drizzle-kit generate` while `drizzle/schema.ts` is intentionally empty.
- Do not edit an already-applied migration; add a new, ordered SQL migration instead.
- Review every migration, apply it to a disposable/staging database, run the SQL and application tests, and only then schedule production rollout.
- Keep application schema types in `src/integrations/supabase/types.ts` synchronized with approved migrations.
- The repository change does not apply migrations to the hosted Supabase project.

A future schema-consolidation task should either fully model the existing database in Drizzle or formally move migration ownership to Supabase CLI migrations. Until then, avoid mixing generated Drizzle migrations with manually maintained SQL.
