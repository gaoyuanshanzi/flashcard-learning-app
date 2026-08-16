@echo off
call npm run build
if %errorlevel% neq 0 (
  echo Build failed with error %errorlevel%
  exit /b %errorlevel%
)
git add .
git commit -m "fix: Rigorous header keyword filtering (including '일본어', '단어', '日本語') across all loaders and slicers"
git push origin master
echo Done!
