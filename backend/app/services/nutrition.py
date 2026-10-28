from collections.abc import Iterable
from typing import Any

NUTRIENTS = ("calories", "protein", "carbohydrates", "fat", "fiber", "sugar", "sodium")


def scale_nutrition(nutrients: dict[str, Any], quantity_g: float, reference_g: float = 100.0) -> dict[str, float | None]:
    if quantity_g <= 0 or reference_g <= 0:
        raise ValueError("Quantity and reference serving must be greater than zero.")
    factor = quantity_g / reference_g
    return {
        key: (round(float(value) * factor, 2) if value is not None else None)
        for key in NUTRIENTS
        if (value := nutrients.get(key)) is not None or key in nutrients
    }


def sum_nutrition(items: Iterable[dict[str, Any]]) -> dict[str, float | None]:
    values = list(items)
    totals: dict[str, float | None] = {}
    for nutrient in NUTRIENTS:
        observed = [item.get(nutrient) for item in values if item.get(nutrient) is not None]
        totals[nutrient] = round(sum(float(value) for value in observed), 2) if observed else None
    return totals


def calculate_foods(items: list[dict[str, Any]], foods: dict[str, dict[str, Any]]) -> dict[str, Any]:
    results = []
    for item in items:
        food = foods.get(item["food_id"])
        if food is None:
            raise KeyError(item["food_id"])
        results.append({
            "food_id": food["id"],
            "food_name": food["name"],
            "quantity_g": item["quantity_g"],
            "nutrition": scale_nutrition(food["nutrients"], item["quantity_g"], food.get("reference_quantity", 100)),
            "source": food.get("source"),
            "data_quality": food.get("data_quality", "unknown"),
        })
    return {"items": results, "total": sum_nutrition([result["nutrition"] for result in results])}

