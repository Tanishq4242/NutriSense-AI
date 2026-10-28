from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from app.core.security import CurrentUser
from app.repositories import firestore as repository
from app.schemas import CopyDiaryRequest, FoodLogCreate, FoodLogUpdate
from app.api.routes.foods import resolve_food
from app.services.nutrition import scale_nutrition

router = APIRouter(prefix="/api/food-logs", tags=["food diary"])


async def _snapshot(food_id: str, quantity_g: float, uid: str) -> dict[str, Any]:
    food = await resolve_food(food_id, uid)
    if food is None:
        raise HTTPException(404, "Food record not found. Search the catalog again and retry.")
    return {
        "food_id": food_id,
        "food_name": food["name"],
        "quantity_g": quantity_g,
        "nutrition_snapshot": scale_nutrition(food["nutrients"], quantity_g, food.get("reference_quantity", 100)),
        "source": food.get("source"),
        "data_quality": food.get("data_quality", "unknown"),
    }


@router.get("")
def list_logs(user: CurrentUser, selected_date: date | None = Query(default=None, alias="date")) -> dict[str, Any]:
    chosen = selected_date or date.today()
    return {"items": repository.logs_for_date(user["uid"], chosen), "date": chosen.isoformat()}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_log(payload: FoodLogCreate, user: CurrentUser) -> dict[str, Any]:
    row = await _snapshot(payload.food_id, payload.quantity_g, user["uid"])
    row.update({"date": payload.date.isoformat(), "meal_category": payload.meal_category})
    return repository.add_food_log(user["uid"], row)


@router.put("/{log_id}")
async def edit_log(log_id: str, payload: FoodLogUpdate, user: CurrentUser) -> dict[str, Any]:
    existing = repository.get_food_log(user["uid"], log_id)
    if existing is None:
        raise HTTPException(404, "Food diary entry not found.")
    row = await _snapshot(existing["food_id"], payload.quantity_g, user["uid"])
    row["meal_category"] = payload.meal_category
    result = repository.update_food_log(user["uid"], log_id, row)
    if result is None:
        raise HTTPException(404, "Food diary entry not found.")
    return result


@router.post("/copy")
def copy_diary(payload: CopyDiaryRequest, user: CurrentUser) -> dict[str, int]:
    if payload.source_date == payload.target_date:
        raise HTTPException(422, "Choose a different source and target date.")
    entries = repository.logs_for_date(user["uid"], payload.source_date)
    for entry in entries:
        row = {key: entry[key] for key in ("food_id", "food_name", "quantity_g", "nutrition_snapshot", "source", "data_quality", "meal_category") if key in entry}
        row["date"] = payload.target_date.isoformat()
        repository.add_food_log(user["uid"], row)
    return {"count": len(entries)}


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_log(log_id: str, user: CurrentUser) -> None:
    if not repository.delete_food_log(user["uid"], log_id):
        raise HTTPException(404, "Food diary entry not found.")

