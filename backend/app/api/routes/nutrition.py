from fastapi import APIRouter, HTTPException

from app.api.routes.foods import resolve_food
from app.core.security import CurrentUser
from app.schemas import CalculateRequest
from app.services.nutrition import calculate_foods

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])


@router.post("/calculate")
async def calculate(payload: CalculateRequest, user: CurrentUser) -> dict:
    foods = {}
    for item in payload.items:
        food = await resolve_food(item.food_id, user["uid"])
        if food is None:
            raise HTTPException(404, f"Food record '{item.food_id}' was not found.")
        foods[item.food_id] = food
    return calculate_foods([item.model_dump() for item in payload.items], foods)

