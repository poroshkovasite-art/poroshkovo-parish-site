@echo off
if exist "%~dp0SOURCE_CODE\package.json" (
  cd /d "%~dp0SOURCE_CODE"
) else (
  cd /d "%~dp0"
)
node scripts/build.mjs
if errorlevel 1 (
  echo Build failed. Please read README.md.
  pause
  exit /b 1
)
echo Starting the parish website locally. Close this window or press Ctrl+C to stop.
node scripts/serve.mjs --open
pause
