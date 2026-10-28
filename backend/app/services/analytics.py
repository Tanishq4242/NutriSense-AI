from datetime import date, timedelta
from typing import Any

import pandas as pd

from app.services.nutrition import NUTRIENTS, sum_nutrition


def daily_summary(logs: list[dict[str, Any]], targets: dict[str, Any], selected_date: date) -> dict[str, Any]:
    totals = sum_nutrition([log.get("nutrition_snapshot", {}) for log in logs]) if logs else {key: 0.0 for key in NUTRIENTS}
    meals: dict[str, list[dict[str, Any]]] = {name: [] for name in ("breakfast", "lunch", "snacks", "dinner")}
    for log in logs:
        meals.setdefault(log["meal_category"], []).append(log)
    meal_totals = {name: sum_nutrition([item.get("nutrition_snapshot", {}) for item in items]) if items else {key: 0.0 for key in NUTRIENTS} for name, items in meals.items()}
    target_calories = float(targets.get("calories", 2000))
    consumed = float(totals.get("calories") or 0)
    return {
        "date": selected_date.isoformat(),
        "has_logs": bool(logs),
        "logged_entry_count": len(logs),
        "totals": totals,
        "targets": targets,
        "calories_remaining": round(target_calories - consumed, 2),
        "calorie_target_percent": round(consumed / target_calories * 100, 1) if target_calories else None,
        "meals": meals,
        "meal_totals": meal_totals,
    }


def weekly_summary(day_rows: list[dict[str, Any]], start_date: date) -> dict[str, Any]:
    rows = []
    for offset in range(7):
        day = start_date + timedelta(days=offset)
        source = next((row for row in day_rows if row["date"] == day.isoformat()), None)
        totals = source["totals"] if source else {}
        rows.append({
            "date": day.isoformat(),
            "calories": totals.get("calories") if source and source.get("has_logs") else None,
            "protein": totals.get("protein") if source and source.get("has_logs") else None,
            "has_logs": bool(source and source.get("has_logs")),
        })
    frame = pd.DataFrame(rows)
    logged = frame.dropna(subset=["calories"])
    return {
        "start_date": start_date.isoformat(),
        "days": rows,
        "logged_days": int(frame["has_logs"].sum()),
        "average_calories": round(float(logged["calories"].mean()), 2) if not logged.empty else None,
        "average_protein": round(float(frame.dropna(subset=["protein"])["protein"].mean()), 2) if frame["protein"].notna().any() else None,
    }

