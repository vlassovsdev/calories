package domain

import "time"

type DiaryEntry struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	FoodItemID   *string   `json:"food_item_id,omitempty"`
	EntryDate    time.Time `json:"entry_date"`
	MealType     string    `json:"meal_type"`
	QuantityG    float64   `json:"quantity_grams"`
	Calories     float64   `json:"calories"`
	ProteinG     *float64  `json:"protein_g,omitempty"`
	FatG         *float64  `json:"fat_g,omitempty"`
	CarbsG       *float64  `json:"carbs_g,omitempty"`
	Notes        *string   `json:"notes,omitempty"`
	Source       string    `json:"source"`
	CreatedAt    time.Time `json:"created_at"`
}

type DailySummary struct {
	Date        string  `json:"date"`
	TotalCalories float64 `json:"total_calories"`
	ProteinG    float64 `json:"protein_g"`
	FatG        float64 `json:"fat_g"`
	CarbsG      float64 `json:"carbs_g"`
	Recommended *float64 `json:"recommended_calories,omitempty"`
}
