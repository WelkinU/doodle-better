# Doodle Better 🐐

Frictionless weekly availability polling for coordinating pickup games and events. Think Doodle, but better — no logins, no friction, just vibes. Intended to be absolute minimum friction to use, and intended to be deployed with trusted users only (aka. intranet), trolls can find their way in!

## Features

- **Weekly polls** for recurring events (Ultimate Frisbee, Soccer, Video Games, etc.)
- **Doodle-style voting**: In / Tentative / Out with color-coded results
- **No login required** — just enter a username and start voting
- **Dark mode** 🌙
- **Poll history** — settle those "who came last week" debates
- **Admin panel** — create, edit, delete events (IP-restricted)
- **Auto-reset** — polls regenerate each week from recurring templates
- **Share link** — one-click copy for Teams/Slack

---

## Quick Start

### Option A: Setup Script (recommended)

Run the setup script to install dependencies and configure everything automatically:

```powershell
.\setup.ps1
```

> **Note:** If the script gets stuck on Node.js installation, it may be due to `winget` not being available. In that case, [install Node.js manually](https://nodejs.org/) (requires admin), then re-run the script.

### Option B: Manual Setup

#### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- (Optional) [uv](https://docs.astral.sh/uv/) for fast Python package management

#### 1. Install Python dependencies

**Using uv (recommended):**
```bash
uv sync
```

**Using pip:**
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Build & Run

```bash
start.bat
```

This installs frontend packages, builds the React app, and starts the FastAPI server. The app will be available at **http://localhost:8000**.

### Subsequent runs (skip frontend rebuild)

```bash
start_server_only.bat
```

---

## Windows Task Scheduler (Auto-restart on reboot)

1. Open **Task Scheduler** → Create Basic Task
2. **Trigger**: "When the computer starts"
3. **Action**: Start a program
   - Program: `python.exe` (or full path to your venv python)
   - Arguments: `run.py`
   - Start in: `C:\dev\doodle-better` (your project path)
4. In Properties → check "Run whether user is logged on or not"
5. Settings → check "If the task fails, restart every 1 minute"

---

## Technical Details

### Tech Stack

- **Backend**: Python, FastAPI, SQLite, SQLAlchemy, Alembic
- **Frontend**: React 19, TypeScript, Vite
- **Deployment**: Single process — FastAPI serves the built React app

### Configuration

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

Set `server.host` to `"auto"` to bind to the machine's IPv4 address for intranet access.

### Development Mode (hot-reload frontend)

Terminal 1 — Backend:
```bash
python run.py
```

Terminal 2 — Frontend:
```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies API requests to the backend automatically.

### Database & Migrations

The SQLite database is created automatically on first run. Schema migrations use Alembic:

```bash
# Generate a migration after changing models
alembic revision --autogenerate -m "describe your change"

# Apply migrations
alembic upgrade head
```

---

*Made with 🐐 energy*
