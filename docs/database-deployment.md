# Database CI/CD

`.github/workflows/database.yml` is the database deployment owner. Vercel still
builds/deploys the website independently; a successful Vercel build does not prove
the database deployment succeeded or wait for it. For releases that break schema
compatibility, coordinate the website rollout after the database job succeeds.

## One-time setup

In GitHub → `bcstryker/portfolio-site` → Settings → Secrets and variables → Actions,
add these repository secrets (or the same names on the `production` environment):

| Secret | Source |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Supabase account personal access token, authorized for this project. The CLI link operation needs Project Settings, API Keys, and API Key Secrets read permissions. |
| `SUPABASE_DB_PASSWORD` | This project's Postgres database password, saved when you created the project. |
| `SUPABASE_PROJECT_ID` | The actual project reference in `https://supabase.com/dashboard/project/<reference>`. It is not the friendly `project_id` in the local config file. |

These are deployment credentials, not the website's publishable/secret API keys.
Do not commit them, put them in `NEXT_PUBLIC_*`, or paste them into chat. If the
password is unavailable, obtain/reset it through Supabase before enabling deployment.
Use one migration deployer: disable Supabase's native **Deploy to production** if
using this workflow, so two systems cannot run the same migrations concurrently.
GitHub Actions does not require Supabase paid preview branching.

## What happens automatically

- Every PR runs all tests against an isolated PGlite database, then applies the
  migrations to a real Supabase Postgres container. Production credentials are
  unavailable to this job.
- With the repository Actions variable `SUPABASE_AUTO_DEPLOY=true`, a push/merge
  to `main` runs the checks, links production, adopts the baseline if needed,
  previews pending migrations, and applies them in timestamp order.
- Without that variable, pushes only test and inspect. Use manual `deploy` when
  ready. An `inspect` run never changes migration history or application data.
- Production operations are serialized and are not canceled mid-migration.
- Vercel deploys independently. For changes that break schema compatibility,
  coordinate the website rollout after the database job succeeds.

Add **Test migrations** as a required PR status check. Inspect **Actions → Database
migrations → Supabase production** for deployment results.

## Consolidated baseline

`supabase/migrations/20261105001600_application_baseline.sql` replaces the original
16 files through `20261105001600_game_memory.sql`. It creates the current schema,
security policies/grants, realtime subscription, party functions, all five game
rules, and built-in Memory card sets directly. It contains no legacy table rebuild.
The original files remain available in Git history.

The baseline retains the last original timestamp, `20261105001600`. On the next
`deploy`, `scripts/adopt-migration-baseline.cjs` checks remote history:

- **All original 16 versions recorded:** removes the first 15 history entries using
  `supabase migration repair --status reverted`. The last timestamp remains recorded,
  so `db push` skips the baseline. No application SQL runs and rooms/data are preserved.
- **Fresh database:** normal `db push` executes the baseline.
- **Baseline already adopted:** no history changes; only newer migrations run.
- **Partial original history or unknown older versions:** fails before deployment.
  Inspect the discrepancy rather than marking the baseline applied blindly.

No SQL Editor work, new secrets, or database reset is needed for an existing
project with the complete original chain. After these changes reach `main`, the
normal automatic deployment handles adoption. If automatic deployment is disabled,
choose **Run workflow → main → operation deploy**. A successful run should show
only `20261105001600` (plus any future migrations) in remote history.

This is a one-time history transition, not a rollback or a schema-repair tool. It
assumes recorded migrations were actually applied; it cannot detect manual schema
drift. The bridge runs only for `deploy` and shares the production lock. If a CLI
failure interrupts history repair, inspect the history before retrying; incomplete
legacy history intentionally blocks automatic adoption.

## Future database changes

Create a new timestamped SQL file after the baseline, commit it with the feature,
and let CI test and deploy it. Do not edit the baseline or rename/delete applied
migrations. There is no need to consolidate after each feature.

Fresh local databases use `supabase db reset --local --no-seed`. Existing local
databases still carrying the old history can be reset locally if their data is
disposable. Do not use a remote reset merely to adopt the baseline.

## Manual recovery controls

All production operations require branch `main` and pass isolated tests first:

- `inspect`: show local/remote history only.
- `deploy`: adopt the baseline if eligible, preview, and apply pending migrations.
- `record-applied`: exceptional recovery for SQL already verified as applied.
  Supply exact timestamps present in the current migration directory and confirmation
  `I VERIFIED THESE MIGRATIONS ARE ALREADY APPLIED`. This changes history only;
  never use it to hide a failed migration or incomplete baseline setup.
- `rebuild`: destructive reset of user-created database objects/data, followed by
  all migrations. Manual-only; requires `REBUILD APPLICATION DATABASE` in the
  workflow confirmation input. It is broader than deleting game rooms and is
  unnecessary for consolidation. Use only when all affected data is disposable.

Official references:
- https://supabase.com/docs/guides/deployment/managing-environments
- https://supabase.com/docs/reference/cli/supabase-db-push
- https://supabase.com/docs/reference/cli/supabase-migration-repair
