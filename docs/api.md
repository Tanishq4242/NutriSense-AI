# REST API

OpenAPI is generated at `/docs`; health is `GET /api/health`.

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET / PUT | `/api/profile` | Bearer | Read/update signed-in user's profile and targets |
| GET | `/api/foods/search?q=` | Bearer | Search local FDC references, personal foods, and optional USDA API |
| GET / POST | `/api/foods/custom` | Bearer | List/create user-owned food entries |
| GET | `/api/foods/{food_id}` | Bearer | Read a source or caller-owned custom record |
| POST | `/api/nutrition/calculate` | Bearer | Scale known food nutrients by grams |
| GET / POST | `/api/food-logs` | Bearer | List selected date / create a food entry |
| PUT / DELETE | `/api/food-logs/{id}` | Bearer | Edit or delete a caller-owned entry |
| GET | `/api/analytics/daily?date=` | Bearer | Daily totals, meals, targets, remaining calories |
| GET | `/api/analytics/weekly?start_date=` | Bearer | Seven-day trends; unlogged days are null |
| GET | `/api/insights/weekly?start_date=` | Bearer | Transparent rule-based insights from recorded data |
| GET / POST / DELETE | `/api/water-logs` | Bearer | Hydration totals, add, remove |
| POST | `/api/meal-plans/generate` | Bearer | Generate an explainable plan |
| GET / POST | `/api/meal-plans` | Bearer | List/save plans |
| POST | `/api/recommendations/meals` | Bearer | Rank eligible meals |
| GET / POST / DELETE | `/api/favorites` | Bearer | List, save, or remove personal food/recipe favorites |
| POST | `/api/food-recognition/predict` | Bearer | Validates upload; returns unavailable until model adapter exists |
| GET / DELETE | `/api/account/export`, `/api/account` | Bearer | Export or delete own data/account |

Authorization errors return 401, unavailable Firebase returns 503, unknown user-owned IDs return 404, and invalid quantities return 422. The API never takes a client-supplied UID for private data paths.

