@echo off
setlocal
cd /d "%~dp0"

rem ---------------------------------------------------------------------
rem  Local backend launcher.
rem
rem  Loads development secrets from the gitignored .env.bat file (if any),
rem  prints SAFE startup diagnostics (never the Client Secret), then starts
rem  Spring Boot with the exact process environment that the backend sees.
rem
rem  To (re)create .env.bat, open a PowerShell session where
rem  $env:GOOGLE_CLIENT_ID and $env:GOOGLE_CLIENT_SECRET are set and run:
rem      Set-Content -Encoding ascii .env.bat "@echo off`r`nset `"GOOGLE_CLIENT_ID=$env:GOOGLE_CLIENT_ID`"`r`nset `"GOOGLE_CLIENT_SECRET=$env:GOOGLE_CLIENT_SECRET`""
rem ---------------------------------------------------------------------

set "GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth/google/callback"

rem Load local secrets without EVER echoing their values.
if exist ".env.bat" call ".env.bat"

rem SAFE startup diagnostics (values are never printed).
set "GOOGLE_CONFIGURED=false"
if defined GOOGLE_CLIENT_ID if defined GOOGLE_CLIENT_SECRET set "GOOGLE_CONFIGURED=true"
echo [start-backend] Google OAuth configured: %GOOGLE_CONFIGURED%
if defined GOOGLE_CLIENT_ID (
  echo [start-backend] Client ID present: true
) else (
  echo [start-backend] Client ID present: false
  echo [start-backend] WARNING: GOOGLE_CLIENT_ID is not set. 1>&2
)
if defined GOOGLE_CLIENT_SECRET (
  echo [start-backend] Client Secret present: true
) else (
  echo [start-backend] Client Secret present: false
  echo [start-backend] WARNING: GOOGLE_CLIENT_SECRET is not set. 1>&2
)
echo [start-backend] Redirect URI: %GOOGLE_REDIRECT_URI%

rem JWT presence guard: fail fast with a clear, secret-safe message instead of a
rem cryptic Spring placeholder error when JWT_SECRET is missing. The value is
rem never printed here.
if not defined JWT_SECRET (
  echo [start-backend] FATAL: JWT_SECRET is not set. 1>&2
  echo [start-backend] Start the backend via .\start-backend.bat so that .env.bat is loaded.
  echo [start-backend] If .env.bat exists, add 'set "JWT_SECRET=..."' to it. 1>&2
  exit /b 1
)
echo [start-backend] JWT_SECRET present: true

call mvnw.cmd spring-boot:run
exit /b %ERRORLEVEL%