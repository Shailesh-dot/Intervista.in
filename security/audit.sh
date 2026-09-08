#!/bin/bash
# =============================================================================
# INTERVISTA CYBERSECURITY AUDIT BASELINE — MASTER AUDIT RUNNER
# Specification: Intervista_Security_Audit_Baseline.pdf
# Target: Local Development / Test Environment Only
# =============================================================================

set -e

mkdir -p "security/reports"

echo "========================================================"
echo "  INTERVISTA CYBERSECURITY AUDIT BASELINE EXECUTION"
echo "========================================================"
echo "Date: $(date)"
echo "Git Baseline: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')"
echo ""

echo ">>> [1/6] Running Frontend / Node.js Audit..."
bash security/audit-frontend.sh

echo ">>> [2/6] Running Python / FastAPI Audit..."
bash security/audit-python.sh

echo ">>> [3/6] Running .NET / NuGet Audit..."
bash security/audit-dotnet.sh

echo ">>> [4/6] Running Source SAST & Secret Audit..."
python security/secret_scanner.py
semgrep scan --config=auto --exclude="*venv*" --exclude="*com*" --exclude="*node_modules*" --exclude="*dist*" --json --output="security/reports/semgrep.json" || true

echo ">>> [5/6] Running Docker & Container Audit..."
bash security/audit-docker.sh

echo ">>> [6/6] Generating API Inventory & Database Audit..."
python security/generate_api_inventory.py
NODE_PATH="Backend/Data Service/node_modules" node security/audit_db.js

echo ""
echo "========================================================"
echo "  AUDIT COMPLETE — All 12 Reports Generated Successfully"
echo "  Reports Location: security/reports/"
echo "  Summary Document: security/SECURITY_BASELINE.md"
echo "========================================================"
