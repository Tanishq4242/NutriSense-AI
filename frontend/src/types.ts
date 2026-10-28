export type Nutrients = {
  calories: number | null
  protein: number | null
  carbohydrates: number | null
  fat: number | null
  fiber: number | null
  sugar?: number | null
  sodium?: number | null
}

export type Food = {
  id: string
  name: string
  category: string
  reference_quantity: number
  serving_unit: string
  nutrients: Nutrients
  source: string
  source_id: string
  data_quality: string
}

export type FoodLog = {
  id: string
  date: string
  date_key: string
  meal_category: 'breakfast' | 'lunch' | 'snacks' | 'dinner'
  food_id: string
  food_name: string
  quantity_g: number
  nutrition_snapshot: Nutrients
  source?: string
  data_quality?: string
}

export type Profile = {
  display_name: string
  age?: number | null
  height_cm?: number | null
  weight_kg?: number | null
  measurement_system: 'metric' | 'imperial'
  dietary_preference: string
  allergies: string[]
  foods_to_avoid: string[]
  preferred_cuisine: string
  budget_preference: 'any' | 'low' | 'moderate'
  activity_level: string
  goal: string
  calorie_target?: number | null
  protein_target?: number | null
  water_goal_ml: number
  onboarding_complete: boolean
  targets: { calories: number; protein: number; carbohydrates?: number; fat?: number; fiber?: number }
}

export type DailySummary = {
  date: string
  has_logs: boolean
  logged_entry_count: number
  totals: Nutrients
  targets: Profile['targets']
  calories_remaining: number
  calorie_target_percent: number | null
  meals: Record<string, FoodLog[]>
  meal_totals: Record<string, Nutrients>
}

export type WeeklySummary = {
  start_date: string
  days: { date: string; calories: number | null; protein: number | null; has_logs: boolean }[]
  logged_days: number
  average_calories: number | null
  average_protein: number | null
}

export type MealPlan = {
  meals: {
    id: string
    name: string
    meal_category: string
    ingredients: { food_id: string; quantity_g: number }[]
    nutrition: Nutrients
    explanation: string
    score: number
    source?: string
  }[]
  total: Nutrients
  targets?: { calories: number; protein: number }
  deviation?: { calories: number; protein: number }
  explanation: string
}

