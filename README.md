# Q-Med

Q-Med is an Expo frontend plus a FastAPI backend for camera, heartbeat audio,
SCG, stress, blood pressure, chatbot, and MedGemma-assisted health reports.

## Repository Layout

```text
QMED_LNQ/
|- backend/     FastAPI API, inference services, and model checkpoints
`- frontend/    Expo React Native app for web, Android, and iOS
```

## Backend

The backend requires Python 3.11 and the packages in `backend/requirements.txt`.
It listens on port `6789` by default.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:HF_TOKEN="hf_your_token_here"
python -m uvicorn app.infrastructure.web.main:app --host 0.0.0.0 --port 6789
```

On macOS/Linux, activate the virtual environment with
`source .venv/bin/activate` and export `HF_TOKEN` instead.

The Hugging Face token is only needed when the chatbot/MedGemma model must be
downloaded. Accept the model terms on Hugging Face before starting the server.
Never commit a real token to this repository.

Health check:

```text
http://localhost:6789/health
```

Docker is also supported:

```bash
cd backend
docker build -t qmed-api .
docker run --rm -p 6789:6789 --env HF_TOKEN=hf_your_token_here qmed-api
```

## Frontend

The frontend stores the health profile and measurement history locally and does
not require an account. Start it after the backend is available:

```powershell
cd frontend
npm install
npx expo start --web
```

Default API URLs:

- Web/iOS: `http://localhost:6789/api`
- Android emulator: `http://10.0.2.2:6789/api`

For a remote backend, set `EXPO_PUBLIC_API_URL` to the full `/api` URL before
starting Expo.

## Implemented Features

- Anonymous profile setup with local persistence
- Camera video recording and gallery upload for rPPG, stress, and blood pressure
- Browser MediaRecorder camera support
- Native and browser heartbeat audio recording with WAV upload on web
- SCG accelerometer capture and backend analysis
- Chatbot requests with measurement and health-profile context
- Local measurement history, statistics, and result reports
- Git LFS storage for backend model checkpoints

The application is a health-assistance tool and its results are not a medical
diagnosis.
