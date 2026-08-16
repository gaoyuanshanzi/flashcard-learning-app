@echo off
call npm run build
if %errorlevel% neq 0 (
  echo Build failed with error %errorlevel%
  exit /b %errorlevel%
)
git add .
git commit -m "fix: Smart linguistic CSV encoding detector, BOM handling, and live 1-click re-decoder"
git push origin master
echo Done!
