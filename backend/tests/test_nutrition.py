import pytest

from app.services.food_catalog import food_index
from app.services.nutrition import calculate_foods, scale_nutrition, sum_nutrition


def test_single_food_scales_reference_100g_to_150g() -> None:
    result = scale_nutrition({"calories": 128, "protein": 6.36, "fiber": None}, 150)
    assert result == {"calories": 192, "protein": 9.54, "fiber": None}


def test_decimal_quantities_are_rounded_to_two_places() -> None:
    result = scale_nutrition({"calories": 96.1}, 12.5)
    assert result["calories"] == 12.01


@pytest.mark.parametrize("quantity", [0, -1, 100])
def test_non_positive_reference_or_quantity_is_rejected(quantity: float) -> None:
    if quantity == 100:
        with pytest.raises(ValueError):
            scale_nutrition({"calories": 100}, quantity, reference_g=0)
    else:
        with pytest.raises(ValueError):
            scale_nutrition({"calories": 100}, quantity)


def test_unknown_nutrients_remain_missing_not_zero() -> None:
    result = sum_nutrition([{"calories": 10, "fiber": None}, {"calories": 20, "fiber": None}])
    assert result["calories"] == 30
    assert result["fiber"] is None


def test_multiple_food_totals_use_catalog_snapshots() -> None:
    result = calculate_foods(
        [{"food_id": "fdc:2708346", "quantity_g": 100}, {"food_id": "fdc:2708422", "quantity_g": 200}],
        food_index(),
    )
    assert result["total"]["calories"] == 320
    assert result["total"]["protein"] == 10.38


def test_unknown_food_raises_key_error() -> None:
    with pytest.raises(KeyError):
        calculate_foods([{"food_id": "missing", "quantity_g": 100}], food_index())

