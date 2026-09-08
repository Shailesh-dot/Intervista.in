#!/usr/bin/env bash

# ═══════════════════════════════════════════════════════════════════════
#   INTERVISTA AI ASSESSMENT PLATFORM — MASTER STARTUP SCRIPT
#   Place this file at:  "c:/Intervista Project/start.sh"
#   Run with:            bash start.sh        (Git Bash / WSL)
# ═══════════════════════════════════════════════════════════════════════
#   Starts 10 services:
#     ①  User Mail & Verification Server     → Port 5000  (Node.js)
#     ②  Company Mail Server                 → Port 5001  (Node.js)
#     ③  Frontend React App                  → Port 5173  (Vite)
#     ④  Aptitude Module                     → Port 5002  (Flask/Python)
#     ⑤  Coding Module                       → Port 8000  (FastAPI/uvicorn)
#     ⑥  AI Interview Module                 → Port 8001  (FastAPI/uvicorn)
#     ⑦  Communication / Verbal Module       → Port 8002  (FastAPI/uvicorn)
#     ⑧  Data Service                        → Port 5003  (Node.js)
#     ⑨  Face Verification Proctor           → Port 8004  (Python)
#     ⑩  Live Monitor Proctor                → Port 8005  (Python)
# ═══════════════════════════════════════════════════════════════════════

# ── Colour codes ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${CYAN}"
echo -e "  ╔══════════════════════════════════════════════════════════╗"
echo -e "  ║        INTERVISTA AI ASSESSMENT PLATFORM RUNNER         ║"
echo -e "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Resolve absolute project root (wherever this script lives) ───────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/Ai-interview-platform"
BACKEND_DIR="$PROJECT_ROOT/Backend"
LOGS_DIR="$PROJECT_ROOT/logs"

echo -e "${GREEN}[INFO] Project root : $PROJECT_ROOT${NC}"

# ── Detect OS / shell type to choose correct venv subdirectory ───────────
#    Git Bash / Cygwin / MSYS on Windows  →  Scripts/
#    Linux / macOS / WSL                  →  bin/
if [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]] || [[ "$OSTYPE" == "win32" ]]; then
    VENV_BIN="Scripts"
    PYTHON_CMD="python"
    echo -e "${BLUE}[INFO] Shell detected: Windows (Git Bash / MSYS) — using venv/Scripts/${NC}"
else
    VENV_BIN="bin"
    PYTHON_CMD="python3"
    echo -e "${BLUE}[INFO] Shell detected: Unix/WSL — using venv/bin/${NC}"
fi

# ── Create logs directory ────────────────────────────────────────────────
mkdir -p "$LOGS_DIR"
echo -e "${GREEN}[INFO] Log files → $LOGS_DIR/${NC}"

