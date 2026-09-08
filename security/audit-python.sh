#!/bin/bash
# =============================================================================
# INTERVISTA CYBERSECURITY AUDIT — PYTHON SCRIPT
# =============================================================================

echo "=== [1/4] Running pip check for dependency conflicts ==="
python -m pip check > "security/reports/pip-check.txt" 2>&1 || true

echo "=== [2/4] Generating dependency tree ==="
python -m pipdeptree --warn fail > "security/reports/pipdeptree.txt" 2>&1 || true

echo "=== [3/4] Running pip-audit vulnerability scan ==="
python -m pip_audit -f json > "security/reports/pip-audit.json" 2>&1 || true

echo "=== [4/4] Running Bandit SAST scan on first-party code ==="
python -c "
import os, subprocess, sys, json
target_files = []
for root, dirs, files in os.walk('Backend'):
    dirs[:] = [d for d in dirs if d.lower() not in ('venv', 'com', 'site-packages', 'node_modules', '.git', '__pycache__', '.pytest_cache')]
    if 'site-packages' in root.lower() or '/com/' in root.lower() or '/venv/' in root.lower(): continue
    for file in files:
        if file.endswith('.py'): target_files.append(os.path.join(root, file))

all_results = []
chunk_size = 20
for i in range(0, len(target_files), chunk_size):
    chunk = target_files[i:i + chunk_size]
    r = subprocess.run([sys.executable, '-m', 'bandit', '-f', 'json'] + chunk, capture_output=True, text=True, encoding='utf-8')
    if r.stdout:
        try: all_results.extend(json.loads(r.stdout).get('results', []))
        except: pass

with open('security/reports/bandit.json', 'w', encoding='utf-8') as f:
    json.dump({'generated_at': '2026-08-26', 'results': all_results}, f, indent=2)
print(f'Bandit scan complete: {len(all_results)} issues.')
"

echo "Python audit complete."
