# Architecture

```text
React + TypeScript (Vite)
  ├─ Firebase Authentication (email/password; browser ID token)
  └─ FastAPI REST API (Authorization: Bearer <Firebase ID token>)
       ├─ Firebase Admin token verification
       ├─ Firestore repository: users/{uid}/... (server-side only)
       ├─ deterministic nutrition calculation service
       ├─ local FDC catalog + optional USDA FDC API search
       ├─ constraint-first meal ranking service
       └─ analytics and image validation services
```

The frontend owns presentation and obtains Firebase ID tokens. The API verifies tokens and derives `uid`; endpoints never accept a user ID for selecting a private data path. Firestore client rules deny direct access, so users cannot bypass API authorization. Each food log snapshots the displayed food name, source, quantity, and nutrient values at save time; changes to catalog records do not rewrite historical entries.

## Layers

- `frontend/src/app`: route guards, auth state, query client.
- `frontend/src/lib`: typed API wrapper, auth adapter, configuration, and shared utilities.
- `frontend/src/pages`: route-level screens.
- `backend/app/api/routes`: request/response and HTTP status behavior.
- `backend/app/repositories/firestore.py`: user-scoped persistence.
- `backend/app/services`: deterministic nutrition, analytics, catalog and recommendation logic.
- `data`: sourced food and recipe records shared with the backend services.

## Trust boundaries

Email/password registration and sign-in happen through Firebase's browser SDK. The API accepts only Firebase bearer tokens; missing/invalid tokens fail closed. Server credentials come from Application Default Credentials or a hosting secret manager. Nutrition API keys stay in backend environment variables. CORS allows only configured origins. Image uploads are type, size, and decode validated, but prediction stays unavailable without an implemented and evaluated model adapter.

## External configuration

Firebase client config is required in `frontend/.env.local`; Firebase Admin project ID and credentials are required in `backend/.env`/hosting secrets. USDA FoodData Central search is optional and needs a backend API key. Vercel serves only the static React build; the Python API must run on a Python ASGI host.

