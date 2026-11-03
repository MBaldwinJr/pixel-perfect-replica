<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Layering: components -> hooks (`src/features/*/use-*.ts`) -> services (`*-service.ts`); pure rules live in `src/domain` with unit tests. Why: keeps business rules out of UI.
- Authorization is enforced in Postgres RLS via `is_company_member` / `has_company_role` (security definer); UI hiding is cosmetic only. Why: backend must be the source of truth.
- Every tenant table carries `company_id` and its policies must scope by it. Why: cross-company isolation.
- Privileged auth actions (create/deactivate users) run in `createServerFn` with `requireSupabaseAuth`, verify admin via RPC first, then load `supabaseAdmin` inside the handler. Why: service key never reaches the browser.
- Audit rows are written by DB triggers (`write_audit_log`) or server functions only; clients have no insert grant. Why: tamper-resistant audit trail.
- `integration_configs.configuration` must never hold credentials (DB trigger rejects them); secrets go to server secrets. Why: no plaintext credentials.
- Future money columns use NUMERIC, never FLOAT. Why: exact fiscal arithmetic.
- Planned modules are listed in `src/domain/modules.ts` with status `em_desenvolvimento` and render a single placeholder page with no fake actions. Why: no simulated functionality.
- RLS regression test lives in `supabase/tests/rls_isolation.sql` (self-rolling-back); rerun after policy changes. Why: proves isolation.
