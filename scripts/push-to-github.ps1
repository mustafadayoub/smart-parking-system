# رفع مشروع Smart Parking System إلى GitHub
# Usage: .\scripts\push-to-github.ps1
#        .\scripts\push-to-github.ps1 -RepoName "my-repo" -Private

param(
    [string]$RepoName = "smart-parking-system",
    [switch]$Private
)

$ErrorActionPreference = "Stop"
$Gh = "C:\Program Files\GitHub CLI\gh.exe"
$Root = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path $Gh)) {
    Write-Host "GitHub CLI غير مثبت. ثبّته من: https://cli.github.com/" -ForegroundColor Red
    Write-Host "أو استخدم الطريقة اليدوية في أسفل README."
    exit 1
}

Set-Location $Root

Write-Host "`n=== Smart Parking System -> GitHub ===" -ForegroundColor Cyan

# تحقق من تسجيل الدخول
& $Gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nيجب تسجيل الدخول أولاً. سيفتح المتصفح..." -ForegroundColor Yellow
    & $Gh auth login -h github.com -p https -w
    if ($LASTEXITCODE -ne 0) {
        Write-Host "فشل تسجيل الدخول." -ForegroundColor Red
        exit 1
    }
}

$visibility = if ($Private) { "--private" } else { "--public" }

# إن كان remote موجوداً
$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Host "`nRemote موجود: $remote" -ForegroundColor Green
    Write-Host "جاري الرفع..." -ForegroundColor Cyan
    git push -u origin main
    if ($LASTEXITCODE -eq 0) {
        & $Gh repo view --web 2>$null
        Write-Host "`nتم الرفع بنجاح!" -ForegroundColor Green
    }
    exit $LASTEXITCODE
}

Write-Host "`nإنشاء مستودع '$RepoName' ورفع المشروع..." -ForegroundColor Cyan
& $Gh repo create $RepoName $visibility --source=. --remote=origin --push

if ($LASTEXITCODE -eq 0) {
    $url = & $Gh repo view --json url -q .url
    Write-Host "`nتم! المستودع: $url" -ForegroundColor Green
} else {
    Write-Host "`nفشل الإنشاء. قد يكون الاسم مستخدماً — جرّب:" -ForegroundColor Yellow
    Write-Host "  .\scripts\push-to-github.ps1 -RepoName smart-parking-system-2"
}
