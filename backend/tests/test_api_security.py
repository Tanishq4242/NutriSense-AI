from datetime import date
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.core.security import get_current_user
from app.main import app
from app.repositories import firestore as repository
from app.core.config import settings


def test_protected_route_rejects_missing_bearer_token() -> None:
    with TestClient(app) as client:
        response = client.get("/api/profile")
    assert response.status_code == 401


def test_food_log_creation_and_deletion_are_scoped_to_authenticated_uid(monkeypatch) -> None:
    captured: dict[str, str] = {}
    app.dependency_overrides[get_current_user] = lambda: {"uid": "user-a"}
    monkeypatch.setattr(repository, "add_food_log", lambda uid, data: (captured.update(uid=uid) or {"id": "entry-a", **data}))
    monkeypatch.setattr(repository, "delete_food_log", lambda uid, log_id: captured.update(delete_uid=uid, delete_id=log_id) or False)
    try:
        with TestClient(app) as client:
            created = client.post("/api/food-logs", json={"food_id": "fdc:2708346", "quantity_g": 100, "date": "2026-10-28", "meal_category": "lunch"})
            assert created.status_code == 201
            assert captured["uid"] == "user-a"
            denied = client.delete("/api/food-logs/entry-b")
            assert denied.status_code == 404
            assert captured["delete_uid"] == "user-a"
            assert captured["delete_id"] == "entry-b"
    finally:
        app.dependency_overrides.clear()


def test_invalid_food_quantity_returns_validation_error() -> None:
    app.dependency_overrides[get_current_user] = lambda: {"uid": "user-a"}
    try:
        with TestClient(app) as client:
            response = client.post("/api/food-logs", json={"food_id": "fdc:2708346", "quantity_g": 5001, "date": date.today().isoformat(), "meal_category": "lunch"})
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_food_log_edit_updates_only_the_callers_entry(monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: {"uid": "user-a"}
    seen: dict[str, object] = {}

    def get_log(uid: str, log_id: str):
        seen["read_uid"] = uid
        return {"id": log_id, "food_id": "fdc:2708346", "date": "2026-10-27"} if uid == "user-a" and log_id == "entry-a" else None

    def update_log(uid: str, log_id: str, data: dict):
        seen.update(write_uid=uid, write_id=log_id, quantity=data["quantity_g"])
        return {"id": log_id, **data}

    monkeypatch.setattr(repository, "get_food_log", get_log)
    monkeypatch.setattr(repository, "update_food_log", update_log)
    try:
        with TestClient(app) as client:
            edited = client.put("/api/food-logs/entry-a", json={"quantity_g": 150, "meal_category": "lunch"})
            foreign = client.put("/api/food-logs/entry-b", json={"quantity_g": 150, "meal_category": "lunch"})
        assert edited.status_code == 200
        assert edited.json()["nutrition_snapshot"]["calories"] == 192
        assert seen == {"read_uid": "user-a", "write_uid": "user-a", "write_id": "entry-a", "quantity": 150}
        assert foreign.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_photo_endpoint_rejects_unapproved_content_type() -> None:
    app.dependency_overrides[get_current_user] = lambda: {"uid": "user-a"}
    try:
        with TestClient(app) as client:
            response = client.post("/api/food-recognition/predict", files={"image": ("notes.txt", b"not an image", "text/plain")})
        assert response.status_code == 415
    finally:
        app.dependency_overrides.clear()


def test_photo_endpoint_rejects_malformed_image() -> None:
    app.dependency_overrides[get_current_user] = lambda: {"uid": "user-a"}
    try:
        with TestClient(app) as client:
            response = client.post("/api/food-recognition/predict", files={"image": ("meal.jpg", b"not an image", "image/jpeg")})
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_valid_photo_returns_explicit_model_unavailable_state() -> None:
    app.dependency_overrides[get_current_user] = lambda: {"uid": "user-a"}
    buffer = BytesIO()
    Image.new("RGB", (12, 12), color="white").save(buffer, format="JPEG")
    try:
        with TestClient(app) as client:
            response = client.post("/api/food-recognition/predict", files={"image": ("meal.jpg", buffer.getvalue(), "image/jpeg")})
        assert response.status_code == 503
        assert "model path" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_photo_endpoint_enforces_upload_size_limit(monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: {"uid": "user-a"}
    monkeypatch.setattr(settings, "max_image_bytes", 12)
    try:
        with TestClient(app) as client:
            response = client.post("/api/food-recognition/predict", files={"image": ("meal.jpg", b"x" * 13, "image/jpeg")})
        assert response.status_code == 413
    finally:
        app.dependency_overrides.clear()

