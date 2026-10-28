import json
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_FILE = Path(__file__).resolve().parents[3] / "data" / "foods.json"


@lru_cache(maxsize=1)
def load_foods() -> list[dict[str, Any]]:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def food_index() -> dict[str, dict[str, Any]]:
    return {food["id"]: food for food in load_foods()}


def search_foods(query: str, limit: int = 30) -> list[dict[str, Any]]:
    term = query.strip().casefold()
    if not term:
        return []
    foods = load_foods()
    matches = [food for food in foods if term in food["name"].casefold() or term in food["category"].casefold()]
    matches.sort(key=lambda item: (not item["name"].casefold().startswith(term), item["name"]))
    return matches[:limit]

