from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from app.core.security import CurrentUser
from app.repositories import firestore as repository
from app.schemas import WaterLogCreate, WaterLogUpdate

router = APIRouter(prefix="/api/water-logs", tags=["hydration"])


@router.get("")
def list_water(user: CurrentUser, selected_date: date | None = Query(default=None, alias="date")) -> dict[str, Any]:
    chosen = selected_date or date.today()
    entries = repository.water_logs(user["uid"], chosen)
    profile = repository.get_profile(user["uid"])
    return {"date": chosen.isoformat(), "items": entries, "total_ml": sum(int(item["quantity_ml"]) for item in entries), "goal_ml": int(profile.get("water_goal_ml", 2000))}


@router.post("", status_code=status.HTTP_201_CREATED)
def add_water(payload: WaterLogCreate, user: CurrentUser) -> dict:
    return repository.add_water_log(user["uid"], {"date": payload.date.isoformat(), "quantity_ml": payload.quantity_ml, "unit": "ml"})


@router.patch("/{log_id}")
def edit_water(log_id: str, payload: WaterLogUpdate, user: CurrentUser) -> dict:
    updated = repository.update_water_log(user["uid"], log_id, payload.quantity_ml)
    if updated is None:
        raise HTTPException(404, "Hydration entry not found.")
    return updated


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_water(log_id: str, user: CurrentUser) -> None:
    if not repository.delete_water_log(user["uid"], log_id):
        raise HTTPException(404, "Hydration entry not found.")

