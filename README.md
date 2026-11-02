# KaushalSetu AI

An evidence-aware education and career exploration MVP for students and families. It brings a searchable course catalogue, example learning pathways, official source links, a skill reflection space, and a transparent guided-counsellor demo into one responsive interface.

> The counsellor is rule-based demo guidance, not a live AI or eligibility checker. Course examples and source links are starting points; confirm current requirements with the relevant official authority or institution.

## Stack

- **Frontend:** React, TypeScript, Vite, custom responsive CSS
- **API:** Python, FastAPI, SQLAlchemy
- **Database:** SQLite by default for local setup; PostgreSQL supported

## Run locally

### 1. Start the API

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

## PostgreSQL

Copy `.env.example` to `.env` and set `DATABASE_URL` to a PostgreSQL connection string. For example:

```text
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/kaushalsetu
```

If Docker is available, `docker compose up -d db` starts the PostgreSQL service defined in `docker-compose.yml`. The API reads `DATABASE_URL` from its environment; load `.env` in your shell or configure it in your deployment environment before starting the API.

## API

- `GET /api/health` — health check
- `GET /api/courses?search=&category=` — searchable course catalogue
- `POST /api/counsellor/chat` — transparent guided-demo response; saves the conversation and messages

The UI shows API errors rather than silently presenting stale or invented course results. The catalogue is seeded with illustrative records and is not an authoritative eligibility or accreditation database.
