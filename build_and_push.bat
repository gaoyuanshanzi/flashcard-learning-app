@echo off
call npm run build
if %errorlevel% neq 0 (
  echo Build failed with error %errorlevel%
  exit /b %errorlevel%
)
git add .
git commit -m "feat: Neon DB CSV file-level manager, selective file deletion, and complete DB wipe"
git push origin master
echo Done!
