# Nutrition catalog provenance

`foods.json` currently contains two records copied from USDA FoodData Central **Survey (FNDDS)** search results, each normalized to 100 g:

- Idli — FDC ID 2708346.
- Rice, white, cooked, glutinous — FDC ID 2708422.

The nutrient amounts were taken from the FDC `foods/search` response. Values are attached to an FDC record and are not represented as universal recipes. Blank nutrient values mean missing data, not zero. FNDDS entries are survey food descriptions and may not match a user's preparation, brand, or portion.

For broader food coverage, set `USDA_FDC_API_KEY` in the backend. Search results are fetched from the USDA FoodData Central API and carry their external ID and data type. `DEMO_KEY` has low request limits and is not a production credential. Before public use, obtain a key, review USDA FoodData Central attribution/terms, confirm each record's description and nutrient basis, and expand the local recipe catalog with ingredient-level records whose sources and allergens are reviewed.

No nutritional values are backfilled when a source omits them. The bundled meal-plan candidates are single FNDDS food references rather than invented multi-ingredient recipes. Their ingredient and allergen composition is intentionally marked incomplete, so any declared allergy or restrictive dietary preference excludes them from recommendations.

