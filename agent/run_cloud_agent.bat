@echo off
echo Starting Agent in CLOUD mode (for Phone Screens)...
cd /d %~dp0

:: Read variables from backend .env manually since cmd doesn't support .env files natively well
:: We will use a simple powershell helper to extract them or just assume they are set if we use the modified main.py
:: Actually, let's just use Python to launch it with the right env vars overrides

python -c "import os, subprocess, dotenv; dotenv.load_dotenv('../backend/.env'); env = os.environ.copy(); env['LIVEKIT_URL'] = env.get('LIVEKIT_CLOUD_URL', ''); env['LIVEKIT_API_KEY'] = env.get('LIVEKIT_CLOUD_API_KEY', ''); env['LIVEKIT_API_SECRET'] = env.get('LIVEKIT_CLOUD_API_SECRET', ''); subprocess.run(['python', 'main.py', 'dev'], env=env)"

pause
