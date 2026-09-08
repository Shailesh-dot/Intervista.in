#!/bin/bash
# =============================================================================
# INTERVISTA CYBERSECURITY AUDIT — .NET / NUGET SCRIPT
# =============================================================================

SLN_DIR="Supabase Backend/Ai-interview-platform/Knitnet.Backend"

echo "=== [1/4] Restoring .NET Solution dependencies ==="
dotnet restore "$SLN_DIR"

echo "=== [2/4] Building .NET Solution ==="
dotnet build "$SLN_DIR" --no-restore

echo "=== [3/4] Running .NET NuGet Vulnerability Scan ==="
dotnet list "$SLN_DIR" package --vulnerable > "security/reports/dotnet-vulnerable.txt"
dotnet list "$SLN_DIR" package --deprecated >> "security/reports/dotnet-vulnerable.txt"
dotnet list "$SLN_DIR" package --include-transitive --vulnerable >> "security/reports/dotnet-vulnerable.txt"

echo "=== [4/4] Listing SDKs and Runtimes ==="
dotnet --list-sdks >> "security/reports/dotnet-vulnerable.txt"
dotnet --list-runtimes >> "security/reports/dotnet-vulnerable.txt"

echo ".NET audit complete."
