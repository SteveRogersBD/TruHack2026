param (
    [Parameter(Mandatory=$true)]
    [string]$Message
)

Write-Host "🚀 Adding changes..." -ForegroundColor Cyan
git add .

Write-Host "📝 Committing: $Message" -ForegroundColor Green
git commit -m "$Message"

Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "✅ Done!" -ForegroundColor Green
