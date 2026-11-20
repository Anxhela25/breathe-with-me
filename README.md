# Breathe With Me

Calm support for panic moments. **A support tool, not a treatment.**

> **Prototype.** Please use made-up data, and don't rely on it in a real crisis. The safety
> wording and crisis rules still need review by a clinician.

- `frontend/` React + Vite + Tailwind CSS, wrapped as an iPhone app with Capacitor
- `backend/` Python (FastAPI + SQLAlchemy) + PostgreSQL

## Project pages

- [Screens](https://anxhela25.github.io/breathe-with-me/): every screen of the app and where its buttons lead
- [How it works](https://anxhela25.github.io/breathe-with-me/flow.html): flow charts of the app's logic
- [Technology and decisions](https://anxhela25.github.io/breathe-with-me/decisions.html): what we used, why, and the references

The pages are in the `pages/` folder. GitHub publishes them again whenever something in it changes.

## What you need

These steps are for a Mac with [Homebrew](https://brew.sh).

| Tool | Version | Install |
|---|---|---|
| Python | 3.12 or newer | `brew install python` |
| Node.js | 22 or newer (Capacitor needs it) | `brew install node` |
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
| `BREVO_API_KEY` and `BREVO_SENDER` (free at [brevo.com](https://www.brevo.com)) | Sends sign-up and password reset codes by email. Used first when set | Codes are printed in the backend terminal |
| `GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD` | Same, through Gmail. Used when Brevo isn't set | Codes are printed in the backend terminal |
| `RESEND_API_KEY` (and `EMAIL_FROM`) | Same, through [Resend](https://resend.com). Used when neither of the above is set | Codes are printed in the backend terminal |
| `SENTRY_DSN` (free at [sentry.io](https://sentry.io)) | Emails you when the backend crashes or logs an error. Nothing personal is sent | Errors only show in the backend terminal |

For Gmail, use an **App Password**, not your normal password. Turn on 2-Step Verification in your
Google account, then create one at https://myaccount.google.com/apppasswords.

Leave `SENTRY_DSN` empty on your Mac, so errors from testing don't fill up Sentry. Set it only on
Render. The tests never send anything to Sentry.

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

## Put it online for a presentation (free)

With the backend on your Mac, the app only works on your home Wi-Fi while the Mac is on. To show it
anywhere, put the backend online. Everything below is free:

| Part | Service | Free plan limit |
|---|---|---|
| Backend | [Render](https://render.com) | Sleeps after 15 minutes without use; waking up takes up to a minute |
| Database | [Neon](https://neon.tech) | About 0.5 GB, plenty for this app |
| Emails (sign-up codes) | [Brevo](https://www.brevo.com) | 300 emails a day. Gmail can't be used: Render's free plan blocks it |

### 1. Database (Neon)
1. Sign up at neon.tech and create a project. Choose the region **Europe Central (Frankfurt)**.
2. Open **Connect**, turn **Connection pooling off**, and copy the connection string
   (`postgresql://...neon.tech/neondb?sslmode=require`). The app adds the driver part itself.

### 2. Emails (Brevo)
1. Sign up at brevo.com.
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender** with your own Gmail address, and
   confirm it from the email Brevo sends you.
3. **SMTP & API → API Keys → Generate a new API key**, and copy it.

### 3. Backend (Render)
1. Push the code to GitHub: `git push origin main`.
2. Sign up at render.com with your GitHub account.
3. **New → Blueprint**, choose the `breathe-with-me` repository. Render reads `render.yaml`.
4. Fill in the values it asks for:
   - `DATABASE_URL`: the Neon connection string
   - `GROQ_API_KEY`, `GEMINI_API_KEY`: the same keys as in your `backend/.env`
   - `BREVO_API_KEY`: the Brevo key
   - `BREVO_SENDER`: the Gmail address you confirmed in Brevo
   - `SENTRY_DSN` (optional): the DSN of your Sentry project for the backend
5. Click **Apply** and wait for the deploy to finish (a few minutes). The tables are created
   automatically.
6. Open `https://<your-service>.onrender.com/api/health` in a browser. It should show `{"status":"ok"}`.
   Render shows the exact address at the top of the service page.

### 4. Point the iPhone app to it
Change `frontend/.env.production.local` to the Render address (https, no port):
```
VITE_API_URL=https://breathe-with-me-api.onrender.com
VITE_SENTRY_DSN=https://...ingest.de.sentry.io/...   # optional: errors from the app, from your Sentry React project
```
Then run `npm run ios` in `frontend/` and press **Run** (▶) in Xcode. The app now works on any
Wi-Fi or mobile data, with your Mac off.

### On the day of the presentation
- **Reinstall the app the day before** if you use a free Apple ID (it stops opening after 7 days).
- **A few minutes before you start, open the `/api/health` address** in a browser, so the backend
  is awake and the first screen doesn't wait a minute.
- The online database starts empty. Create an account in the app and record a few episodes before
  you present, so history and patterns have something to show.
- Problems? Render's **Logs** tab shows every failed request and why.

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
| No sign-up code arrives | Without an email provider set up, look for the code in the backend terminal (on Render: the Logs tab). Otherwise check the spam folder. |

## Progress

- [x] Part 1: project setup, database, safety check, accounts and episodes API, screens Home /
      Breathing / Grounding / Check-in / Closing / Urgent help
- [x] Part 2: login and sign-up (with an email code), sessions saved to the backend, quick questions
- [x] Part 3: chat with AI (Groq, Gemini, fallback), rule-based and AI crisis checks, reply check
- [x] Part 4: calm check (camera and flash on the iPhone)
- [x] Part 5: history, insights, doctor summary as a PDF
- [x] Part 6: online on free plans (Render, Neon, Brevo) and error reports with Sentry
