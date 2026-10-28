from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.core.security import CurrentUser
from app.repositories import firestore as repository
from app.schemas import CustomFoodCreate
from app.services.food_catalog import food_index, search_foods

router = APIRouter(prefix="/api/foods", tags=["foods"])


def _fdc_food(row: dict[str, Any]) -> dict[str, Any]:
    nutrient_map = {1008: "calories", 1003: "protein", 1005: "carbohydrates", 1004: "fat", 1079: "fiber", 2000: "sugar", 1093: "sodium"}
    nutrients: dict[str, float | None] = {value: None for value in nutrient_map.values()}
    for item in row.get("foodNutrients", []):
        key = nutrient_map.get(item.get("nutrientId"))
        if key and item.get("value") is not None:
            nutrients[key] = float(item["value"])
    return {
        "id": f"fdc:{row['fdcId']}",
        "name": row.get("description", "Unnamed food").title(),
        "category": row.get("foodCategory", "Food"),
        "reference_quantity": 100,
        "serving_unit": "g",
        "nutrients": nutrients,
        "source": "USDA FoodData Central",
        "source_id": str(row["fdcId"]),
        "data_quality": row.get("dataType", "FoodData Central"),
    }


@router.get("/search")
async def search(user: CurrentUser, q: str = Query(min_length=1, max_length=100), limit: int = Query(default=30, ge=1, le=50)) -> dict:
    results = search_foods(q, limit)
    term = q.strip().casefold()
    results.extend(food for food in repository.list_custom_foods(user["uid"]) if term in food["name"].casefold() or term in food.get("category", "").casefold())
    if settings.usda_fdc_api_key:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                response = await client.get(
                    "https://api.nal.usda.gov/fdc/v1/foods/search",
                    params={"query": q, "api_key": settings.usda_fdc_api_key, "pageSize": min(limit, 25)},
                )
                response.raise_for_status()
            seen = {item["id"] for item in results}
            for row in response.json().get("foods", []):
                if row.get("dataType") not in {"Survey (FNDDS)", "SR Legacy", "Foundation"}:
                    continue
                food = _fdc_food(row)
                if food["id"] not in seen:
                    results.append(food)
                    seen.add(food["id"])
        except httpx.HTTPError:
            # Local catalog search remains available if the external source is unavailable.
            pass
    return {"items": results[:limit], "query": q, "source": "local reference catalog and optional USDA FoodData Central"}


@router.get("/custom")
def list_custom_foods(user: CurrentUser) -> dict:
    return {"items": repository.list_custom_foods(user["uid"])}


@router.post("/custom", status_code=201)
def create_custom_food(payload: CustomFoodCreate, user: CurrentUser) -> dict:
    data = payload.model_dump()
    data["nutrients"] = payload.nutrients.model_dump()
    return repository.save_custom_food(user["uid"], data)


@router.get("/{food_id}")
async def get_food(food_id: str, user: CurrentUser) -> dict:
    food = await resolve_food(food_id, user["uid"])
    if food is not None:
        return food
    raise HTTPException(404, "Food record not found.")


async def resolve_food(food_id: str, uid: str | None = None) -> dict[str, Any] | None:
    food = food_index().get(food_id)
    if food is not None:
        return food
    if food_id.startswith("custom:") and uid:
        return repository.get_custom_food(uid, food_id.removeprefix("custom:"))
    if food_id.startswith("fdc:") and food_id[4:].isdigit() and settings.usda_fdc_api_key:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                response = await client.get(f"https://api.nal.usda.gov/fdc/v1/food/{food_id[4:]}", params={"api_key": settings.usda_fdc_api_key})
                response.raise_for_status()
            row = response.json()
            if row.get("dataType") not in {"Survey (FNDDS)", "SR Legacy", "Foundation"}:
                raise HTTPException(422, "This USDA record does not have a supported per-100 g nutrient basis.")
            return _fdc_food(row)
        except httpx.HTTPError:
            raise HTTPException(502, "FoodData Central could not return that record.") from None
    return None

