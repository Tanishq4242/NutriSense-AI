from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from app.core.firebase import get_db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def user_ref(uid: str) -> Any:
    return get_db().collection("users").document(uid)


def get_profile(uid: str) -> dict[str, Any]:
    snapshot = user_ref(uid).get()
    if snapshot.exists:
        return snapshot.to_dict() or {}
    return {"display_name": "", "onboarding_complete": False, "targets": {"calories": 2000, "protein": 75}, "water_goal_ml": 2000, "budget_preference": "any"}


def put_profile(uid: str, data: dict[str, Any]) -> dict[str, Any]:
    ref = user_ref(uid)
    existing = ref.get().to_dict() or {}
    targets = dict(existing.get("targets", {}))
    if data.get("calorie_target") is not None:
        targets["calories"] = data["calorie_target"]
    if data.get("protein_target") is not None:
        targets["protein"] = data["protein_target"]
    clean = {key: value for key, value in data.items() if key not in {"calorie_target", "protein_target"}}
    clean.update({"targets": targets, "updated_at": _now(), "created_at": existing.get("created_at", _now())})
    ref.set(clean, merge=True)
    return clean


def logs_for_date(uid: str, selected: date) -> list[dict[str, Any]]:
    docs = user_ref(uid).collection("foodLogs").where("date_key", "==", selected.isoformat()).stream()
    return sorted([{"id": doc.id, **(doc.to_dict() or {})} for doc in docs], key=lambda row: row.get("created_at", ""))


def logs_between(uid: str, start: date, end: date) -> list[dict[str, Any]]:
    docs = user_ref(uid).collection("foodLogs").where("date_key", ">=", start.isoformat()).where("date_key", "<=", end.isoformat()).stream()
    return [{"id": doc.id, **(doc.to_dict() or {})} for doc in docs]


def add_food_log(uid: str, data: dict[str, Any]) -> dict[str, Any]:
    now = _now()
    log_id = uuid4().hex
    row = {**data, "date_key": data["date"], "created_at": now, "updated_at": now}
    user_ref(uid).collection("foodLogs").document(log_id).set(row)
    return {"id": log_id, **row}


