from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import account, analytics, diary, favorites, food_recognition, foods, insights, meal_plans, nutrition, profile, water
from app.core.config import settings
from app.core.firebase import firebase_status, initialize_firebase


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_firebase()
    yield


app = FastAPI(
    title="NutriSense AI API",
    description="Authenticated nutrition tracking, deterministic calculations, and explainable meal recommendations.",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str | bool]:
    status_value = firebase_status()
    return {"status": "ok", "firebase_ready": status_value == "ready", "firebase": status_value}


for router in (profile.router, foods.router, nutrition.router, diary.router, analytics.router, water.router, meal_plans.router, food_recognition.router, account.router, favorites.router, insights.router):
    app.include_router(router)

