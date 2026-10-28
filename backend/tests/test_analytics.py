from datetime import date

from app.services.analytics import daily_summary, weekly_summary
from app.services.insights import weekly_insights


def test_daily_calories_can_exceed_target_without_clamping() -> None:
    result = daily_summary(
        [{"meal_category": "lunch", "nutrition_snapshot": {"calories": 2400, "protein": 80}}],
        {"calories": 2000, "protein": 75},
        date(2026, 10, 28),
    )
    assert result["calories_remaining"] == -400
    assert result["totals"]["calories"] == 2400
    assert result["has_logs"] is True


def test_empty_days_are_preserved_as_missing_weekly_values() -> None:
    result = weekly_summary([], date(2026, 10, 26))
    assert len(result["days"]) == 7
    assert all(day["calories"] is None for day in result["days"])
    assert result["average_calories"] is None
    assert result["logged_days"] == 0


def test_insights_do_not_infer_patterns_without_recorded_days() -> None:
    assert weekly_insights({"logged_days": 0}, {"protein": 75}) == []


def test_protein_insight_quotes_recorded_values_and_user_target() -> None:
    result = weekly_insights({"logged_days": 4, "average_protein": 45}, {"protein": 75})
    insight = next(item for item in result if item["id"] == "protein-gap")
    assert "45 g" in insight["detail"]
    assert "75 g" in insight["detail"]

