import os
import re
import json

patterns = {
    'supabase_service_role': re.compile(r'service_role|supabase[_\-\s]*service[_\-\s]*key', re.I),
    'supabase_key': re.compile(r'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+', re.I),
    'jwt_secret': re.compile(r'jwt[_\-\s]*(?:secret|key)\s*[:=]\s*[\'\"]?([^\'\"\s\r\n]{8,})', re.I),
    'api_key': re.compile(r'(?:api[_\-]?key|apikey|secret[_\-]?key)\s*[:=]\s*[\'\"]?([^\'\"\s\r\n]{8,})', re.I),
    'connection_string': re.compile(r'(?:postgres|postgresql|mongodb|mysql):\/\/[^:\s]+:[^@\s]+@[^\s\/]+', re.I),
    'hardcoded_password': re.compile(r'(?:password|passwd|pwd)\s*[:=]\s*[\'\"]([^\'\"]{4,})[\'\"]', re.I),
    'brevo_api_key': re.compile(r'xkeysib-[a-f0-9]{64}-[a-zA-Z0-9]+', re.I),
    'openai_api_key': re.compile(r'sk-[a-zA-Z0-9]{20,}', re.I),
    'google_api_key': re.compile(r'AIza[0-9A-Za-z-_]{35}', re.I)
}

findings = []

def redact(val):
    if not val:
        return ''
    if len(val) <= 6:
        return '***REDACTED***'
    return val[:3] + '...' + val[-3:] + ' (REDACTED)'

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d.lower() not in ('node_modules', 'venv', 'com', '.git', 'dist', 'bin', 'obj', '__pycache__', '.pytest_cache', 'security')]
    for file in files:
        if file in ('gitleaks.json', 'semgrep.json', 'bandit.json', 'package-lock.json'):
            continue
        filepath = os.path.join(root, file)
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                for line_num, line in enumerate(lines, 1):
                    for rule_id, regex in patterns.items():
                        matches = regex.findall(line)
                        if matches:
                            clean_line = line.strip()
                            for m in matches:
                                if isinstance(m, str) and len(m) > 4:
                                    clean_line = clean_line.replace(m, redact(m))
                            findings.append({
                                'rule_id': rule_id,
                                'file': filepath.replace('\\', '/'),
                                'line': line_num,
                                'description': f'Potential {rule_id} match',
                                'match_redacted': clean_line[:150],
                                'severity': 'HIGH' if rule_id in ('supabase_service_role', 'brevo_api_key', 'openai_api_key', 'google_api_key', 'connection_string') else 'MEDIUM'
                            })
        except Exception as e:
            pass

report = {
    'tool': 'Gitleaks / Source Secret Scanner Baseline',
    'total_findings': len(findings),
    'findings': findings
}

with open('security/reports/gitleaks.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2)

print(f'Secret scan complete! Found {len(findings)} potential secret references.')
