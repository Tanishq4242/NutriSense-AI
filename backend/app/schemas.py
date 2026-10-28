from __future__ import annotations

from datetime import date as Date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class Nutrition(BaseModel):
    calories: float | None = Field(default=None, ge=0)
    protein: float | None = Field(default=None, ge=0)
    carbohydrates: float | None = Field(default=None, ge=0)
    fat: float | None = Field(default=None, ge=0)
    fiber: float | None = Field(default=None, ge=0)
    sugar: float | None = Field(default=None, ge=0)
    sodium: float | None = Field(default=None, ge=0)


class NutritionTargets(BaseModel):
    calories: float = Field(default=2000, gt=0, le=10000)
    protein: float = Field(default=75, ge=0, le=500)
    carbohydrates: float | None = Field(default=None, ge=0)
    fat: float | None = Field(default=None, ge=0)
    fiber: float | None = Field(default=None, ge=0)


class ProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=80)
    age: int | None = Field(default=None, ge=13, le=120)
    height_cm: float | None = Field(default=None, gt=0, le=260)
    weight_kg: float | None = Field(default=None, gt=0, le=500)
    measurement_system: Literal["metric", "imperial"] = "metric"
    dietary_preference: Literal["no-preference", "vegetarian", "vegan", "eggetarian", "pescatarian"] = "no-preference"
    allergies: list[str] = Field(default_factory=list, max_length=30)
    foods_to_avoid: list[str] = Field(default_factory=list, max_length=50)
    preferred_cuisine: str = Field(default="", max_length=80)
    budget_preference: Literal["any", "low", "moderate"] = "any"
    activity_level: Literal["sedentary", "light", "moderate", "active", "very-active"] = "moderate"
    goal: Literal["maintain", "lose", "gain", "recomposition", "general"] = "general"
    calorie_target: float | None = Field(default=None, gt=0, le=10000)
    protein_target: float | None = Field(default=None, ge=0, le=500)
    water_goal_ml: int = Field(default=2000, ge=250, le=10000)
    onboarding_complete: bool = False

    @field_validator("allergies", "foods_to_avoid")
    @classmethod
    def clean_values(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(value.strip().lower() for value in values if value.strip()))


class FoodQuantity(BaseModel):
    food_id: str = Field(min_length=1, max_length=100)
    quantity_g: float = Field(gt=0, le=5000)


class CustomFoodCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(default="Custom", max_length=60)
    nutrients: Nutrition

    @model_validator(mode="after")
    def require_known_value(self) -> "CustomFoodCreate":
        if all(value is None for value in self.nutrients.model_dump().values()):
            raise ValueError("Enter at least one nutrient value from a reliable label or source.")
        return self


class FavoriteCreate(BaseModel):
    reference_id: str = Field(min_length=1, max_length=120)
    favorite_type: Literal["food", "recipe"]


class CalculateRequest(BaseModel):
    items: list[FoodQuantity] = Field(min_length=1, max_length=100)


class FoodLogCreate(FoodQuantity):
    date: Date
    meal_category: Literal["breakfast", "lunch", "snacks", "dinner"]


class FoodLogUpdate(BaseModel):
    quantity_g: float = Field(gt=0, le=5000)
    meal_category: Literal["breakfast", "lunch", "snacks", "dinner"]


class CopyDiaryRequest(BaseModel):
    source_date: Date
    target_date: Date


class WaterLogCreate(BaseModel):
    date: Date
    quantity_ml: int = Field(gt=0, le=5000)


class WaterLogUpdate(BaseModel):
    quantity_ml: int = Field(gt=0, le=5000)


class MealPlanRequest(BaseModel):
    calorie_target: float = Field(gt=0, le=10000)
    protein_target: float = Field(default=75, ge=0, le=500)
    dietary_preference: Literal["no-preference", "vegetarian", "vegan", "eggetarian", "pescatarian"] = "no-preference"
    allergies: list[str] = Field(default_factory=list, max_length=30)
    foods_to_avoid: list[str] = Field(default_factory=list, max_length=50)
    preferred_cuisine: str = Field(default="", max_length=80)
    meal_count: int = Field(default=3, ge=1, le=5)
    max_prep_minutes: int | None = Field(default=None, ge=5, le=240)
    budget_preference: Literal["any", "low", "moderate"] = "any"


class MealPlanSave(BaseModel):
    name: str = Field(default="My meal plan", min_length=1, max_length=100)
    plan: dict


class CopyPlanRequest(BaseModel):
    date: Date | None = None

