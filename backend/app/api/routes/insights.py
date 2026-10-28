from datetime import date, timedelta

from fastapi import APIRouter

from app.core.security import CurrentUser
from app.repositories import firestore as repository
from app.services.analytics import daily_summary, weekly_summary
from app.services.insights import weekly_insights

router = APIRouter(prefix="/api/insights", tags=["nutrition insights"])


@router.get("/weekly")
def get_weekly_insights(user: CurrentUser, start_date: date | None = None) -> dict:
    today = date.today()
    start = start_date or (today - timedelta(days=today.weekday()))
    logs = repository.logs_between(user["uid"], start, start + timedelta(days=6))
    profile = repository.get_profile(user["uid"])
    targets = profile.get("targets", {"calories": 2000, "protein": 75})
    days = []
    for offset in range(7):
        day = start + timedelta(days=offset)
        day_logs = [row for row in logs if row.get("date_key") == day.isoformat()]
        days.append(daily_summary(day_logs, targets, day))
    summary = weekly_summary(days, start)
    return {"method": "transparent rules over recorded data", "start_date": start.isoformat(), "insights": weekly_insights(summary, targets), "logged_days": summary["logged_days"], "disclaimer": "Tracking suggestions only; incomplete logs can make patterns misleading. Not medical advice."}

