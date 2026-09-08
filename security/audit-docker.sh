#!/bin/bash
# =============================================================================
# INTERVISTA CYBERSECURITY AUDIT — DOCKER SCRIPT
# =============================================================================

echo "=== [1/2] Checking Docker daemon status ==="
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "Docker is running."
    docker version > "security/reports/docker.txt"
    docker ps -a >> "security/reports/docker.txt"
    docker images >> "security/reports/docker.txt"
    docker volume ls >> "security/reports/docker.txt"
    docker network ls >> "security/reports/docker.txt"
else
    echo "Docker daemon is not running. Logging configuration-only audit."
    echo "STATUS: Docker daemon not running locally." > "security/reports/docker.txt"
fi

echo "=== [2/2] Reviewing Dockerfile security configuration ==="
python -c "
import os
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d.lower() not in ('node_modules', 'venv', 'com', '.git', 'dist')]
    for f in files:
        if f.startswith('Dockerfile') or f == 'docker-compose.yml':
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                c = fp.read()
                print('Checked', p, '- Has root user:', 'USER ' not in c if 'Dockerfile' in f else 'N/A')
" >> "security/reports/docker.txt"

echo "Docker audit complete."
