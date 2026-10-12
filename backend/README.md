# MySpace FastAPI API

FastAPI is the application API. Supabase Auth issues user sessions, Postgres stores roadmap data, and the SQL files in the repository's root `supabase/` folder manage database schema changes.

## Configure Supabase

1. Install Docker Desktop and the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. From the repository root, run `supabase start` to start the local Supabase stack and apply migrations.
3. Run `supabase status -o env` and copy `API_URL` and `ANON_KEY` into `backend/.env` as `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. For a hosted Supabase project, run `supabase login`, `supabase link --project-ref <project-ref>`, then `supabase db push` from the repository root to apply committed migrations.

If you already ran this schema manually in the SQL Editor, compare the tables, policies, and function with the migration first. If they match, record the existing migration as applied with `supabase migration repair 202610120001 --status applied` before using `supabase db push`; otherwise the CLI will try to create the existing tables again. The CLI uses migration history to decide what to apply. [Migration repair docs](https://supabase.com/docs/reference/cli/supabase-migration-repair)

The checked-in migration creates the roadmap, stages, items, and progress tables, enables per-user row-level security, and installs the `save_roadmap` RPC. The API forwards the signed-in user's Supabase access token on every database request, so Postgres RLS remains active. It does not use a service-role key.

## Run FastAPI

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Set SUPABASE_URL and SUPABASE_ANON_KEY in .env
uvicorn app.main:app --reload
```

The API docs are at `http://127.0.0.1:8000/docs`; the health check is `/health`.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Create an account through Supabase Auth |
| POST | `/api/v1/auth/login` | Sign in through Supabase Auth |
| POST | `/api/v1/auth/refresh` | Refresh a Supabase session |
| POST | `/api/v1/auth/logout` | Revoke the current Supabase session |
| GET | `/api/v1/auth/me` | Verify the access token and return the user |
| GET | `/api/v1/dashboard` | Read the current user's roadmap and progress |
| PUT | `/api/v1/dashboard` | Save the current user's roadmap and progress |

The frontend calls FastAPI at `VITE_API_URL` (defaults to `http://127.0.0.1:8000`). Local Supabase Auth has email confirmations disabled in `supabase/config.toml`; hosted projects use their dashboard Auth settings.
