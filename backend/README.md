# MySpace Dashboard API

Minimal FastAPI backend for the dashboard roadmap response. It uses SQLAlchemy and SQLite by default.

## Run locally (PowerShell)

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

The API docs are at `http://127.0.0.1:8000/docs` and the health check is `/health`.

## Authentication

Set `JWT_SECRET_KEY` in `.env` to a private random value before starting the API. The key is used to sign HS256 access tokens and is never returned by the API.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Create an account and return a bearer token |
| POST | `/api/v1/auth/login` | Verify credentials and return a bearer token |
| GET | `/api/v1/auth/me` | Return the authenticated account |
| GET | `/api/v1/dashboard` | Return only the authenticated user's roadmap and progress |

Send protected requests with `Authorization: Bearer <access_token>`. Passwords are stored as Argon2 hashes. Each roadmap has a `user_id` foreign key to `users.id`; dashboard queries always filter on the verified token's user. Existing local roadmap rows are retained with a null owner during SQLite startup migration and are not exposed to authenticated accounts.

## Dashboard endpoint

`GET /api/v1/dashboard` returns the frontend shape:

```json
{
  "roadmap": {
    "title": "",
    "stages": []
  },
  "progress": {}
}
```

The dashboard and authentication routes, response schemas, user/roadmap database models, and database setup are kept under `app/`. Other feature routes and models have been removed for now.

## Supabase SQL

The roadmap tables and `save_roadmap` function are preserved at `supabase/migrations/202610120001_myspace_schema.sql`. Run it once in your Supabase project's SQL Editor to create those Supabase objects. The local FastAPI app currently uses SQLite; the SQL migration is for the separate Supabase database.
