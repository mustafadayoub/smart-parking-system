# Stop stack, wipe volumes, rebuild, and start in detached mode.
$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Stopping containers and removing volumes..." -ForegroundColor Yellow
docker compose down -v

Write-Host "Building and starting stack..." -ForegroundColor Cyan
docker compose up --build -d

Write-Host "Waiting for API health..." -ForegroundColor Cyan
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 3
        if ($response.status -eq "ok") {
            $healthy = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if ($healthy) {
    Write-Host "API is healthy at http://localhost:8000" -ForegroundColor Green
    Write-Host "Swagger: http://localhost:8000/docs" -ForegroundColor Green
    Write-Host "Frontend: cd frontend; npm run dev -> http://localhost:5173" -ForegroundColor Green
    Write-Host ""
    Write-Host "Demo accounts:" -ForegroundColor White
    Write-Host "  Driver:     driver@example.com / Driver123!"
    Write-Host "  Management: admin@example.com / Admin123!"
} else {
    Write-Host "API did not become healthy in time. Check logs with: docker compose logs api" -ForegroundColor Red
    exit 1
}
