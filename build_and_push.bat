@echo off
call npm run build
if %errorlevel% neq 0 (
  echo Build failed with error %errorlevel%
  exit /b %errorlevel%
)
git add .
git commit -m "fix: Always skip 1st header row when loading CSV and filter out header metadata rows"
git push origin master
echo Done!
