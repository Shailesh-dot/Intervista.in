# ==========================================================================
#   INTERVISTA AI ASSESSMENT PLATFORM  -  MASTER STARTUP SCRIPT (PowerShell)
#   Run from anywhere:  powershell -ExecutionPolicy Bypass -File start.ps1
#   Or inside PS:       .\start.ps1
# ==========================================================================
#   Starts 13 services in separate windows:
#     1.  User Mail & Verification Server  -> Port 5000  (Node.js)
#     2.  Company Mail Server              -> Port 5001  (Node.js)
#     3.  Frontend React App               -> Port 5173  (Vite)
#     4.  Aptitude Module                  -> Port 5002  (Flask / Python)
#     5.  Coding Module                    -> Port 8000  (FastAPI / uvicorn)
#     6.  AI Interview Module              -> Port 8001  (FastAPI / uvicorn)
#     7.  Communication / Verbal Module    -> Port 8002  (FastAPI / uvicorn)
#     8.  Data Service                     -> Port 5003  (Node.js)
#     9.  Face Verification Proctor        -> Port 8004  (Python)
#    10.  Live Monitor Proctor             -> Port 8005  (Python)
#    11.  User API (.NET / C#)             -> Port 5280  (ASP.NET Core)
#    12.  Company API (.NET / C#)          -> Port 5158  (ASP.NET Core)
#    13.  Transaction API (.NET / C#)      -> Port 5017  (ASP.NET Core)
# ==========================================================================

# -- Allow running scripts (only needed once per machine) -----------------
# If you get a permissions error run this first:
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# -- Colour helpers --------------------------------------------------------
function Write-Header($msg) {
    Write-Host ""
    Write-Host "  $msg" -ForegroundColor Cyan -BackgroundColor Black
}
function Write-Ok($msg)   { Write-Host "  [OK]   $msg" -ForegroundColor Green  }
function Write-Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  [ERR]  $msg" -ForegroundColor Red    }
function Write-Info($msg) { Write-Host "  [INFO] $msg" -ForegroundColor Cyan   }

# Force-kills any process on the port, then returns $true so the service always starts fresh
function Test-PortFree([int]$Port) {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            $ownerPid = $conn.OwningProcess
            Write-Warn "Port $Port in use by PID $ownerPid -- force-killing..."
            Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
            & taskkill /PID $ownerPid /F 2>&1 | Out-Null
        }
        Start-Sleep -Milliseconds 800
        $still = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($still) {
            Write-Warn "Port $Port still in use after kill -- service may conflict (WSL process?)"
        } else {
            Write-Ok "Port $Port cleared"
        }
    }
    return $true
}

# -- Banner ----------------------------------------------------------------
Write-Host ""
Write-Host "  +----------------------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |        INTERVISTA AI ASSESSMENT PLATFORM RUNNER         |" -ForegroundColor Cyan
Write-Host "  +----------------------------------------------------------+" -ForegroundColor Cyan
Write-Host ""

# -- Resolve project root (the folder containing this script) -------------
$PROJECT_ROOT  = Split-Path -Parent $MyInvocation.MyCommand.Path
$FRONTEND_DIR  = Join-Path $PROJECT_ROOT "Ai-interview-platform"
$BACKEND_DIR   = Join-Path $PROJECT_ROOT "Backend"
$LOGS_DIR      = Join-Path $PROJECT_ROOT "logs"

Write-Info "Project root : $PROJECT_ROOT"

# -- Create logs directory -------------------------------------------------
if (-not (Test-Path $LOGS_DIR)) {
    New-Item -ItemType Directory -Path $LOGS_DIR | Out-Null
}
Write-Info "Log files    : $LOGS_DIR\"

# -- Load .env from root and frontend (export as process-level env vars) --
$rootEnvFile = Join-Path $PROJECT_ROOT ".env"
if (Test-Path $rootEnvFile) {
    Write-Info "Loading env vars from .env ..."
    Get-Content $rootEnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split "=", 2
            if ($parts.Count -eq 2) {
                [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
            }
        }
    }
}

$frontendEnvFile = Join-Path $FRONTEND_DIR ".env"
if (Test-Path $frontendEnvFile) {
    Write-Info "Loading env vars from Ai-interview-platform\.env ..."
    Get-Content $frontendEnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split "=", 2
            if ($parts.Count -eq 2) {
                [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
            }
        }
    }
    Write-Ok "Environment variables loaded."
}

