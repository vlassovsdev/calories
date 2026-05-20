package domain

import "time"

type ProgressPhoto struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	ImageData string    `json:"image_data"`
	WeightKg  *float64  `json:"weight_kg,omitempty"`
	Notes     *string   `json:"notes,omitempty"`
	TakenAt   string    `json:"taken_at"`
	CreatedAt time.Time `json:"created_at"`
}
