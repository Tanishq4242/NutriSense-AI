# NutriSense AI

NutriSense AI is a nutrition tracking and meal planning project for educational and informational use. It combines a React + TypeScript client, a FastAPI REST API, Firebase Authentication, and per-user Cloud Firestore records. Nutrition arithmetic is deterministic; the initial meal recommender is an explainable, constraint-first ranking system, not a trained medical or machine-learning model.

## Architecture and phases

The repository was empty when implementation began. The implementation is organized into these demonstrable phases:

1. **Foundation and identity:** Vite/React shell, Firebase email/password authentication, protected routes, and onboarding.
2. **Food and diary:** local reference catalog with source labels, food search, quantity calculations, and date-based logs.
3. **Planning and personalization:** recipe catalog, allergy/diet hard filters, target-aware ranking, and saved plans.
4. **Analytics and hydration:** Firestore-backed daily/weekly summaries and water logs.
5. **Security and delivery:** token verification, per-user paths, tests, environment examples, Firebase rules, deployment and demo documentation.

The image scanner is deliberately shown as unavailable until a real model and weights are configured. It never returns invented labels. Local food entries are starter reference estimates and need dataset verification before product use; records expose their provenance and quality status.

## Requirements

- Node.js 20.19+ or 22.12+, pnpm 10+
- Python 3.11+
- A Firebase project with Email/Password Authentication and Cloud Firestore enabled
- Optional Firebase Storage bucket for photo storage integrations
- Optional USDA FoodData Central API key for extended catalog search

## Local setup

1. Copy `frontend/.env.example` to `frontend/.env.local` and enter the public Firebase web configuration plus `VITE_API_BASE_URL=http://127.0.0.1:8000`.
2. Copy `backend/.env.example` to `backend/.env`. Set `FIREBASE_PROJECT_ID`, `ALLOWED_ORIGINS=http://localhost:5173`, and use Application Default Credentials (`gcloud auth application-default login`) or a service-account file kept outside Git. For an emulator, set `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST`.
3. Install and run:

   ```powershell
   pnpm install
   pnpm --dir frontend dev
   ```

   In another terminal:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r backend/requirements.txt
   uvicorn app.main:app --reload --app-dir backend
   ```

4. Open `http://localhost:5173`. API documentation is at `http://127.0.0.1:8000/docs`.

The API does not accept unverified identity headers. If Firebase credentials are absent, the health endpoint reports that cloud integration is not ready and protected requests fail closed. No demo user or fabricated production metrics are included.

## Environment variables

See `frontend/.env.example` and `backend/.env.example`. Firebase web config values are public client configuration, not Admin credentials. Never put service-account JSON, USDA API keys, or any server secret in a `VITE_` variable.

## Deploy

- **Frontend:** import the repo into Vercel, set the Root Directory to `frontend`, set the `VITE_*` Firebase values and API base URL, and use the included `vercel.json` rewrite for SPA routes.
- **Backend:** deploy the root `Dockerfile` to a container host or deploy `backend/` directly to a Python ASGI host. Run `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, and provide secure workload identity/Application Default Credentials or the host's secret manager. Set `FIREBASE_PROJECT_ID` and the exact frontend origins in `ALLOWED_ORIGINS`.
- **Firebase:** enable Email/Password in Authentication, add local and deployed frontend domains to Authorized domains, create Firestore in production mode, and deploy `firestore.rules` and `firestore.indexes.json`. The backend uses Admin SDK authorization; client Firestore reads/writes are denied by default.
- Test the deployed API `/api/health`, sign in on the frontend, and confirm a profile or food log persists for the authenticated account.

## Privacy, safety, and limitations

Nutrition values vary by brand, recipe, preparation, and serving size. The app is not a medical device and does not diagnose, treat, or replace a qualified professional. A photo classifier cannot establish portion mass or exact calories; image recognition stays disabled until a real model is installed and evaluated. Local reference entries are identified as estimates and should be replaced with verified licensed records. Account export and deletion are exposed in settings; account deletion covers the user's Firestore subcollections and Storage prefix, with Firebase Auth deletion performed last.

## Demonstration workflow

Configure Firebase first, then register, complete onboarding, search the catalog, add a gram quantity to the diary, inspect daily/weekly analytics, generate a meal plan, record water, export data, and review Settings. A new account sees explicit empty states until records exist. Use the backend test suite to demonstrate arithmetic, recommendation constraints, and authorization boundaries.

