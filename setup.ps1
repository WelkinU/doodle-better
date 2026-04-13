# =============================================================================
#  Doodle Better — Environment Setup
#  Checks for and installs Python 3.11+, Node.js 18+, and uv if missing,
#  then installs all project dependencies and initialises the database.
#
#  Run via setup.bat — do not run this script directly with a restricted
#  execution policy.
# =============================================================================

Set-StrictMode -Version Latest
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# ── Helpers ──────────────────────────────────────────────────────────────────

function Write-Step($msg) {
    Write-Host ""
    Write-Host "=== $msg ===" -ForegroundColor Cyan
}

function Write-Ok($msg)   { Write-Host "  [OK]   $msg" -ForegroundColor Green  }
function Write-Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red    }

function Refresh-Path {
    # Reload PATH from registry so newly installed tools are visible in this session
    $machine = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $user    = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = ($machine, $user | Where-Object { $_ }) -join ";"
}

function Get-PythonCommand {
    # Prefer the Windows py launcher (most reliable on Windows), then python
    foreach ($cmd in @("py", "python")) {
        try {
            $ver = & $cmd --version 2>&1
            if ($ver -match "Python 3\.(\d+)") {
                if ([int]$Matches[1] -ge 11) { return $cmd }
            }
        } catch {}
    }
    return $null
}

# ── 1. Python 3.11+ ──────────────────────────────────────────────────────────

Write-Step "Checking Python 3.11+"

$pythonCmd = Get-PythonCommand

if ($pythonCmd) {
    $ver = & $pythonCmd --version 2>&1
    Write-Ok "$ver  (command: $pythonCmd)"
} else {
    Write-Warn "Python 3.11+ not found."
    Write-Warn "Installing via winget --scope user (no admin required; UAC may still appear once)."
    winget install --id Python.Python.3.11 --scope user --silent `
        --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "winget install failed (exit $LASTEXITCODE)."
        Write-Fail "Install Python 3.11+ manually from https://python.org then re-run setup."
        exit 1
    }
    Refresh-Path
    $pythonCmd = Get-PythonCommand
    if (-not $pythonCmd) {
        Write-Warn "Python was installed but is not yet on PATH in this session."
        Write-Warn "Please close and reopen the terminal, then run setup.bat again."
        exit 1
    }
    Write-Ok "Python installed."
}

# ── 2. Node.js 18+ (brings npm) ──────────────────────────────────────────────

Write-Step "Checking Node.js 18+"

$nodeOk = $false
try {
    $nodeVer = & node --version 2>&1
    if ($nodeVer -match "v(\d+)") {
        if ([int]$Matches[1] -ge 18) {
            $nodeOk = $true
            Write-Ok "Node.js $nodeVer"
        } else {
            Write-Warn "Node.js $nodeVer found but version 18+ is required."
        }
    }
} catch {}

if (-not $nodeOk) {
    Write-Warn "Node.js 18+ not found."
    Write-Warn "Installing via winget --scope user (no admin required; UAC may still appear once)."
    winget install --id OpenJS.NodeJS.LTS --scope user --silent `
        --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "winget install failed (exit $LASTEXITCODE)."
        Write-Fail "Install Node.js 18+ manually from https://nodejs.org then re-run setup."
        exit 1
    }
    Refresh-Path
    try {
        $nodeVer = & node --version 2>&1
        Write-Ok "Node.js $nodeVer installed."
    } catch {
        Write-Warn "Node.js was installed but is not yet on PATH in this session."
        Write-Warn "Please close and reopen the terminal, then run setup.bat again."
        exit 1
    }
}

# ── 3. uv ────────────────────────────────────────────────────────────────────

Write-Step "Checking uv"

$uvOk = $false
try {
    $uvVer = & uv --version 2>&1
    if ($uvVer -match "uv") {
        $uvOk = $true
        Write-Ok "$uvVer"
    }
} catch {}

if (-not $uvOk) {
    Write-Warn "uv not found. Installing via pip --user (no admin required)."
    & $pythonCmd -m pip install --user uv --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "pip install uv failed. Check your Python/pip setup."
        exit 1
    }
    Refresh-Path
    # pip --user installs to a Scripts dir that may not be on PATH yet
    $uvUserScript = & $pythonCmd -c "import sysconfig; print(sysconfig.get_path('scripts', 'nt_user'))" 2>&1
    if ($uvUserScript -and (Test-Path "$uvUserScript\uv.exe")) {
        $env:Path = "$uvUserScript;$env:Path"
    }
    try {
        $uvVer = & uv --version 2>&1
        $uvOk = $true
        Write-Ok "uv installed: $uvVer"
    } catch {
        Write-Warn "uv was installed but could not be located on PATH."
        Write-Warn "Will fall back to pip + venv for Python dependencies."
    }
}

# ── 4. Python dependencies ───────────────────────────────────────────────────

Write-Step "Installing Python dependencies"

if ($uvOk) {
    Write-Host "  Using uv sync..."
    uv sync
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "uv sync failed."
        exit 1
    }
} else {
    Write-Host "  Using pip + venv fallback..."
    if (-not (Test-Path ".venv")) {
        & $pythonCmd -m venv .venv
        if ($LASTEXITCODE -ne 0) { Write-Fail "venv creation failed."; exit 1 }
    }
    & .venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
    if ($LASTEXITCODE -ne 0) { Write-Fail "pip install failed."; exit 1 }
}

Write-Ok "Python dependencies ready."

# ── 5. data/ directory ───────────────────────────────────────────────────────

Write-Step "Checking data directory"

if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" | Out-Null
    Write-Ok "Created data/"
} else {
    Write-Ok "data/ already exists."
}

# ── 6. Database migrations ───────────────────────────────────────────────────

Write-Step "Applying database migrations"

if ($uvOk) {
    uv run alembic upgrade head
} else {
    & .venv\Scripts\alembic.exe upgrade head
}

if ($LASTEXITCODE -ne 0) {
    Write-Fail "alembic upgrade head failed."
    exit 1
}

Write-Ok "Database schema is up to date."

# ── 7. Frontend dependencies ─────────────────────────────────────────────────

Write-Step "Installing frontend dependencies"

Set-Location "$ScriptDir\frontend"
npm install
if ($LASTEXITCODE -ne 0) {
    Set-Location $ScriptDir
    Write-Fail "npm install failed."
    exit 1
}
Set-Location $ScriptDir

Write-Ok "Frontend dependencies installed."

# ── Done ─────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Setup complete! Run start.bat to launch." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
