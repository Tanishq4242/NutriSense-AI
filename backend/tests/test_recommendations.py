from app.services.recommendations import _blocked, recommend_meals


def test_recommendation_returns_actual_nutrition_and_explanation() -> None:
    result = recommend_meals({"calorie_target": 500, "protein_target": 20, "meal_count": 2})
    assert result["meals"]
    assert result["total"]["calories"] > 0
    assert result["deviation"]["calories"] == result["total"]["calories"] - 500
    assert "filtered by hard restrictions" in result["explanation"]


def test_unknown_ingredient_data_never_bypasses_allergy_filter() -> None:
    result = recommend_meals({"calorie_target": 500, "allergies": ["milk"], "meal_count": 2})
    assert result["meals"] == []
    assert "No recipes meet" in result["explanation"]


def test_restrictive_diet_excludes_unverified_recipe_tags() -> None:
    result = recommend_meals({"calorie_target": 500, "dietary_preference": "vegan", "meal_count": 2})
    assert result["meals"] == []


def test_preparation_time_is_a_hard_constraint() -> None:
    result = recommend_meals({"calorie_target": 500, "max_prep_minutes": 5, "meal_count": 2})
    assert result["meals"]
    assert all(meal["prep_minutes"] <= 5 for meal in result["meals"])


def test_known_allergens_are_hard_constraints_when_metadata_is_complete() -> None:
    recipe = {
        "diet_tags": ["vegetarian"],
        "ingredient_names": ["rice"],
        "ingredient_data_complete": True,
        "allergen_data_complete": True,
        "known_allergens": ["milk"],
        "prep_minutes": 15,
    }
    assert _blocked(recipe, {"allergies": ["milk"]})
    assert not _blocked(recipe, {"allergies": ["peanut"]})

