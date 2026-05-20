package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"github.com/vlassovs/calories/internal/db/queries"
	"github.com/vlassovs/calories/internal/domain"
	"github.com/vlassovs/calories/internal/middleware"
)

type DiaryHandler struct {
	diary *queries.DiaryStore
	rdb   *redis.Client
}

func NewDiaryHandler(diary *queries.DiaryStore, rdb *redis.Client) *DiaryHandler {
	return &DiaryHandler{diary: diary, rdb: rdb}
}

func (h *DiaryHandler) invalidateDailyCache(userID, dateStr string) {
	h.rdb.Del(context.Background(), fmt.Sprintf("dcal:%s:%s", userID, dateStr))
}

func (h *DiaryHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	q := r.URL.Query()

	if dateStr := q.Get("date"); dateStr != "" {
		date, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid date format, use YYYY-MM-DD")
			return
		}
		entries, err := h.diary.ListByDate(r.Context(), userID, date)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "query failed")
			return
		}
		writeJSON(w, http.StatusOK, entries)
		return
	}

	startStr := q.Get("start")
	endStr := q.Get("end")
	if startStr == "" || endStr == "" {
		writeError(w, http.StatusBadRequest, "provide date or start+end params")
		return
	}
	start, err := time.Parse("2006-01-02", startStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid start date")
		return
	}
	end, err := time.Parse("2006-01-02", endStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid end date")
		return
	}
	if end.Sub(start) > 7*24*time.Hour {
		writeError(w, http.StatusBadRequest, "date range must not exceed 7 days")
		return
	}

	entries, err := h.diary.ListByRange(r.Context(), userID, start, end)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	writeJSON(w, http.StatusOK, entries)
}

func (h *DiaryHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	var req struct {
		FoodItemID  *string  `json:"food_item_id"`
		EntryDate   string   `json:"entry_date"`
		MealType    string   `json:"meal_type"`
		QuantityG   float64  `json:"quantity_grams"`
		Calories    float64  `json:"calories"`
		ProteinG    *float64 `json:"protein_g"`
		FatG        *float64 `json:"fat_g"`
		CarbsG      *float64 `json:"carbs_g"`
		Notes       *string  `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	date, err := time.Parse("2006-01-02", req.EntryDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid entry_date, use YYYY-MM-DD")
		return
	}
	if req.MealType == "" || req.QuantityG <= 0 || req.Calories < 0 {
		writeError(w, http.StatusBadRequest, "meal_type, quantity_grams, calories required")
		return
	}

	entry := &domain.DiaryEntry{
		UserID:     userID,
		FoodItemID: req.FoodItemID,
		EntryDate:  date,
		MealType:   req.MealType,
		QuantityG:  req.QuantityG,
		Calories:   req.Calories,
		ProteinG:   req.ProteinG,
		FatG:       req.FatG,
		CarbsG:     req.CarbsG,
		Notes:      req.Notes,
		Source:     "manual",
	}
	created, err := h.diary.Create(r.Context(), entry)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	h.invalidateDailyCache(userID, req.EntryDate)
	writeJSON(w, http.StatusCreated, created)
}

func (h *DiaryHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	id := chi.URLParam(r, "id")
	var req struct {
		MealType  string   `json:"meal_type"`
		QuantityG float64  `json:"quantity_grams"`
		Calories  float64  `json:"calories"`
		ProteinG  *float64 `json:"protein_g"`
		FatG      *float64 `json:"fat_g"`
		CarbsG    *float64 `json:"carbs_g"`
		Notes     *string  `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	updated, err := h.diary.Update(r.Context(), id, userID,
		req.MealType, req.QuantityG, req.Calories,
		req.ProteinG, req.FatG, req.CarbsG, req.Notes)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	if updated == nil {
		writeError(w, http.StatusNotFound, "entry not found")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *DiaryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	id := chi.URLParam(r, "id")
	if err := h.diary.Delete(r.Context(), id, userID); err != nil {
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "entry not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "delete failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
