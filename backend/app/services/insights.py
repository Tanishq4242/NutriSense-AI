from typing import Any


def weekly_insights(summary: dict[str, Any], targets: dict[str, Any]) -> list[dict[str, str]]:
    logged_days = int(summary.get("logged_days", 0))
    if logged_days == 0:
        return []
    insights: list[dict[str, str]] = []
    if logged_days < 4:
        insights.append({
            "id": "logging-coverage",
            "title": "A few more logs will make trends clearer",
            "detail": f"You logged {logged_days} of 7 days. Weekly averages use logged days only; unlogged days are not counted as zero.",
            "basis": "logged day count",
        })
    average_protein = summary.get("average_protein")
    protein_target = targets.get("protein")
    if logged_days >= 3 and average_protein is not None and protein_target and float(average_protein) < float(protein_target) * 0.8:
        insights.append({
            "id": "protein-gap",
            "title": "Recorded protein is below your saved target",
            "detail": f"Your logged-day average is {round(float(average_protein))} g, compared with your saved target of {round(float(protein_target))} g. Check that portions and food records are complete.",
            "basis": "weekly logged-day protein average compared with user-set target",
        })
    if not insights:
        insights.append({
            "id": "steady-tracking",
            "title": "Your week has a useful tracking record",
            "detail": f"You logged {logged_days} of 7 days. Keep using the source labels and your own judgement when reviewing the numbers.",
            "basis": "logged day count",
        })
    return insights

