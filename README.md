# KaushalSetu AI

An evidence-aware education and career exploration MVP for students and families. It brings a searchable course catalogue, example learning pathways, official source links, a skill reflection space, and a Gemini-powered counsellor (with a clearly disclosed rule-based demo when no API key is configured) into one responsive interface.

> AI answers are exploration guidance, not official verification, admissions advice, or an eligibility decision. Course examples and source links are starting points; confirm current requirements with the relevant institution or authority.

## Stack

- **Frontend:** React, TypeScript, Vite, custom responsive CSS
- **API:** Python, FastAPI, SQLAlchemy
- **Database:** SQLite by default for local setup; PostgreSQL supported

## Run locally

### 1. Start the API

Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to enable Gemini. Keep it server-side; never add it to frontend variables or source control. Without a key, the counsellor uses the clearly labeled demo responses.

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.app.main:app --reload
```

The API creates the tables and seeds example courses on first startup. Open `http://localhost:8000/docs` to explore the API.

### 2. Start the frontend

In a second terminal at the project root:

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

## Deploy frontend and backend

Vercel hosts the Vite frontend; it does not start this FastAPI application automatically. Deploy the FastAPI app to a Python host (for example Render, Railway, or a separately configured server) and set these backend environment variables there:

- `GEMINI_API_KEY` — secret Gemini API key
- `GEMINI_MODEL` — optional; defaults to `gemini-2.5-flash`
- `DATABASE_URL` — persistent PostgreSQL connection string for production
- `CORS_ORIGINS` — exact frontend origin(s), comma-separated (for example `https://your-project.vercel.app`)

In Vercel, set `VITE_API_BASE_URL` to the deployed backend origin (for example `https://your-api.example.com`, without an `/api` suffix), then redeploy the frontend. The backend health check is `/api/health`; it reports whether Gemini or demo mode is active without exposing the key. If the counsellor cannot connect, check that the backend is running, the Vercel URL is correct, and the frontend origin is included in `CORS_ORIGINS`.

## PostgreSQL

Copy `.env.example` to `.env` and set `DATABASE_URL` to a PostgreSQL connection string. For example:

```text
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/kaushalsetu
```

If Docker is available, `docker compose up -d db` starts the PostgreSQL service defined in `docker-compose.yml`. The API reads `DATABASE_URL` from its environment; load `.env` in your shell or configure it in your deployment environment before starting the API.

## API

- `GET /api/health` — health check
- `GET /api/courses?search=&category=` — searchable course catalogue
- `POST /api/counsellor/chat` — Gemini-backed guidance when configured; otherwise demo guidance; saves the conversation and messages

The UI shows API errors rather than silently presenting stale or invented course results. The catalogue is seeded with illustrative records and is not an authoritative eligibility or accreditation database.