# ── Load environment variables from frontend .env ───────────────────────
if [ -f "$FRONTEND_DIR/.env" ]; then
    echo -e "${GREEN}[INFO] Loading env vars from Ai-interview-platform/.env ...${NC}"
    while IFS= read -r line || [ -n "$line" ]; do
        if [[ ! "$line" =~ ^[[:space:]]*# ]] && [[ ! "$line" =~ ^[[:space:]]*$ ]]; then
            clean_line=$(echo "$line" | tr -d '\r')
            key=$(echo "$clean_line" | cut -d'=' -f1)
            val=$(echo "$clean_line" | cut -d'=' -f2-)
            export "$key=$val"
        fi
    done < "$FRONTEND_DIR/.env"
    echo -e "${GREEN}[INFO] Environment variables loaded.${NC}"
else
    echo -e "${YELLOW}[WARN] $FRONTEND_DIR/.env not found — some services may lack API keys.${NC}"
fi

# ── PID / name arrays for cleanup tracking ───────────────────────────────
declare -a PIDS
declare -a SERVICE_NAMES

# ═══════════════════════════════════════════════════════════════════════
# FUNCTION: start_service <display-name> <working-dir> <cmd...>
#   • Changes to the working directory
#   • Starts the command in the background
#   • Redirects stdout+stderr to LOGS_DIR/<Name>.log
#   • Tracks the PID for graceful shutdown
# ═══════════════════════════════════════════════════════════════════════
start_service() {
    local name="$1"
    local dir="$2"
    shift 2
    local cmd=("$@")
    local safe_name
    safe_name=$(echo "$name" | tr ' ' '_')
    local log_file="$LOGS_DIR/${safe_name}.log"

    # Verify the directory exists before attempting to start
    if [ ! -d "$dir" ]; then
        echo -e "${RED}[SKIP] $name — directory not found:${NC}"
        echo -e "       $dir"
        return 1
    fi

    echo -e "${YELLOW}  Starting $name ...${NC}"
    (cd "$dir" && "${cmd[@]}" >> "$log_file" 2>&1) &
    local pid=$!

    PIDS+=($pid)
    SERVICE_NAMES+=("$name")

    sleep 0.3   # brief pause so startup errors surface before next service

    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${GREEN}  ✓  $name  (PID $pid)${NC}"
    else
        echo -e "${RED}  ✗  $name failed to start — check: logs/${safe_name}.log${NC}"
    fi
}

# ═══════════════════════════════════════════════════════════════════════
# GRACEFUL SHUTDOWN — triggered by Ctrl+C (SIGINT) or SIGTERM
# ═══════════════════════════════════════════════════════════════════════
cleanup() {
    echo -e "\n\n${BOLD}${YELLOW}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${YELLOW}║   Shutting down all Intervista services…         ║${NC}"
    echo -e "${BOLD}${YELLOW}╚══════════════════════════════════════════════════╝${NC}"

    for i in "${!PIDS[@]}"; do
        _pid="${PIDS[$i]}"
        _name="${SERVICE_NAMES[$i]}"
        if kill -0 "$_pid" 2>/dev/null; then
            echo -e "  Stopping ${_name} (PID ${_pid})..."
            kill "$_pid" 2>/dev/null
        fi
    done

    # Give processes up to 3 seconds to exit gracefully, then force-kill
    sleep 3
    for i in "${!PIDS[@]}"; do
        _pid="${PIDS[$i]}"
        if kill -0 "$_pid" 2>/dev/null; then
            echo -e "${RED}  Force-killing ${SERVICE_NAMES[$i]} (PID $_pid)...${NC}"
            kill -9 "$_pid" 2>/dev/null
        fi
    done

    echo -e "\n${BOLD}${GREEN}All services stopped. Goodbye!${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ═══════════════════════════════════════════════════════════════════════
#                        S E R V I C E   L A U N C H E R
# ═══════════════════════════════════════════════════════════════════════

echo -e "\n${BOLD}${MAGENTA}Starting services...${NC}\n"

# ── ① User Mail & Verification Server (Port 5000) ─────────────────────
#    Handles: /api/send-verification, /api/verify,
#             /api/check-verification, /api/contact
start_service "User Mail Server" \
    "$FRONTEND_DIR" \
    node server.js

# ── ② Company Mail Server (Port 5001) ─────────────────────────────────
#    Handles: company email verification, /api/screening proxy
start_service "Company Mail Server" \
    "$FRONTEND_DIR" \
    node company_mail_server.js

# ── ③ Frontend React App (Port 5173) ──────────────────────────────────
#    Vite dev server — proxies all /api/* routes to backend services
start_service "Frontend React App" \
    "$FRONTEND_DIR" \
    npm run dev

# ── ④ Aptitude Module (Port 5002) ─────────────────────────────────────
#    Flask server; proxied via /api/aptitude → localhost:5002
APTITUDE_DIR="$BACKEND_DIR/Aptitude Module/Aptitude session/AptitudeIQ"
start_service "Aptitude Module" \
    "$APTITUDE_DIR" \
    $PYTHON_CMD server.py

# ── ⑤ Coding Module (Port 8000) ───────────────────────────────────────
#    FastAPI; proxied via /api/coding → localhost:8000
#    venv at: Backend/Coding Module/Coding-module-backend-intervista-/venv
CODING_DIR="$BACKEND_DIR/Coding Module/Coding-module-backend-intervista-"
if [ -f "$CODING_DIR/venv/$VENV_BIN/uvicorn" ]; then
    CODING_UVICORN="$CODING_DIR/venv/$VENV_BIN/uvicorn"
else
    CODING_UVICORN="uvicorn"   # fall back to system uvicorn
    echo -e "${YELLOW}  [WARN] Coding Module: venv not found, using system uvicorn${NC}"
fi
start_service "Coding Module" \
    "$CODING_DIR" \
    "$CODING_UVICORN" app.main:app --host 0.0.0.0 --port 8000 --reload

# ── ⑥ AI Interview Module (Port 8001) ─────────────────────────────────
#    FastAPI; proxied via /api/interview → localhost:8001
#    Falls back to system uvicorn (no dedicated venv found)
AI_DIR="$BACKEND_DIR/AI Interview Module/chumma"
start_service "AI Interview Module" \
    "$AI_DIR" \
    uvicorn module2_server:app --host 0.0.0.0 --port 8001 --reload

# ── ⑦ Communication / Verbal Module (Port 8002) ───────────────────────
#    FastAPI; proxied via /api/communication → localhost:8002
#    venv at: Backend/Communication Module/communication_module/com
VERBAL_DIR="$BACKEND_DIR/Communication Module/communication_module"
if [ -f "$VERBAL_DIR/com/$VENV_BIN/uvicorn" ]; then
    VERBAL_UVICORN="$VERBAL_DIR/com/$VENV_BIN/uvicorn"
else
    VERBAL_UVICORN="uvicorn"
    echo -e "${YELLOW}  [WARN] Communication Module: com venv not found, using system uvicorn${NC}"
fi
start_service "Communication Module" \
    "$VERBAL_DIR" \
    "$VERBAL_UVICORN" app.main:app --host 0.0.0.0 --port 8002 --reload

# ── ⑧ Data Service (Port 5003) ─────────────────────────────────────────
#    Express server; proxied via /api/verification → localhost:5003
DATA_SERVICE_DIR="$BACKEND_DIR/Data Service"
start_service "Data Service" \
    "$DATA_SERVICE_DIR" \
    node server.js


# ═══════════════════════════════════════════════════════════════════════
#                       STATUS SUMMARY TABLE
# ═══════════════════════════════════════════════════════════════════════

echo -e "\n${BOLD}${GREEN}"
echo -e "  ╔══════════════════════════════════════════════════════════╗"
echo -e "  ║           All Intervista services are running!           ║"
echo -e "  ║         Press  Ctrl+C  to stop them gracefully.         ║"
echo -e "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BOLD}  Service                       Port    Log File${NC}"
echo -e "  ─────────────────────────────────────────────────────────────────────"
echo -e "  User Mail Server              ${BOLD}5000${NC}    logs/User_Mail_Server.log"
echo -e "  Company Mail Server           ${BOLD}5001${NC}    logs/Company_Mail_Server.log"
echo -e "  Frontend React App            ${BOLD}5173${NC}    logs/Frontend_React_App.log"
echo -e "  Aptitude Module               ${BOLD}5002${NC}   logs/Aptitude_Module.log"
echo -e "  Coding Module                 ${BOLD}8000${NC}    logs/Coding_Module.log"
echo -e "  AI Interview Module           ${BOLD}8001${NC}    logs/AI_Interview_Module.log"
echo -e "  Communication Module          ${BOLD}8002${NC}    logs/Communication_Module.log"
echo -e "  Data Service                  ${BOLD}5003${NC}    logs/Data_Service.log"
echo -e "  ─────────────────────────────────────────────────────────────────────"

echo -e ""
echo -e "  Frontend:  ${BOLD}${CYAN}http://localhost:5173${NC}"
echo -e ""

# ═══════════════════════════════════════════════════════════════════════
#   WATCHDOG LOOP — warns if a service dies unexpectedly
# ═══════════════════════════════════════════════════════════════════════
while true; do
    for i in "${!PIDS[@]}"; do
        _pid="${PIDS[$i]}"
        _name="${SERVICE_NAMES[$i]}"
        _safe=$(echo "$_name" | tr ' ' '_')
        if ! kill -0 "$_pid" 2>/dev/null; then
            echo -e "${RED}[WARN] $_name (PID $_pid) stopped unexpectedly!${NC}"
            echo -e "       Check logs/${_safe}.log for details."
            unset "PIDS[$i]"
            unset "SERVICE_NAMES[$i]"
        fi
    done
    sleep 5
done
