#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════════════════════
# Intervista Platform — Start Script
# ══════════════════════════════════════════════════════════════════════════════
# Usage:
#   ./scripts/start.sh          # Build and start all services
#   ./scripts/start.sh --pull   # Pull pre-built images, then start
# ══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"
ENV_FILE="$DEPLOY_DIR/.env"

# ── Pre-flight checks ─────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    echo "ERROR: docker is not installed." >&2
    exit 1
fi

if ! docker compose version &>/dev/null; then
    echo "ERROR: docker compose plugin is not available." >&2
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: .env file not found at $ENV_FILE" >&2
    echo "  Run: cp $DEPLOY_DIR/.env.example $ENV_FILE" >&2
    echo "  Then fill in the required values." >&2
    exit 1
fi

echo "════════════════════════════════════════════════════════"
echo "  Intervista Platform — Starting Deployment"
echo "════════════════════════════════════════════════════════"
echo ""

# ── Build or Pull images ─────────────────────────────────────────────────
if [ "${1:-}" = "--pull" ]; then
    echo "[1/3] Pulling pre-built images..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull --ignore-buildable
else
    echo "[1/3] Building Docker images..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
fi

# ── Start services ────────────────────────────────────────────────────────
echo ""
echo "[2/3] Starting services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# ── Wait and report ───────────────────────────────────────────────────────
echo ""
echo "[3/3] Waiting for services to start..."
sleep 15

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Service Status"
echo "════════════════════════════════════════════════════════"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Health Check"
echo "════════════════════════════════════════════════════════"

if curl -sf http://localhost/health >/dev/null 2>&1; then
    echo "  ✓ Nginx health endpoint: HEALTHY"
else
    echo "  ✗ Nginx health endpoint: NOT REACHABLE"
    echo "    Check logs: docker compose -f $COMPOSE_FILE logs frontend"
fi

echo ""
echo "  Application URL: http://localhost"
echo "  Logs:  docker compose -f $COMPOSE_FILE logs -f"
echo "  Stop:  docker compose -f $COMPOSE_FILE down"
echo ""
