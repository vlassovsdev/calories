export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active'

export type GoalType = 'lose_weight' | 'maintain_weight' | 'gain_weight'

export type PhotoJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface User {
  id: string
  email: string
  display_name: string
  age?: number
  weight_kg?: number
  height_cm?: number
  sex?: 'M' | 'F'
  activity_level: ActivityLevel
  goal: GoalType
  created_at: string
  updated_at: string
}

export interface Tokens {
  access_token: string
  refresh_token: string
}

export interface AuthResponse {
  user: User
  tokens: Tokens
}

export interface TDEEResult {
  bmr: number
  tdee: number
  recommended_calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

export interface DiaryEntry {
  id: string
  user_id: string
  food_item_id?: string
  entry_date: string
  meal_type: string
  quantity_grams: number
  calories: number
  protein_g?: number
  fat_g?: number
  carbs_g?: number
  notes?: string
  source: 'manual' | 'photo_analysis'
  created_at: string
}

export interface CreateDiaryEntryInput {
  food_item_id?: string
  entry_date: string
  meal_type: string
  quantity_grams: number
  calories: number
  protein_g?: number
  fat_g?: number
  carbs_g?: number
  notes?: string
}

export interface UpdateDiaryEntryInput {
  meal_type: string
  quantity_grams: number
  calories: number
  protein_g?: number
  fat_g?: number
  carbs_g?: number
  notes?: string
}

export interface FoodItem {
  id: string
  created_by?: string
  name: string
  brand?: string
  calories_per_100g: number
  protein_per_100g?: number
  fat_per_100g?: number
  carbs_per_100g?: number
  is_public: boolean
  created_at: string
}

export interface CreateFoodItemInput {
  name: string
  brand?: string
  calories_per_100g: number
  protein_per_100g?: number
  fat_per_100g?: number
  carbs_per_100g?: number
  is_public: boolean
}

export interface PhotoJob {
  id: string
  user_id: string
  status: PhotoJobStatus
  result_calories?: number
  result_food_desc?: string
  error_message?: string
  created_at: string
  completed_at?: string
}

export interface AnalyzePhotoResponse {
  job_id: string
  poll_url: string
  status: 'pending'
}

export interface DailySummary {
  date: string
  total_calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  recommended_calories?: number
}

export interface WeeklyStats {
  week_start: string
  days: DailySummary[]
}
