package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/vlassovs/calories/internal/db/queries"
	"github.com/vlassovs/calories/internal/domain"
	"github.com/vlassovs/calories/internal/middleware"
)

type UserHandler struct {
	users *queries.UserStore
	rdb   *redis.Client
}

func NewUserHandler(users *queries.UserStore, rdb *redis.Client) *UserHandler {
	return &UserHandler{users: users, rdb: rdb}
}

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	var req struct {
		Age           *int                  `json:"age"`
		WeightKg      *float64              `json:"weight_kg"`
		HeightCm      *float64              `json:"height_cm"`
		Sex           *string               `json:"sex"`
		ActivityLevel domain.ActivityLevel  `json:"activity_level"`
		Goal          domain.GoalType       `json:"goal"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	user, err := h.users.Update(r.Context(), userID,
		req.Age, req.WeightKg, req.HeightCm, req.Sex,
		req.ActivityLevel, req.Goal)
	if err != nil || user == nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}

	h.rdb.Del(r.Context(), fmt.Sprintf("tdee:%s", userID))
	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) GetTDEE(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	ctx := r.Context()

	cacheKey := fmt.Sprintf("tdee:%s", userID)
	if cached, err := h.rdb.Get(ctx, cacheKey).Result(); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(cached))
		return
	}

	user, err := h.users.GetByID(ctx, userID)
	if err != nil || user == nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	result := domain.CalculateTDEE(user)
	if result == nil {
		writeError(w, http.StatusUnprocessableEntity, "complete your profile first (age, weight, height, sex)")
		return
	}

	body, _ := json.Marshal(result)
	h.rdb.Set(ctx, cacheKey, string(body), time.Hour)
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}
