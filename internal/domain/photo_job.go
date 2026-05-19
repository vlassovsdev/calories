package domain

import "time"

type JobStatus string

const (
	JobPending    JobStatus = "pending"
	JobProcessing JobStatus = "processing"
	JobCompleted  JobStatus = "completed"
	JobFailed     JobStatus = "failed"
)

type PhotoJob struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	StreamMsgID     string     `json:"-"`
	Status          JobStatus  `json:"status"`
	ResultCalories  *float64   `json:"result_calories,omitempty"`
	ResultFoodDesc  *string    `json:"result_food_desc,omitempty"`
	ErrorMessage    *string    `json:"error_message,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
}
