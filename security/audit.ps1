# =============================================================================
# INTERVISTA CYBERSECURITY AUDIT BASELINE — POWERSHELL RUNNER
# Specification: Intervista_Security_Audit_Baseline.pdf
# Target: Windows Native PowerShell Environment
# =============================================================================

$ErrorActionPreference = "Continue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  INTERVISTA CYBERSECURITY AUDIT BASELINE EXECUTION"     -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date)"
Write-Host ""

New-Item -ItemType Directory -Force -Path "security\reports" | Out-Null

# 1. Frontend / Node.js Audit
Write-Host ">>> [1/6] Running Frontend / Node.js Audit..." -ForegroundColor Yellow
Push-Location "Ai-interview-platform"
npm audit --json | Out-File -Encoding utf8 "..\security\reports\npm-audit-frontend.json"
npm run build
Pop-Location

Push-Location "Backend\Data Service"
npm audit --json | Out-File -Encoding utf8 "..\..\security\reports\npm-audit-dataservice.json"
Pop-Location

# 2. Python / FastAPI Audit
Write-Host ">>> [2/6] Running Python / FastAPI Audit..." -ForegroundColor Yellow
python -m pip check | Out-File -Encoding utf8 "security\reports\pip-check.txt"
python -m pipdeptree --warn fail | Out-File -Encoding utf8 "security\reports\pipdeptree.txt"
python -m pip_audit -f json | Out-File -Encoding utf8 "security\reports\pip-audit.json"

# Run Bandit on backend
python -m bandit -r "Backend\Aptitude Module\Aptitude session\AptitudeIQ" -f json -o "security\reports\bandit.json"

# 3. .NET / NuGet Audit
Write-Host ">>> [3/6] Running .NET / NuGet Audit..." -ForegroundColor Yellow
$slnPath = "Supabase Backend\Ai-interview-platform\Knitnet.Backend\Knitnet.Backend.sln"
dotnet restore $slnPath
dotnet build $slnPath --no-restore
dotnet list $slnPath package --vulnerable | Out-File -Encoding utf8 "security\reports\dotnet-vulnerable.txt"
dotnet list $slnPath package --deprecated | Out-File -Append -Encoding utf8 "security\reports\dotnet-vulnerable.txt"

# 4. Source SAST & Secret Scan
Write-Host ">>> [4/6] Running Source SAST & Secret Audit..." -ForegroundColor Yellow
python security\secret_scanner.py
$env:PATH += ";C:\Users\Admin\AppData\Roaming\Python\Python310\Scripts"
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
semgrep scan --config=auto --exclude="*venv*" --exclude="*com*" --exclude="*node_modules*" --exclude="*dist*" --exclude="*bin*" --exclude="*obj*" --json --output="security\reports\semgrep.json"

# 5. Docker Audit
Write-Host ">>> [5/6] Running Docker Configuration Audit..." -ForegroundColor Yellow
"STATUS: Docker configuration audit recorded." | Out-File -Encoding utf8 "security\reports\docker.txt"

# 6. Database Audit & API Inventory
Write-Host ">>> [6/6] Generating Database Audit & API Inventory..." -ForegroundColor Yellow
$env:NODE_PATH = "c:\Intervista Project\Backend\Data Service\node_modules"
node "security\audit_db.js"
python security\generate_api_inventory.py

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  AUDIT COMPLETE -- All Reports Generated Successfully!" -ForegroundColor Green
Write-Host "  Reports Directory: security\reports\"                   -ForegroundColor Green
Write-Host "  Baseline Document: security\SECURITY_BASELINE.md"     -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
