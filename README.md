# Breathe With Me

Calm support for panic moments. **A support tool, not a treatment.**

> **Prototype.** Please use made-up data, and don't rely on it in a real crisis. The safety
> wording and crisis rules still need review by a clinician.

- `frontend/` React + Vite + Tailwind CSS, wrapped as an iPhone app with Capacitor
- `backend/` Python (FastAPI + SQLAlchemy) + PostgreSQL

## What you need

These steps are for a Mac with [Homebrew](https://brew.sh).

| Tool | Version | Install |
|---|---|---|
| Python | 3.12 or newer | `brew install python` |
| Node.js | 20 or newer | `brew install node` |
| PostgreSQL | 15 or newer | `brew install postgresql@16 && brew services start postgresql@16` |
| Xcode | only for the iPhone app | App Store |

## Run it in the browser

### 1. Get the code and create the databases (first time only)

```bash
git clone https://github.com/Anxhela25/breathe-with-me.git
cd breathe-with-me
createdb breathe_with_me
createdb breathe_with_me_test   # only needed for the tests
```

### 2. Set up the backend (first time only)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Open `backend/.env` and change two lines:

- `DATABASE_URL`: replace `YOUR_MAC_USER` with your Mac user name (run `whoami` to see it).
- `JWT_SECRET`: put any long random text. To make one, run
  `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`.

Everything else in `.env` is optional. See [Optional keys](#optional-keys).

Then create the tables:

```bash
alembic upgrade head
```

### 3. Start the backend (terminal 1)

```bash
cd backend
source .venv/bin/activate     # you should see (.venv) in the prompt
uvicorn app.main:app --reload --port 8001
```

Wait for `Application startup complete.` The API docs are at http://localhost:8001/docs.

### 4. Start the frontend (terminal 2)

```bash
cd frontend
npm install                   # first time only
npm run dev
```

Open **http://localhost:5173**.

### 5. Create an account

Sign-up asks for a 6-digit code sent by email. **If you didn't set up Gmail, the email is not sent.**
Instead, the code is printed in the **backend terminal** (look for `Email not sent`). The forgot-password
code works the same way.

## Optional keys

The app works without these. Each one switches on a feature. All of them go in `backend/.env`.

| Setting | What it does | Without it |
|---|---|---|
| `GROQ_API_KEY` (free at [console.groq.com](https://console.groq.com)) and/or `GEMINI_API_KEY` (free at [aistudio.google.com](https://aistudio.google.com)) | AI replies in the chat, and the AI safety check | The chat answers with a fixed calm message. The rule-based crisis check still works. |
| `GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD` | Sends sign-up and password reset codes by email | Codes are printed in the backend terminal |

For Gmail, use an **App Password**, not your normal password. Turn on 2-Step Verification in your
Google account, then create one at https://myaccount.google.com/apppasswords.

Restart the backend after you change `.env`.

## Run it on an iPhone (optional)

You need a Mac with Xcode, an iPhone and a cable. A free Apple ID is enough. The phone and the Mac
must be on the same Wi-Fi, and the backend runs on your Mac.

1. **Start the backend so the phone can reach it.** Add `--host 0.0.0.0`:
   ```bash
   uvicorn app.main:app --reload --port 8001 --host 0.0.0.0
   ```
2. **Tell the app where the backend is.** Find your Mac's Wi-Fi address:
   ```bash
   ipconfig getifaddr en0
   ```
   Then create `frontend/.env.production.local` with that address (this file is not in git):
   ```
   VITE_API_URL=http://192.168.1.20:8001
   ```
3. **Build and open Xcode:**
   ```bash
   cd frontend
   npm run ios
   ```
4. **Sign with your own Apple ID.** In Xcode, select **App** in the left sidebar, open the
   **Signing & Capabilities** tab, and choose your own **Team**. If Xcode says the bundle identifier
   is not available, change `com.breathewithme.app` to something unique, for example
   `com.yourname.breathewithme`.
5. **Install.** Connect the iPhone, select it at the top of Xcode, and press **Run** (▶).

The first time you open the app:
- If the iPhone says **"Untrusted Developer"**, go to Settings → General → VPN & Device Management and trust your Apple ID.
- When iOS asks to **find devices on your local network**, tap **Allow**. Without it, the app can't reach the backend.

With a free Apple ID, the app stops opening after 7 days. Press Run in Xcode again to reinstall it.
If your Mac's Wi-Fi address changes, update `.env.production.local` and run `npm run ios` again.

## Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

The tests use the `breathe_with_me_test` database. They never send real emails or call a real AI.

## Common problems

| Problem | Fix |
|---|---|
| `No module named 'psycopg'` (or another module) | The virtual environment isn't active. Run `source .venv/bin/activate` in `backend/`. |
| `connection refused` or `database "breathe_with_me" does not exist` | Start PostgreSQL (`brew services start postgresql@16`) and run the `createdb` commands. |
| `relation ... does not exist` | Run `alembic upgrade head` in `backend/`. Do this again after pulling new code. |
| "Can't reach the server" in the app | Check that the backend is running. On the iPhone, also check the Wi-Fi address and the local network permission. |
| No sign-up code arrives | Without Gmail set up, look for the code in the backend terminal. With Gmail, check the spam folder. |

## Progress

- [x] Part 1: project setup, database, safety check, accounts and episodes API, screens Home /
      Breathing / Grounding / Check-in / Closing / Urgent help
- [x] Part 2: login and sign-up (with an email code), sessions saved to the backend, quick questions
- [x] Part 3: chat with AI (Groq, Gemini, fallback), rule-based and AI crisis checks, reply check
- [ ] Part 4: calm check (camera test first)
- [x] Part 5: history, insights, doctor summary as a PDF
- [ ] Part 6: Docker and deployment
