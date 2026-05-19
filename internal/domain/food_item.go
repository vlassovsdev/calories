package domain

import "time"

type FoodItem struct {
	ID              string    `json:"id"`
	CreatedBy       *string   `json:"created_by,omitempty"`
	Name            string    `json:"name"`
	Brand           *string   `json:"brand,omitempty"`
	CaloriesPer100g float64   `json:"calories_per_100g"`
	ProteinPer100g  *float64  `json:"protein_per_100g,omitempty"`
	FatPer100g      *float64  `json:"fat_per_100g,omitempty"`
	CarbsPer100g    *float64  `json:"carbs_per_100g,omitempty"`
	IsPublic        bool      `json:"is_public"`
	CreatedAt       time.Time `json:"created_at"`
}
