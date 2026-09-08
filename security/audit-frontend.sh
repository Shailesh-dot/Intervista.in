#!/bin/bash
# =============================================================================
# INTERVISTA CYBERSECURITY AUDIT — FRONTEND SCRIPT
# =============================================================================

set -e

echo "=== [1/3] Auditing React Frontend (Ai-interview-platform) ==="
cd "Ai-interview-platform"
npm audit --json > "../security/reports/npm-audit-frontend.json" || true
npm outdated || true
npm run build
cd ..

echo "=== [2/3] Auditing Backend Data Service ==="
cd "Backend/Data Service"
npm audit --json > "../../security/reports/npm-audit-dataservice.json" || true
cd ../..

echo "=== [3/3] Scanning frontend build output for embedded credentials ==="
python -c "
import os, re
dist = r'Ai-interview-platform/dist'
patterns = [re.compile(p, re.I) for p in [r'service_role', r'supabase.*key', r'jwt.*secret', r'api[_]?key']]
matches = []
if os.path.exists(dist):
    for root, _, files in os.walk(dist):
        for f in files:
            with open(os.path.join(root, f), 'r', encoding='utf-8', errors='ignore') as fp:
                c = fp.read()
                for p in patterns:
                    if p.search(c): matches.append(f)
print('Matches in dist/:', matches)
"

echo "Frontend audit complete."
