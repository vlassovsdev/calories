package domain

import "time"

type ActivityLevel string

const (
	ActivitySedentary       ActivityLevel = "sedentary"
	ActivityLightlyActive   ActivityLevel = "lightly_active"
	ActivityModeratelyActive ActivityLevel = "moderately_active"
	ActivityVeryActive      ActivityLevel = "very_active"
	ActivityExtraActive     ActivityLevel = "extra_active"
)

type GoalType string

const (
	GoalLoseWeight     GoalType = "lose_weight"
	GoalMaintainWeight GoalType = "maintain_weight"
	GoalGainWeight     GoalType = "gain_weight"
)

type User struct {
	ID            string        `json:"id"`
	Email         string        `json:"email"`
	DisplayName   string        `json:"display_name"`
	Age           *int          `json:"age,omitempty"`
	WeightKg      *float64      `json:"weight_kg,omitempty"`
	HeightCm      *float64      `json:"height_cm,omitempty"`
	Sex           *string       `json:"sex,omitempty"`
	ActivityLevel ActivityLevel `json:"activity_level"`
	Goal          GoalType      `json:"goal"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

type TDEEResult struct {
	BMR               float64 `json:"bmr"`
	TDEE              float64 `json:"tdee"`
	RecommendedCalories float64 `json:"recommended_calories"`
	ProteinG          float64 `json:"protein_g"`
	FatG              float64 `json:"fat_g"`
	CarbsG            float64 `json:"carbs_g"`
}

func MifflinStJeor(weightKg, heightCm float64, age int, sex string) float64 {
	bmr := 10*weightKg + 6.25*heightCm - 5*float64(age)
	if sex == "M" {
		return bmr + 5
	}
	return bmr - 161
}

func activityMultiplier(level ActivityLevel) float64 {
	switch level {
	case ActivityLightlyActive:
		return 1.375
	case ActivityModeratelyActive:
		return 1.55
	case ActivityVeryActive:
		return 1.725
	case ActivityExtraActive:
		return 1.9
	default: // sedentary
		return 1.2
	}
}

func goalOffset(goal GoalType) float64 {
	switch goal {
	case GoalLoseWeight:
		return -500
	case GoalGainWeight:
		return 300
	default:
		return 0
	}
}

func CalculateTDEE(u *User) *TDEEResult {
	if u.WeightKg == nil || u.HeightCm == nil || u.Age == nil || u.Sex == nil {
		return nil
	}
	bmr := MifflinStJeor(*u.WeightKg, *u.HeightCm, *u.Age, *u.Sex)
	tdee := bmr * activityMultiplier(u.ActivityLevel)
	recommended := tdee + goalOffset(u.Goal)

	return &TDEEResult{
		BMR:               bmr,
		TDEE:              tdee,
		RecommendedCalories: recommended,
		ProteinG:          recommended * 0.30 / 4,
		FatG:              recommended * 0.25 / 9,
		CarbsG:            recommended * 0.45 / 4,
	}
}
