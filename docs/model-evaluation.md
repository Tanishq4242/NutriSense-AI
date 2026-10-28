# Recommendation and model evaluation

The initial meal planner is a transparent weighted ranking heuristic, not a trained machine-learning model. It removes candidates that conflict with the selected restrictive diet, declared allergens/foods to avoid, or maximum preparation time. Incomplete ingredient/allergen metadata is excluded whenever the user has a restriction. Eligible choices are then scored by closeness to the remaining calorie and protein budget, preferred cuisine, repetition penalty, and available budget tags. The API returns actual catalog-derived totals, target deviations, and a plain-language reason.

The current two FNDDS food references are intentionally marked as incomplete ingredient records. Therefore the planner only uses them for users without allergy or restrictive diet filters. Their plan is a reference-food demonstration, not a complete recipe or nutrition recommendation.

No accuracy or relevance result is claimed because there is no labeled user preference dataset or trained model. To evaluate a future learned ranker, label user/recipe pairs as relevant using explicit user feedback; hold users out of the test split to avoid leakage; compare against the deterministic baseline using Precision@K and NDCG@K; report sample size, confidence intervals, coverage, and subgroup performance. Evaluate hard-constraint violations separately; the acceptable count is zero. Any clustering of eating patterns should be descriptive and require adequate opted-in records.

The photo feature currently validates upload format and size but has no inference adapter or weights. No recognition predictions or image-derived portions/calories are fabricated. A future model needs a documented dataset license, held-out test set, class-wise precision/recall, calibration, and a manual food/portion confirmation flow.

