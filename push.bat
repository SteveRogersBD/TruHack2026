@echo off
set "msg=%~1"

if "%msg%"=="" (
    echo ❌ Error: You must provide a commit message.
    echo Usage: push "Your message here"
    exit /b 1
)

echo 🚀 Adding changes...
git add .

echo 📝 Committing: %msg%
git commit -m "%msg%"

echo 📤 Pushing to GitHub...
git push origin main

echo ✅ Done!
