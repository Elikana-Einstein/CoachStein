# MySpace FastAPI API

FastAPI is the application API. Supabase Auth issues user sessions, Postgres stores roadmap data, and the SQL files in the repository's root `supabase/` folder manage database schema changes.

## Configure Supabase

1. Install Docker Desktop and the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. From the repository root, run `supabase start` to start the local Supabase stack and apply migrations.
3. Run `supabase status -o env` and copy `API_URL` and `ANON_KEY` into `backend/.env` as `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. For a hosted Supabase project, run `supabase login`, `supabase link --project-ref <project-ref>`, then `supabase db push` from the repository root to apply committed migrations.

If you already ran this schema manually in the SQL Editor, compare the tables, policies, and function with the migration first. If they match, record the existing migration as applied with `supabase migration repair 202610120001 --status applied` before using `supabase db push`; otherwise the CLI will try to create the existing tables again. The CLI uses migration history to decide what to apply. [Migration repair docs](https://supabase.com/docs/reference/cli/supabase-migration-repair)

The checked-in migrations create the active roadmap tables and the `saved_guidelines` table. Each saved guideline stores its stages and independent progress snapshot; row-level security limits it to its owner. The API forwards the signed-in user's Supabase access token on every database request, so Postgres RLS remains active. It does not use a service-role key.

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
| GET | `/api/v1/dashboard/guidelines` | List the user's saved guidelines and their progress |
| PUT | `/api/v1/dashboard/guidelines/{id}` | Create or update one saved guideline |

The frontend calls FastAPI at `VITE_API_URL` (defaults to `http://127.0.0.1:8000`). Local Supabase Auth has email confirmations disabled in `supabase/config.toml`; hosted projects use their dashboard Auth settings.

## Deploy the API to Render

The repository root contains `render.yaml`, which configures a Python web service using `backend/` as its root, starts Uvicorn on Render's assigned port, and checks `/health`.

1. Push the repository, including `render.yaml`, to GitHub.
2. In Render, choose **New → Blueprint**, connect this repository, and deploy the `myspace-api` service from `render.yaml`.
3. When prompted, set `SUPABASE_URL` to the Supabase project URL and `SUPABASE_ANON_KEY` to its publishable/anon key. Do not use or expose the service-role key.
4. After Render deploys, open `https://<service-name>.onrender.com/health`; it should return `{"status":"ok"}`.
5. Set `CORS_ORIGINS` in the Render service environment to a JSON array containing the exact frontend origin(s), for example `["https://your-frontend.example"]`. The checked-in `render.yaml` includes the current Vercel deployment origin; replace it if your Vercel domain changes. Include localhost origins only if you still use the local frontend. Save and redeploy.
6. Set the frontend build environment variable `VITE_API_URL` to `https://<service-name>.onrender.com`, then rebuild/redeploy the frontend.

The API uses each signed-in user's Supabase access token for database requests, so Supabase Row Level Security remains active. Keep secrets in Render's environment settings, never in Git.

Apply new database migrations from the repository root with `supabase db push` after linking the project. The saved-guidelines table is created by `202610130001_saved_guidelines.sql`; it does not remove or rewrite the existing active roadmap tables.

## CoachStein AI

The authenticated AI routes use Google's Gemini `generateContent` API with JSON-schema constrained output:

- `POST /api/v1/ai/guidelines` generates a Markdown learning roadmap from a learning goal. The output follows the parser format in `frontend/src/data/roadmap.ts` and can be reviewed/imported in Planner.
- `POST /api/v1/ai/progress-analysis` analyzes the submitted signed-in user's roadmap snapshot. Completion percentages are calculated by the API; AI provides strengths, focused recommendations, and a weekly action.

Set `GEMINI_API_KEY` in Render's service environment (or `backend/.env` locally). Create the key in Google AI Studio and keep it server-side and private; never put it in the frontend. `GEMINI_MODEL` defaults to `gemini-3.8-flash` and can be changed to a model enabled for your key. Gemini API usage may incur charges or quota limits under your Google AI account.
