@echo off
call npm run build
if %errorlevel% neq 0 (
  echo Build failed with error %errorlevel%
  exit /b %errorlevel%
)
git add .
git commit -m "feat: Add Previous button, Noto Sans JP fonts, manual CSV encoding selector (Shift-JIS/EUC-JP/UTF-8)"
git push origin master
echo Done!
