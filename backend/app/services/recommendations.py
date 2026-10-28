import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.services.food_catalog import food_index
from app.services.nutrition import scale_nutrition, sum_nutrition

RECIPES_FILE = Path(__file__).resolve().parents[3] / "data" / "recipes.json"


@lru_cache(maxsize=1)
def load_recipes() -> list[dict[str, Any]]:
    return json.loads(RECIPES_FILE.read_text(encoding="utf-8"))


def recipe_nutrition(recipe: dict[str, Any]) -> dict[str, float | None]:
    foods = food_index()
    pieces = []
    for ingredient in recipe["ingredients"]:
        food = foods[ingredient["food_id"]]
        pieces.append(scale_nutrition(food["nutrients"], ingredient["quantity_g"], food.get("reference_quantity", 100)))
    return sum_nutrition(pieces)


def _blocked(recipe: dict[str, Any], request: dict[str, Any]) -> bool:
    diet = request.get("dietary_preference", "no-preference")
    tags = set(recipe.get("diet_tags", []))
    if diet == "vegan" and "vegan" not in tags:
        return True
    if diet == "vegetarian" and not tags.intersection({"vegetarian", "vegan"}):
        return True
    if diet == "eggetarian" and not tags.intersection({"vegetarian", "vegan", "eggetarian"}):
        return True
    if diet == "pescatarian" and not tags.intersection({"vegetarian", "vegan", "pescatarian"}):
        return True
    allergens = {str(value).casefold() for value in request.get("allergies", [])}
    avoided = {str(value).casefold() for value in request.get("foods_to_avoid", [])}
    if allergens and not recipe.get("allergen_data_complete", False):
        return True
    if avoided and not recipe.get("ingredient_data_complete", False):
        return True
    ingredients = recipe.get("ingredient_names", [])
    known_allergens = {str(value).casefold() for value in recipe.get("known_allergens", [])}
    if allergens and "unknown" in known_allergens:
        return True
    if any(allergen == known or allergen in known or known in allergen for allergen in allergens for known in known_allergens):
        return True
    if allergens.intersection(ingredients) or avoided.intersection(ingredients):
        return True
    if any(any(word in ingredient for word in allergens | avoided) for ingredient in ingredients):
        return True
    prep = request.get("max_prep_minutes")
    if prep and recipe["prep_minutes"] > prep:
        return True
    return False


def recommend_meals(request: dict[str, Any], recent_recipe_ids: set[str] | None = None) -> dict[str, Any]:
    recent_recipe_ids = recent_recipe_ids or set()
    eligible = [recipe for recipe in load_recipes() if not _blocked(recipe, request)]
    if not eligible:
        return {"meals": [], "total": {}, "explanation": "No recipes meet the hard dietary, allergen, and preparation constraints."}
    meal_count = request.get("meal_count", 3)
    calorie_target = float(request["calorie_target"])
    protein_target = float(request.get("protein_target", 0))
    cuisine = str(request.get("preferred_cuisine", "")).casefold()
    remaining_calories = calorie_target
    remaining_protein = protein_target
    selected: list[dict[str, Any]] = []
    totals: dict[str, float | None] = {"calories": 0.0, "protein": 0.0, "carbohydrates": 0.0, "fat": 0.0, "fiber": 0.0}
    for index in range(meal_count):
        slots_left = meal_count - index
        per_meal_calories = max(remaining_calories / slots_left, 1)
        per_meal_protein = max(remaining_protein / slots_left, 0)
        candidates = []
        for recipe in eligible:
            if recipe["id"] in {meal["id"] for meal in selected}:
                continue
            nutrition = recipe_nutrition(recipe)
            calorie_fit = abs(float(nutrition["calories"] or 0) - per_meal_calories) / per_meal_calories
            protein_fit = abs(float(nutrition["protein"] or 0) - per_meal_protein) / max(per_meal_protein, 15)
            score = 100 - 55 * calorie_fit - 25 * protein_fit
            why: list[str] = []
            if cuisine and cuisine in [tag.casefold() for tag in recipe.get("cuisine_tags", [])]:
                score += 8
                why.append(f"matches your {request['preferred_cuisine']} cuisine preference")
            if recipe["id"] in recent_recipe_ids:
                score -= 18
            if recipe.get("estimated_cost_level") == "low" and request.get("budget_preference") == "low":
                score += 4
            candidates.append((score, recipe, nutrition, why))
        if not candidates:
            break
        score, recipe, nutrition, why = max(candidates, key=lambda row: (row[0], row[1]["id"]))
        why.append("fits the remaining calorie and protein budget")
        selected.append({
            **recipe,
            "nutrition": nutrition,
            "score": round(score, 1),
            "explanation": "; ".join(why),
        })
        for nutrient in totals:
            totals[nutrient] = round(float(totals[nutrient] or 0) + float(nutrition.get(nutrient) or 0), 2)
        remaining_calories -= float(nutrition.get("calories") or 0)
        remaining_protein -= float(nutrition.get("protein") or 0)
    return {
        "meals": selected,
        "total": totals,
        "targets": {"calories": calorie_target, "protein": protein_target},
        "deviation": {
            "calories": round(float(totals["calories"] or 0) - calorie_target, 2),
            "protein": round(float(totals["protein"] or 0) - protein_target, 2),
        },
        "explanation": "Eligible meals were filtered by hard restrictions, then ranked by calorie and protein fit, cuisine preference, variety, and available budget tags. Targets are approximate.",
    }

