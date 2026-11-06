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

- Every PR runs `npm ci`, all tests (including every migration in PGlite), and the
  complete migration chain against an isolated real Supabase Postgres container.
  This job has no production credentials and never touches the hosted database.
- Once the repository Actions variable `SUPABASE_AUTO_DEPLOY` is set to `true`,
  a push/merge to `main` runs those checks, then links the production project,
  displays history and the pending migration list, and runs `supabase db push`.
- The CLI applies pending files in timestamp order and records each successful
  migration. Already recorded versions are skipped on subsequent deployments.
- Production operations are serialized and are not canceled mid-migration.
- Missing secrets, failed tests, history mismatches, or SQL errors fail the job.
  Nothing automatically marks migrations as applied or resets the remote database.

After the workflow is on `main`, add **Test migrations** as a required PR status
check in GitHub's branch rules. Inspect **Actions → Database migrations** for logs.
A failed SQL batch can leave earlier files applied; fix forward and rerun the job.

On first setup, leave `SUPABASE_AUTO_DEPLOY` unset. Pushes to `main` then run
checks and inspect history only; they do not apply pending SQL. Manual `deploy`
remains available for the first verified deployment.

## First deployment: reconcile previous SQL Editor executions

Files run through SQL Editor may already exist in the schema without corresponding
rows in migration history. Do not blindly deploy/reapply them or mark all 16 applied.

1. After this workflow reaches `main`, open Actions → Database migrations → Run workflow.
2. Select branch `main`, operation `inspect`. This shows local/remote history without
   applying or repairing production migrations.
3. Verify which exact committed files were already applied, using prior SQL Editor
   executions and the current database schema. History alone cannot prove that an
   unrecorded file was applied. If uncertain, audit before proceeding.
4. Run operation `record-applied` with **only those verified timestamps**, separated
   by commas/spaces. For example, `20261105000100,20261105000200` records those two
   files only. Supply the required confirmation:
   `I VERIFIED THESE MIGRATIONS ARE ALREADY APPLIED`.
5. This operation updates history only, lists the pending files, and stops. It does
   not run pending SQL. Review its output, then run operation `deploy` on `main`.
6. After the first deployment succeeds, add the repository Actions **variable**
   `SUPABASE_AUTO_DEPLOY` with value `true` under Settings → Secrets and variables →
   Actions → Variables. Future merges to `main` apply new migrations automatically. No SQL copy/paste is
   needed. Never edit or rename migrations already recorded in production.

`record-applied` validates that every supplied timestamp belongs to a committed
migration. It cannot inspect or guarantee the live schema matches that file, and
must not be used to hide a failed migration.

## Current rebuild release

`20261105001000_game_platform_rebuild.sql` deletes existing game rooms and rebuilds
the game tables. The later router/rules files complete that platform. Deploy this
batch only when existing party data is disposable and no live sessions must be
preserved. The workflow does not erase Auth users or reset the whole database.

## Manual controls

`inspect`, `record-applied`, and `deploy` are available through Run workflow on
`main`. Production steps are refused on feature branches. `inspect` and history
repair still run the isolated checks first. The workflow must be committed and
pushed to GitHub; local files do not enable Actions.

Official references:
- https://supabase.com/docs/guides/deployment/managing-environments
- https://supabase.com/docs/reference/cli/supabase-db-push
- https://supabase.com/docs/reference/cli/supabase-migration-repair
