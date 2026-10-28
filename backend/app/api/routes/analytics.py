from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Query

from app.core.security import CurrentUser
from app.repositories import firestore as repository
from app.services.analytics import daily_summary, weekly_summary

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _targets(uid: str) -> dict[str, Any]:
    profile = repository.get_profile(uid)
    return profile.get("targets", {"calories": 2000, "protein": 75})


@router.get("/daily")
def daily(user: CurrentUser, selected_date: date | None = Query(default=None, alias="date")) -> dict:
    chosen = selected_date or date.today()
    logs = repository.logs_for_date(user["uid"], chosen)
    return daily_summary(logs, _targets(user["uid"]), chosen)


@router.get("/weekly")
def weekly(user: CurrentUser, start_date: date | None = None) -> dict:
    start = start_date or (date.today() - timedelta(days=date.today().weekday()))
    rows = []
    all_logs = repository.logs_between(user["uid"], start, start + timedelta(days=6))
    for offset in range(7):
        day = start + timedelta(days=offset)
        day_logs = [row for row in all_logs if row.get("date_key") == day.isoformat()]
        rows.append(daily_summary(day_logs, _targets(user["uid"]), day))
    return weekly_summary(rows, start)

