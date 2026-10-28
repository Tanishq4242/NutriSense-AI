from datetime import date

from fastapi import APIRouter, HTTPException, status

from app.core.security import CurrentUser
from app.repositories import firestore as repository
from app.schemas import CopyPlanRequest, MealPlanRequest, MealPlanSave
from app.api.routes.foods import resolve_food
from app.services.nutrition import scale_nutrition
from app.services.recommendations import recommend_meals

router = APIRouter(tags=["meal plans and recommendations"])


@router.post("/api/meal-plans/generate")
@router.post("/api/recommendations/meals")
def generate_plan(payload: MealPlanRequest, user: CurrentUser) -> dict:
    recent = repository.get_meal_plans(user["uid"])
    recent_ids = {meal.get("id") for plan in recent[:5] for meal in plan.get("plan", {}).get("meals", [])}
    return recommend_meals(payload.model_dump(), recent_ids)


@router.get("/api/meal-plans")
def list_plans(user: CurrentUser) -> dict:
    return {"items": repository.get_meal_plans(user["uid"])}


@router.post("/api/meal-plans", status_code=status.HTTP_201_CREATED)
def save_plan(payload: MealPlanSave, user: CurrentUser) -> dict:
    if not payload.plan.get("meals"):
        raise HTTPException(422, "A generated plan with at least one meal is required.")
    return repository.save_meal_plan(user["uid"], payload.name, payload.plan)


@router.post("/api/meal-plans/{plan_id}/copy-to-diary")
async def copy_plan_to_diary(plan_id: str, payload: CopyPlanRequest, user: CurrentUser) -> dict[str, int]:
    saved = repository.get_meal_plan(user["uid"], plan_id)
    if saved is None:
        raise HTTPException(404, "Saved meal plan not found.")
    target_date = (payload.date or date.today()).isoformat()
    count = 0
    for meal in saved.get("plan", {}).get("meals", []):
        category = meal.get("meal_category", "lunch")
        if category not in {"breakfast", "lunch", "snacks", "dinner"}:
            category = "lunch"
        for ingredient in meal.get("ingredients", []):
            food = await resolve_food(ingredient.get("food_id", ""), user["uid"])
            if food is None:
                continue
            quantity = float(ingredient.get("quantity_g", 0))
            row = {
                "food_id": food["id"],
                "food_name": food["name"],
                "quantity_g": quantity,
                "nutrition_snapshot": scale_nutrition(food["nutrients"], quantity, food.get("reference_quantity", 100)),
                "source": food.get("source"),
                "data_quality": food.get("data_quality", "unknown"),
                "date": target_date,
                "meal_category": category,
            }
            repository.add_food_log(user["uid"], row)
            count += 1
    return {"count": count}