def update_food_log(uid: str, log_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
    ref = user_ref(uid).collection("foodLogs").document(log_id)
    snapshot = ref.get()
    if not snapshot.exists:
        return None
    existing = snapshot.to_dict() or {}
    ref.update({**data, "updated_at": _now()})
    existing.update(data)
    existing["updated_at"] = _now()
    return {"id": log_id, **existing}


def get_food_log(uid: str, log_id: str) -> dict[str, Any] | None:
    snapshot = user_ref(uid).collection("foodLogs").document(log_id).get()
    return {"id": log_id, **(snapshot.to_dict() or {})} if snapshot.exists else None


def get_custom_food(uid: str, custom_id: str) -> dict[str, Any] | None:
    snapshot = user_ref(uid).collection("customFoods").document(custom_id).get()
    return {"id": f"custom:{custom_id}", **(snapshot.to_dict() or {})} if snapshot.exists else None


def list_custom_foods(uid: str) -> list[dict[str, Any]]:
    docs = user_ref(uid).collection("customFoods").order_by("name").limit(100).stream()
    return [{"id": f"custom:{doc.id}", **(doc.to_dict() or {})} for doc in docs]


def save_custom_food(uid: str, data: dict[str, Any]) -> dict[str, Any]:
    custom_id = uuid4().hex
    row = {**data, "reference_quantity": 100, "serving_unit": "g", "source": "User provided", "source_id": custom_id, "data_quality": "user-provided; confirm against packaging or source", "created_at": _now()}
    user_ref(uid).collection("customFoods").document(custom_id).set(row)
    return {"id": f"custom:{custom_id}", **row}


def list_favorites(uid: str, favorite_type: str | None = None) -> list[dict[str, Any]]:
    query = user_ref(uid).collection("favorites")
    if favorite_type:
        query = query.where("favorite_type", "==", favorite_type)
    return [{"id": doc.id, **(doc.to_dict() or {})} for doc in query.limit(200).stream()]


def save_favorite(uid: str, data: dict[str, Any]) -> dict[str, Any]:
    existing = next((item for item in list_favorites(uid, data["favorite_type"]) if item.get("reference_id") == data["reference_id"]), None)
    if existing:
        return existing
    favorite_id = uuid4().hex
    row = {**data, "created_at": _now()}
    user_ref(uid).collection("favorites").document(favorite_id).set(row)
    return {"id": favorite_id, **row}


def delete_favorite(uid: str, favorite_id: str) -> bool:
    ref = user_ref(uid).collection("favorites").document(favorite_id)
    if not ref.get().exists:
        return False
    ref.delete()
    return True


def delete_food_log(uid: str, log_id: str) -> bool:
    ref = user_ref(uid).collection("foodLogs").document(log_id)
    if not ref.get().exists:
        return False
    ref.delete()
    return True


def water_logs(uid: str, selected: date) -> list[dict[str, Any]]:
    docs = user_ref(uid).collection("waterLogs").where("date_key", "==", selected.isoformat()).stream()
    return [{"id": doc.id, **(doc.to_dict() or {})} for doc in docs]


def add_water_log(uid: str, data: dict[str, Any]) -> dict[str, Any]:
    log_id = uuid4().hex
    row = {**data, "date_key": data["date"], "created_at": _now()}
    user_ref(uid).collection("waterLogs").document(log_id).set(row)
    return {"id": log_id, **row}


def delete_water_log(uid: str, log_id: str) -> bool:
    ref = user_ref(uid).collection("waterLogs").document(log_id)
    if not ref.get().exists:
        return False
    ref.delete()
    return True


def update_water_log(uid: str, log_id: str, quantity_ml: int) -> dict[str, Any] | None:
    ref = user_ref(uid).collection("waterLogs").document(log_id)
    snapshot = ref.get()
    if not snapshot.exists:
        return None
    ref.update({"quantity_ml": quantity_ml, "unit": "ml", "updated_at": _now()})
    return {"id": log_id, **(snapshot.to_dict() or {}), "quantity_ml": quantity_ml, "unit": "ml", "updated_at": _now()}


def save_meal_plan(uid: str, name: str, plan: dict[str, Any]) -> dict[str, Any]:
    plan_id = uuid4().hex
    row = {"name": name, "plan": plan, "created_at": _now()}
    user_ref(uid).collection("mealPlans").document(plan_id).set(row)
    return {"id": plan_id, **row}


def get_meal_plans(uid: str) -> list[dict[str, Any]]:
    docs = user_ref(uid).collection("mealPlans").order_by("created_at", direction="DESCENDING").limit(50).stream()
    return [{"id": doc.id, **(doc.to_dict() or {})} for doc in docs]


def get_meal_plan(uid: str, plan_id: str) -> dict[str, Any] | None:
    snapshot = user_ref(uid).collection("mealPlans").document(plan_id).get()
    return {"id": plan_id, **(snapshot.to_dict() or {})} if snapshot.exists else None


def export_user_data(uid: str) -> dict[str, Any]:
    root = user_ref(uid)
    profile = root.get().to_dict() or {}
    collections: dict[str, list[dict[str, Any]]] = {}
    for name in ("foodLogs", "waterLogs", "mealPlans", "favorites", "weightLogs", "customFoods"):
        collections[name] = [{"id": doc.id, **(doc.to_dict() or {})} for doc in root.collection(name).stream()]
    return {"uid": uid, "profile": profile, **collections}


def delete_user_data(uid: str) -> None:
    root = user_ref(uid)
    for name in ("foodLogs", "waterLogs", "mealPlans", "favorites", "weightLogs", "customFoods"):
        for doc in root.collection(name).stream():
            doc.reference.delete()
    root.delete()

