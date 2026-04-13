# Doodle Better 🐐

Quick vibe coded, frictionless weekly availability polling webapp for coordinating sports pickup games and events. Think Doodle, but better — no logins, no friction, just vibes. 

## Features

- **Weekly polls** for recurring events (Ultimate Frisbee, Soccer, Video Games, etc.)
- **Doodle-style voting**: In / Tentative / Out with color-coded results
- **No login required** — just enter a username and start voting
- **Dark mode** 🌙
- **Poll history** — settle those "who came last week" debates
- **Admin panel** — create, edit, delete events (IP-restricted)
- **Auto-reset** — polls regenerate each week from recurring templates
- **Share link** — one-click copy for Teams/Slack

## Tech Stack

- **Backend**: Python, FastAPI, SQLite, SQLAlchemy, Alembic
- **Frontend**: React 19, TypeScript, Vite
- **Deployment**: Single process — FastAPI serves the built React app

---

## Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- (Optional) [uv](https://docs.astral.sh/uv/) for fast Python package management

### 1. Install Python dependencies

**Using uv (recommended):**
```bash
uv sync
```

**Using pip:**
```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 2. Build & Run (one step)

```bash
start.bat
```

This will:
1. Install frontend npm packages and build the React app
2. Start the FastAPI server

The app will be available at **http://localhost:8000** (or whatever is configured).

### Subsequent runs (skip frontend build)

```bash
start_server_only.bat
```

### Development mode (hot-reload frontend)

Terminal 1 — Backend:
```bash
python run.py
```

Terminal 2 — Frontend (with hot reload):
```bash
cd frontend
npm install
npm run dev
```

The Vite dev server will proxy API requests to the backend automatically.

---

## Configuration

All config lives in **`config.yaml`** at the project root:

| Setting | Description | Default |
|---|---|---|
| `server.host` | Hostname. Use `"auto"` to bind to machine's IPv4 | `"localhost"` |
| `server.port` | Server port | `8000` |
| `database.path` | SQLite DB file path | `data/doodle_better.db` |
| `timezone.tz` | IANA timezone for poll scheduling | `America/New_York` |
| `polls.weekly_reset_day` | Day polls reset | `Sunday` |
| `polls.weekly_reset_hour` | Hour polls reset (24h) | `12` |
| `admin.ip_allowlist` | IPs allowed admin access | `["127.0.0.1", "::1", "localhost"]` |
| `blacklists.ip_blacklist` | Blocked IPs | `[]` |
| `blacklists.username_blacklist` | Blocked usernames | `[]` |
| `frontend.dev_port` | Vite dev server port | `5173` |

### Deploying on intranet

Set `server.host` to `"auto"` in config.yaml — the server will bind to the machine's IPv4 address, making it discoverable on your network.

---

## Database & Migrations

The app uses SQLite. The database file is created automatically on first run at the configured path.

**Alembic** is set up for schema migrations:

```bash
# Generate a migration after changing models
alembic revision --autogenerate -m "describe your change"

# Apply migrations
alembic upgrade head
```

---

## Windows Task Scheduler (Auto-restart)

To keep the server running and auto-restart on reboot:

1. Open **Task Scheduler** → Create Basic Task
2. **Trigger**: "When the computer starts"
3. **Action**: Start a program
   - Program: `python.exe` (or full path to your venv python)
   - Arguments: `run.py`
   - Start in: `C:\dev\doodle-better` (your project path)
4. In Properties → check "Run whether user is logged on or not"
5. Settings → check "If the task fails, restart every 1 minute"

---

## Project Structure

```
doodle-better/
├── config.yaml              # All config in one place
├── run.py                    # Entry point
├── start.bat                 # One-step build + run
├── start_server_only.bat     # Run without rebuilding frontend
├── requirements.txt          # pip dependencies
├── pyproject.toml             # uv / PEP 621 project metadata
├── alembic.ini               # Alembic config
├── alembic/                  # DB migration scripts
├── backend/
│   ├── main.py               # FastAPI app, static file serving
│   ├── config.py              # YAML config loader
│   ├── database.py            # SQLAlchemy engine & session
│   ├── models.py              # ORM models (User, EventTemplate, Poll, Vote)
│   ├── schemas.py             # Pydantic request/response models
│   ├── routes.py              # API endpoints
│   ├── poll_service.py        # Poll generation & week logic
│   └── seed.py                # Default event template seeding
├── frontend/
│   ├── package.json
│   ├── vite.config.ts         # Reads config.yaml for proxy/port
│   ├── public/goat.svg        # 🐐 favicon
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css           # All styles, dark mode CSS vars
│       ├── api.ts              # API client
│       ├── types.ts            # TypeScript interfaces
│       ├── context/            # React context (theme, user)
│       ├── components/         # Layout, PollCard, UserBar, ErrorBoundary
│       └── pages/              # HomePage, HistoryPage, AdminPage
└── data/                      # SQLite database (gitignored)
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users` | Register / update user |
| PUT | `/api/users/:id` | Update username |
| GET | `/api/polls/week` | Current week's polls |
| GET | `/api/polls/week/:date` | Specific week's polls |
| GET | `/api/polls/weeks` | List all available weeks |
| POST | `/api/polls/:id/vote` | Cast or update a vote |
| DELETE | `/api/polls/:id/vote/:userId` | Remove a vote |
| GET | `/api/admin/templates` | List event templates (admin) |
| POST | `/api/admin/templates` | Create template (admin) |
| PUT | `/api/admin/templates/:id` | Update template (admin) |
| DELETE | `/api/admin/templates/:id` | Delete template (admin) |

---

*Made with 🐐 energy*
