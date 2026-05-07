#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# RePlate — Start Fresh Application
# Kills any running instances, then starts backend + frontend.
# Usage: bash RePlate/startApp.sh  (from repo root)
#        ./startApp.sh             (from RePlate/)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

BACKEND_LOG="/tmp/replate_backend.log"
FRONTEND_LOG="/tmp/replate_frontend.log"
BACKEND_PID_FILE="/tmp/replate_backend.pid"
FRONTEND_PID_FILE="/tmp/replate_frontend.pid"

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${CYAN}[RePlate]${NC} $*"; }
ok()   { echo -e "${GREEN}[  OK  ]${NC} $*"; }
warn() { echo -e "${YELLOW}[ WARN ]${NC} $*"; }
die()  { echo -e "${RED}[ FAIL ]${NC} $*"; exit 1; }

# ── 1. Kill existing instances ───────────────────────────────────────────────
log "Stopping any running RePlate instances..."

# Kill by saved PID files first (cleanest)
for pid_file in "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE"; do
  if [[ -f "$pid_file" ]]; then
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && warn "Killed PID $pid (from $pid_file)"
    fi
    rm -f "$pid_file"
  fi
done

# Also kill anything still holding our ports (8000, 5173-5175)
for port in 8000 5173 5174 5175; do
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs -r kill -9 2>/dev/null && warn "Killed process(es) on port $port: $pids"
  fi
done

# Kill stray uvicorn / vite processes by name
pkill -f "uvicorn app.main:app" 2>/dev/null && warn "Killed stray uvicorn process" || true
pkill -f "vite"                 2>/dev/null && warn "Killed stray vite process"    || true

sleep 1
ok "All existing instances stopped."

# ── 2. Validate directories & venv ───────────────────────────────────────────
[[ -d "$BACKEND_DIR"  ]] || die "Backend dir not found: $BACKEND_DIR"
[[ -d "$FRONTEND_DIR" ]] || die "Frontend dir not found: $FRONTEND_DIR"

UVICORN="$BACKEND_DIR/.venv/bin/uvicorn"
[[ -x "$UVICORN" ]] || die "uvicorn not found at $UVICORN — run 'uv sync' inside backend/"

command -v bun &>/dev/null || die "'bun' not found in PATH — install bun first."

# ── 3. Start Backend ─────────────────────────────────────────────────────────
log "Starting backend (port 8000)..."
(cd "$BACKEND_DIR" && nohup "$UVICORN" app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  > "$BACKEND_LOG" 2>&1) &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"
ok "Backend started — PID $BACKEND_PID | log: $BACKEND_LOG"

# ── 4. Wait for backend to be ready ──────────────────────────────────────────
log "Waiting for backend to be ready..."
for i in $(seq 1 20); do
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    ok "Backend is up!"
    break
  fi
  # also accept any 2xx/3xx on root
  if curl -sf -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>/dev/null | grep -qE "^[23]"; then
    ok "Backend is up!"
    break
  fi
  if [[ $i -eq 20 ]]; then
    warn "Backend did not respond after 20s — check $BACKEND_LOG"
  fi
  sleep 1
done

# ── 5. Start Frontend ─────────────────────────────────────────────────────────
log "Starting frontend (Vite dev server)..."
(cd "$FRONTEND_DIR" && nohup bun run dev > "$FRONTEND_LOG" 2>&1) &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"
ok "Frontend started — PID $FRONTEND_PID | log: $FRONTEND_LOG"

# ── 6. Wait for frontend to be ready ─────────────────────────────────────────
log "Waiting for frontend to be ready..."
FRONTEND_PORT=""
for i in $(seq 1 20); do
  for port in 5173 5174 5175; do
    if curl -sf -o /dev/null http://localhost:$port/ 2>/dev/null; then
      FRONTEND_PORT=$port
      break 2
    fi
  done
  if [[ $i -eq 20 ]]; then
    warn "Frontend did not respond after 20s — check $FRONTEND_LOG"
    FRONTEND_PORT="5173 (assumed)"
  fi
  sleep 1
done
ok "Frontend is up on port ${FRONTEND_PORT}!"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}────────────────────────────────────────────${NC}"
echo -e "${BOLD}  RePlate is running!${NC}"
echo -e "${BOLD}────────────────────────────────────────────${NC}"
echo -e "  Backend   →  http://localhost:8000"
echo -e "  Frontend  →  http://localhost:${FRONTEND_PORT}"
echo -e "  API Docs  →  http://localhost:8000/docs"
echo ""
echo -e "  Backend log  : $BACKEND_LOG"
echo -e "  Frontend log : $FRONTEND_LOG"
echo ""
echo -e "${YELLOW}  Demo accounts:${NC}"
echo -e "    consumer@replate.dev  /  consumer123"
echo -e "    seller@replate.dev    /  seller123"
echo -e "    seller2@replate.dev   /  seller123"
echo -e "    ngo@replate.dev       /  ngo123"
echo -e "${BOLD}────────────────────────────────────────────${NC}"
echo ""
echo -e "  To stop:  pkill -f 'uvicorn app.main:app' && pkill -f vite"
