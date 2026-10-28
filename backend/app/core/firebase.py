from __future__ import annotations

import os
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import HTTPException, status

from app.core.config import settings

_firestore_client: Any | None = None
_firebase_error: str | None = None


def _apply_sdk_environment() -> None:
    sdk_environment = {
        "GOOGLE_APPLICATION_CREDENTIALS": settings.google_application_credentials,
        "FIRESTORE_EMULATOR_HOST": settings.firestore_emulator_host,
        "FIREBASE_AUTH_EMULATOR_HOST": settings.firebase_auth_emulator_host,
    }
    for name, value in sdk_environment.items():
        if value:
            os.environ.setdefault(name, value)


def initialize_firebase() -> None:
    global _firestore_client, _firebase_error
    _apply_sdk_environment()
    if not settings.firebase_project_id:
        _firebase_error = "FIREBASE_PROJECT_ID is not configured"
        return
    try:
        try:
            app = firebase_admin.get_app()
        except ValueError:
            options: dict[str, str] = {"projectId": settings.firebase_project_id}
            if settings.firebase_storage_bucket:
                options["storageBucket"] = settings.firebase_storage_bucket
            app = firebase_admin.initialize_app(credentials.ApplicationDefault(), options)
        _firestore_client = firestore.client(app=app)
        _firebase_error = None
    except Exception as exc:  # credentials are supplied by the deployment environment
        _firestore_client = None
        _firebase_error = f"Firebase initialization failed ({type(exc).__name__})"


def firebase_ready() -> bool:
    return _firestore_client is not None


def firebase_status() -> str:
    return "ready" if firebase_ready() else (_firebase_error or "not initialized")


def get_db() -> Any:
    if _firestore_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloud data is unavailable. Configure Firebase Admin credentials and FIREBASE_PROJECT_ID.",
        )
    return _firestore_client

