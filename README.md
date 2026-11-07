# KaushalSetu AI

An evidence-aware education and career exploration MVP for students and families. It brings a searchable course catalogue, example learning pathways, official source links, a skill reflection space, and a Gemini-powered counsellor (with a clearly disclosed rule-based demo when no API key is configured) into one responsive interface.

> AI answers are exploration guidance, not official verification, admissions advice, or an eligibility decision. Course examples and source links are starting points; confirm current requirements with the relevant institution or authority.

## Stack

- **Frontend:** React, TypeScript, Vite, custom responsive CSS
- **API:** Python, FastAPI, SQLAlchemy
- **Database:** SQLite by default for local setup; PostgreSQL supported

## Run locally

### 1. Start the API

Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to enable Gemini and live web research. You can create a key in [Google AI Studio](https://aistudio.google.com/apikey); check the current quota, availability, and billing terms for your account. Keep the key server-side in the backend `.env` only; never add it to frontend variables, source control, or chat. If the key is missing or Gemini rejects it, the counsellor returns clearly labelled, rule-based guided responses with catalogue examples; it never presents these as Gemini output. Live web research still reports a configuration/provider error rather than showing fabricated search results.

The course catalogue is still a small, locally seeded set of examples. Use the live research panels in Explore courses, Career pathways, Scholarships, and Evidence passport to search current web pages and see citations. Search queries are sent to Gemini and are not saved by this app; do not include sensitive personal information. Skill notes and confidence ratings are stored in the current browser for guests. When signed in with Google, the skill passport syncs to the account and can be accessed across devices; existing guest skills are merged into the account on sign-in.

If Gemini returns `PERMISSION_DENIED` because its API-key consumer or project is suspended, resolve the suspension in Google Cloud or create a key in an active project. Update `GEMINI_API_KEY` in the backend `.env` and restart FastAPI. Repeated retries with a key from the suspended project will not work.

Google sign-in uses an OAuth 2.0 authorization-code flow with PKCE, state, and nonce checks. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in the backend `.env`. Register the exact redirect URI in Google Cloud Console. The client secret stays on the backend; the browser receives only the public client ID. The backend verifies Google's ID token, stores the account, and keeps the sign-in token in an HttpOnly cookie. For production, use a custom domain for both frontend and API when possible (for example `app.example.com` and `api.example.com`) so browsers can share the secure session cookie reliably.

If a Google client secret has been exposed, revoke/rotate it in Google Cloud Console before configuring the new secret on the backend. Do not send OAuth secrets through chat or add them to Vercel frontend variables.

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
- `GEMINI_MODEL` — optional; defaults to `gemini-3.5-flash`
- `DATABASE_URL` — persistent PostgreSQL connection string for production
- `CORS_ORIGINS` — exact frontend origin(s), comma-separated (for example `https://your-project.vercel.app`)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — Google OAuth web client credentials (secret is backend-only)
- `GOOGLE_REDIRECT_URI` — exact registered frontend callback, such as `https://your-project.vercel.app/auth/callback`

In Vercel, set `VITE_API_BASE_URL` to the deployed backend origin (for example `https://your-api.example.com`, without an `/api` suffix), then redeploy the frontend. The backend health check is `/api/health`; it reports whether Gemini or demo mode is active without exposing the key. If the counsellor cannot connect, check that the backend is running, the Vercel URL is correct, and the frontend origin is included in `CORS_ORIGINS`.

For Google sign-in in production, also register the production callback URL in Google Cloud Console and set `GOOGLE_REDIRECT_URI` to that exact URL. Add your production frontend origin to `CORS_ORIGINS` so the HttpOnly session cookie can be used by the frontend.

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
- `POST /api/research/search` — current Google Search-grounded research with source links; requires the backend `GEMINI_API_KEY`
- `GET /api/me/skills` and `PUT /api/me/skills` — read and replace the signed-in user's skill passport; requires the Google session cookie

The UI shows API errors rather than silently presenting stale or invented course results. The catalogue is seeded with illustrative records and is not an authoritative eligibility or accreditation database.
