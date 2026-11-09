# Breathe With Me

Calm support for panic moments. **A support tool, not a treatment.**

- `frontend/` React + Vite + Tailwind CSS
- `backend/` Python (FastAPI + SQLAlchemy) + PostgreSQL

## Run it

```bash
# 1. Backend (terminal 1)
cd backend
cp .env.example .env            # first time only, then edit the values
source .venv/bin/activate       # first time: python3 -m venv .venv && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001   # http://localhost:8001/docs

# 2. Frontend (terminal 2)
cd frontend
npm install                     # first time only
npm run dev                     # http://localhost:5173
```

Databases (first time only): `createdb breathe_with_me` and `createdb breathe_with_me_test`.

## Tests

```bash
cd backend && source .venv/bin/activate && pytest
```

## Progress

- [x] Part 1: project setup, database classes, safety check, accounts API, episodes API,
      screens Home / Breathing (states A-E) / Grounding / Check-in / Closing / Urgent help
- [ ] Part 2: login screens in React, save sessions to the backend, quick questions
- [ ] Part 3: Chat + AI layer (Groq, Gemini, fallback, reply check)
- [ ] Part 4: Calm check (camera test first, see plan 5.10)
- [ ] Part 5: History and Insights, Docker, deployment
