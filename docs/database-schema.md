# Firestore schema

All application records live below the verified Firebase UID. The backend uses Admin SDK; Firestore rules deny browser reads/writes.

```text
users/{uid}
  display_name, age, height_cm, weight_kg, measurement_system
  (display preference; height/weight are stored as cm/kg)
  dietary_preference, allergies[], foods_to_avoid[], preferred_cuisine, budget_preference
  activity_level, goal, targets{calories, protein, ...}, water_goal_ml
  onboarding_complete, created_at, updated_at

users/{uid}/foodLogs/{logId}
  date_key (YYYY-MM-DD), date, meal_category, food_id, food_name
  quantity_g, nutrition_snapshot{calories, protein, carbohydrates, fat, fiber, ...}
  source, data_quality, created_at, updated_at

users/{uid}/waterLogs/{logId}
  date_key, date, quantity_ml, unit, created_at

users/{uid}/mealPlans/{planId}
  name, plan{meals[], total, targets, deviation, explanation}, created_at

users/{uid}/favorites/{favoriteId}   (reserved for saved food/recipe references)
users/{uid}/weightLogs/{weightLogId} (reserved for dated weight records)
```

Foods and recipe candidates are static JSON/API data, not copied into a Firestore singleton document. `date_key` is an ISO date string for range filters. Suggested indexes are in `backend/firestore.indexes.json`. Food logs store nutrient snapshots to preserve historical calculations. Account export reads the user's document and subcollections; deletion removes these subcollections and the matching Storage prefix before deleting the Firebase Auth account.