# -- Track started processes -----------------------------------------------
$script:StartedProcesses = @()   # array of [psobject] { Name, Process }

# ==========================================================================
# FUNCTION: Start-Service
#   Opens a NEW console window for the service so output is visible live.
#   Also tees output to a log file.
#   Parameters:
#     -Name       Display name shown in the title bar and log file name
#     -WorkDir    Directory to cd into before running the command
#     -Command    The executable (node, python, uvicorn, npm, ...)
#     -Args       String of arguments to pass to the command
# ==========================================================================
function Start-Service {
    param(
        [string]$Name,
        [string]$WorkDir,
        [string]$Command,
        [string]$Arguments = ""
    )

    $safeName = $Name -replace '\s+', '_'
    $logFile  = Join-Path $LOGS_DIR "$safeName.log"

    if (-not (Test-Path $WorkDir)) {
        Write-Err "$Name  -  directory not found: $WorkDir"
        return $null
    }

    Write-Host ""
    Write-Host "  Starting $Name ..." -ForegroundColor Yellow

    # Build the PowerShell command that will run inside the new window:
    # 1. cd to WorkDir
    # 2. run Command + Arguments
    # 3. tee stdout+stderr to the log file
    # 4. keep window open on exit so you can read errors
    $template = @(
        "`$host.UI.RawUI.WindowTitle = '{0}'",
        "Set-Location '{1}'",
        "Write-Host '[Intervista] {0} started' -ForegroundColor Green",
        "Write-Host '[Intervista] Log: {2}' -ForegroundColor DarkGray",
        "Write-Host ''",
        "& '{3}' {4} 2>&1 | Tee-Object -FilePath '{2}'",
        "Write-Host ''",
        "Write-Host '[Intervista] {0} has stopped. Press any key to close...' -ForegroundColor Red",
        "`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')"
    ) -join "`r`n"

    $innerScript = $template -f ($Name -replace "'", "''"),
                                ($WorkDir -replace "'", "''"),
                                ($logFile -replace "'", "''"),
                                ($Command -replace "'", "''"),
                                $Arguments

    $encodedCmd = [Convert]::ToBase64String(
        [System.Text.Encoding]::Unicode.GetBytes($innerScript)
    )

    $proc = Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList "-NoLogo -ExecutionPolicy Bypass -EncodedCommand $encodedCmd" `
        -PassThru

    if ($proc -and -not $proc.HasExited) {
        Write-Ok "$Name  (PID $($proc.Id))  ->  logs\$safeName.log"
        $script:StartedProcesses += [pscustomobject]@{ Name = $Name; Process = $proc }
        return $proc
    } else {
        Write-Err "$Name failed to start  -  check: logs\$safeName.log"
        return $null
    }
}

# ==========================================================================
#                         S E R V I C E   L A U N C H E R
# ==========================================================================

Write-Header "Launching all Intervista services..."

# -- 1. User Mail & Verification Server (Port 5000) -----------------------
Start-Service `
    -Name      "User Mail Server" `
    -WorkDir   $FRONTEND_DIR `
    -Command   "node" `
    -Arguments "server.js"

Start-Sleep -Milliseconds 500

# -- 2. Company Mail Server (Port 5001) -----------------------------------
Start-Service `
    -Name      "Company Mail Server" `
    -WorkDir   $FRONTEND_DIR `
    -Command   "node" `
    -Arguments "company_mail_server.js"

Start-Sleep -Milliseconds 500

# -- 3. Frontend React App / Vite (Port 5173) -----------------------------
Start-Service `
    -Name      "Frontend React App" `
    -WorkDir   $FRONTEND_DIR `
    -Command   "npm" `
    -Arguments "run dev"

Start-Sleep -Milliseconds 800

# -- 4. Aptitude Module (Port 5002) ---------------------------------------
#    Runs Flask backend on port 5002 to avoid conflict with User Mail Server.
$APTITUDE_DIR = Join-Path $BACKEND_DIR "Aptitude Module\Aptitude session\AptitudeIQ"
if (Test-PortFree 5002) {
    Start-Service `
        -Name      "Aptitude Module" `
        -WorkDir   $APTITUDE_DIR `
        -Command   "python" `
        -Arguments "server.py"
} else {
    Write-Ok "Aptitude Module  ->  already running on port 5002"
}

Start-Sleep -Milliseconds 500

# -- 5. Coding Module (Port 8000) -----------------------------------------
$CODING_DIR   = Join-Path $BACKEND_DIR "Coding Module\Coding-module-backend-intervista-"
$CODING_VENV  = Join-Path $CODING_DIR  "venv\Scripts\uvicorn.exe"
if (Test-Path $CODING_VENV) {
    $codingCmd  = $CODING_VENV
    $codingArgs = "app.main:app --host 0.0.0.0 --port 8000 --reload"
} else {
    Write-Warn "Coding Module: venv not found  -  using system uvicorn"
    $codingCmd  = "uvicorn"
    $codingArgs = "app.main:app --host 0.0.0.0 --port 8000 --reload"
}
Test-PortFree 8000 | Out-Null
Start-Service `
    -Name      "Coding Module" `
    -WorkDir   $CODING_DIR `
    -Command   $codingCmd `
    -Arguments $codingArgs

Start-Sleep -Milliseconds 500

# -- 6. AI Interview Module (Port 8001) -----------------------------------
#    Runs from the files/ subfolder which contains main.py and its own venv
$AI_DIR      = Join-Path $BACKEND_DIR "AI Interview Module\chumma\files"
$AI_UVICORN  = Join-Path $AI_DIR      "venv\Scripts\uvicorn.exe"
if (-not (Test-Path $AI_UVICORN)) { $AI_UVICORN = "uvicorn" }
Test-PortFree 8001 | Out-Null
Start-Service `
    -Name      "AI Interview Module" `
    -WorkDir   $AI_DIR `
    -Command   $AI_UVICORN `
    -Arguments "main:app --host 0.0.0.0 --port 8001 --reload"

Start-Sleep -Milliseconds 500

# -- 7. Communication / Verbal Module (Port 8002) -------------------------
$VERBAL_DIR  = Join-Path $BACKEND_DIR "Communication Module\communication_module"
$VERBAL_VENV = Join-Path $VERBAL_DIR  "com\Scripts\uvicorn.exe"
if (Test-Path $VERBAL_VENV) {
    $verbalCmd  = $VERBAL_VENV
    $verbalArgs = "app.main:app --host 0.0.0.0 --port 8002 --reload"
} else {
    Write-Warn "Communication Module: com venv not found  -  using system uvicorn"
    $verbalCmd  = "uvicorn"
    $verbalArgs = "app.main:app --host 0.0.0.0 --port 8002 --reload"
}
if (Test-PortFree 8002) {
    Start-Service `
        -Name      "Communication Module" `
        -WorkDir   $VERBAL_DIR `
        -Command   $verbalCmd `
        -Arguments $verbalArgs
} else {
    Write-Ok "Communication Module  ->  already running on port 8002"
}

Start-Sleep -Milliseconds 500

# -- 8. Data Service (Port 5003) ------------------------------------------
$DATA_SERVICE_DIR = Join-Path $BACKEND_DIR "Data Service"
if (Test-PortFree 5003) {
    Start-Service `
        -Name      "Data Service" `
        -WorkDir   $DATA_SERVICE_DIR `
        -Command   "node" `
        -Arguments "server.js"
} else {
    Write-Ok "Data Service  ->  already running on port 5003"
}

Start-Sleep -Milliseconds 500


# -- 11-13. .NET Backends Pre-build ----------------------------------------
# Pre-build solution sequentially once to prevent parallel MSBuild file-lock collision on Knitnet.Shared.dll
$DOTNET_BACKEND  = Join-Path $PROJECT_ROOT "Supabase Backend\Ai-interview-platform\Knitnet.Backend"
Write-Info "Pre-building .NET solution to prevent file locking..."
& dotnet build "$DOTNET_BACKEND\Knitnet.Backend.sln" -c Debug --nologo | Out-Null

# -- 11. User API .NET Backend (Port 5280) --------------------------------
#    Required for /api/user proxy  ->  login, registration, profile
$USER_API_DIR    = Join-Path $DOTNET_BACKEND "Knitnet.UserApi"
if (Test-PortFree 5280) {
    Start-Service `
        -Name      "User API (.NET)" `
        -WorkDir   $USER_API_DIR `
        -Command   "dotnet" `
        -Arguments "run --no-build"
    Start-Sleep -Milliseconds 2000
} else {
    Write-Ok "User API (.NET)  ->  already running on port 5280"
}

# -- 12. Company API .NET Backend (Port 5158) -----------------------------
#    Required for /api/company proxy  ->  company login, dashboard
$COMPANY_API_DIR = Join-Path $DOTNET_BACKEND "Knitnet.CompanyApi"
if (Test-PortFree 5158) {
    Start-Service `
        -Name      "Company API (.NET)" `
        -WorkDir   $COMPANY_API_DIR `
        -Command   "dotnet" `
        -Arguments "run --no-build"
    Start-Sleep -Milliseconds 2000
} else {
    Write-Ok "Company API (.NET)  ->  already running on port 5158"
}

# -- 13. Transaction API .NET Backend (Port 5017) -------------------------
$TRANSACTION_API_DIR = Join-Path $DOTNET_BACKEND "Knitnet.TransactionApi"
if (Test-PortFree 5017) {
    Start-Service `
        -Name      "Transaction API (.NET)" `
        -WorkDir   $TRANSACTION_API_DIR `
        -Command   "dotnet" `
        -Arguments "run --no-build"
} else {
    Write-Ok "Transaction API (.NET)  ->  already running on port 5017"
}

Start-Sleep -Milliseconds 500

# ==========================================================================
#                         SUMMARY TABLE
# ==========================================================================

Write-Host ""
Write-Host "  +------------------------------------------------------------------+" -ForegroundColor Green
Write-Host "  |            All Intervista services launched!                     |" -ForegroundColor Green
Write-Host "  +------------------------------------------------------------------+" -ForegroundColor Green
Write-Host ""
Write-Host "  Service                        Port    Log" -ForegroundColor White
Write-Host "  ------------------------------------------------------------------"
Write-Host "  User Mail Server               5000    logs\User_Mail_Server.log"
Write-Host "  Company Mail Server            5001    logs\Company_Mail_Server.log"
Write-Host "  Frontend React App             5173    logs\Frontend_React_App.log"
Write-Host "  Aptitude Module                5002    logs\Aptitude_Module.log"
Write-Host "  Coding Module                  8000    logs\Coding_Module.log"
Write-Host "  AI Interview Module            8001    logs\AI_Interview_Module.log"
Write-Host "  Communication Module           8002    logs\Communication_Module.log"
Write-Host "  Data Service                   5003    logs\Data_Service.log"
Write-Host "  User API (.NET)                5280    logs\User_API_(.NET).log"
Write-Host "  Company API (.NET)             5158    logs\Company_API_(.NET).log"
Write-Host "  Transaction API (.NET)         5017    logs\Transaction_API_(.NET).log"
Write-Host "  ------------------------------------------------------------------"
Write-Host ""

Write-Host ""
Write-Host "  Frontend: " -NoNewline; Write-Host "http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Each service runs in its own console window." -ForegroundColor DarkGray
Write-Host "  Close the individual windows to stop specific services." -ForegroundColor DarkGray
Write-Host "  Press ENTER here to stop ALL services and close all windows." -ForegroundColor DarkGray
Write-Host ""

# ==========================================================================
#   WATCHDOG  -  press ENTER in this window to kill everything
# ==========================================================================
Read-Host "  >> Press ENTER to STOP ALL services"

Write-Host ""
Write-Host "  Stopping all Intervista services..." -ForegroundColor Yellow

foreach ($entry in $script:StartedProcesses) {
    try {
        if (-not $entry.Process.HasExited) {
            Write-Host "  Stopping $($entry.Name) (PID $($entry.Process.Id))..." -ForegroundColor Yellow
            # Kill the PowerShell window and all its child processes
            $children = Get-WmiObject Win32_Process | Where-Object { $_.ParentProcessId -eq $entry.Process.Id }
            foreach ($child in $children) {
                Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue
            }
            Stop-Process -Id $entry.Process.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {
        # Process may have already exited
    }
}

Write-Host ""
Write-Host "  All services stopped. Goodbye!" -ForegroundColor Green
Write-Host ""