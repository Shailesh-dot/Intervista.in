import os
import re
import json
import urllib.request

inventory = []

# 1. Probe active localhost ports for OpenAPI specs
ports = [5000, 5001, 5002, 5003, 5004, 8000, 8001, 8002, 8003, 8004, 8005]
for p in ports:
    url = f'http://localhost:{p}/openapi.json'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'AuditBot'})
        with urllib.request.urlopen(req, timeout=2) as resp:
            spec = json.loads(resp.read().decode('utf-8'))
            title = spec.get('info', {}).get('title', f'Service-Port-{p}')
            paths = spec.get('paths', {})
            for path_name, path_item in paths.items():
                for method, op in path_item.items():
                    if method in ('get', 'post', 'put', 'delete', 'patch'):
                        inventory.append({
                            'service': title,
                            'port': p,
                            'method': method.upper(),
                            'path': path_name,
                            'summary': op.get('summary', ''),
                            'auth_required': bool(op.get('security')),
                            'roles': 'Unknown',
                            'source': 'live_openapi'
                        })
    except Exception:
        pass

# 2. Parse .NET Controllers (CompanyApi, UserApi, TransactionApi)
net_dir = r'Supabase Backend\Ai-interview-platform\Knitnet.Backend'
if os.path.exists(net_dir):
    for root, dirs, files in os.walk(net_dir):
        for f in files:
            if f.endswith('Controller.cs') or f.endswith('Controllers.cs'):
                service_name = 'Knitnet.CompanyApi' if 'Company' in root else ('Knitnet.UserApi' if 'User' in root else 'Knitnet.TransactionApi')
                path_fp = os.path.join(root, f)
                with open(path_fp, encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()
                    
                    route_prefix_m = re.search(r'\[Route\("([^"]+)"\)\]', content)
                    ctrl_name = f.replace('Controller.cs', '').replace('Controllers.cs', '').lower()
                    prefix = route_prefix_m.group(1).replace('[controller]', ctrl_name) if route_prefix_m else ctrl_name
                    has_class_auth = '[Authorize' in content
                    
                    method_blocks = re.findall(r'(\[Http(Get|Post|Put|Delete|Patch)(?:\("([^"]*)"\))?\][\s\S]*?(?:public|async)[\s\S]*?\s+([A-Za-z0-9_]+)\s*\()', content)
                    for full, http_verb, sub_path, action_name in method_blocks:
                        endpoint = f'/{prefix}/{sub_path}'.replace('//', '/').rstrip('/')
                        inventory.append({
                            'service': service_name,
                            'port': 5000 if 'Company' in service_name else (5001 if 'User' in service_name else 5004),
                            'method': http_verb.upper(),
                            'path': endpoint if endpoint else f'/{prefix}',
                            'action': action_name,
                            'auth_required': has_class_auth or '[Authorize' in full,
                            'roles': 'Company' if 'Company' in service_name else ('User' if 'User' in service_name else 'None'),
                            'source': 'csharp_ast'
                        })

# 3. Parse Data Service routes (server.js)
ds_file = r'Backend\Data Service\server.js'
if os.path.exists(ds_file):
    with open(ds_file, encoding='utf-8', errors='ignore') as fp:
        content = fp.read()
        routes = re.findall(r"app\.(get|post|put|delete|patch)\(['\"]([^'\"]+)['\"]", content)
        for method, path in routes:
            inventory.append({
                'service': 'Backend.DataService',
                'port': 5003,
                'method': method.upper(),
                'path': path,
                'auth_required': False,
                'roles': 'Public/Internal',
                'source': 'express_routes'
            })

# 4. Parse Aptitude server.py routes
apt_file = r'Backend\Aptitude Module\Aptitude session\AptitudeIQ\server.py'
if os.path.exists(apt_file):
    with open(apt_file, encoding='utf-8', errors='ignore') as fp:
        content = fp.read()
        routes = re.findall(r"@app\.route\(['\"]([^'\"]+)['\"].*?methods=\[([^\]]+)\]", content)
        for path, methods_str in routes:
            for m in methods_str.replace('"', '').replace("'", "").split(','):
                inventory.append({
                    'service': 'Backend.AptitudeModule',
                    'port': 5002,
                    'method': m.strip().upper(),
                    'path': path,
                    'auth_required': False,
                    'roles': 'Candidate/Internal',
                    'source': 'flask_routes'
                })

# 5. Parse AI Interview Module / Chumma routes
ai_file = r'Backend\AI Interview Module\chumma\module2_server.py'
if os.path.exists(ai_file):
    with open(ai_file, encoding='utf-8', errors='ignore') as fp:
        content = fp.read()
        routes = re.findall(r"@app\.(get|post|put|delete)\(['\"]([^'\"]+)['\"]", content)
        for method, path in routes:
            inventory.append({
                'service': 'Backend.AIInterviewModule',
                'port': 8002,
                'method': method.upper(),
                'path': path,
                'auth_required': False,
                'roles': 'Candidate/Internal',
                'source': 'fastapi_routes'
            })

# 6. Parse Coding Module routes
coding_file = r'Backend\Coding Module\Coding-module-backend-intervista-\app\main.py'
if os.path.exists(coding_file):
    with open(coding_file, encoding='utf-8', errors='ignore') as fp:
        content = fp.read()
        routes = re.findall(r"@app\.(get|post|put|delete)\(['\"]([^'\"]+)['\"]", content)
        for method, path in routes:
            inventory.append({
                'service': 'Backend.CodingModule',
                'port': 8005,
                'method': method.upper(),
                'path': path,
                'auth_required': False,
                'roles': 'Candidate/Internal',
                'source': 'fastapi_routes'
            })

# 7. Parse Communication Module routes
comm_file = r'Backend\Communication Module\communication_module\app\main.py'
if os.path.exists(comm_file):
    with open(comm_file, encoding='utf-8', errors='ignore') as fp:
        content = fp.read()
        routes = re.findall(r"@app\.(get|post|put|delete)\(['\"]([^'\"]+)['\"]", content)
        for method, path in routes:
            inventory.append({
                'service': 'Backend.CommunicationModule',
                'port': 8004,
                'method': method.upper(),
                'path': path,
                'auth_required': False,
                'roles': 'Candidate/Internal',
                'source': 'fastapi_routes'
            })

report = {
    'total_endpoints': len(inventory),
    'generated_at': '2026-08-26',
    'endpoints': inventory
}

with open('security/reports/api-inventory.json', 'w', encoding='utf-8') as fp:
    json.dump(report, fp, indent=2)

print(f'API inventory complete! Cataloged {len(inventory)} endpoints across all services.')
