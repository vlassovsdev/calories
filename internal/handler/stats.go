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

type StatsHandler struct {
	diary *queries.DiaryStore
	users *queries.UserStore
	rdb   *redis.Client
}

func NewStatsHandler(diary *queries.DiaryStore, users *queries.UserStore, rdb *redis.Client) *StatsHandler {
	return &StatsHandler{diary: diary, users: users, rdb: rdb}
}

func (h *StatsHandler) Daily(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid date format")
		return
	}

	ctx := r.Context()
	cacheKey := fmt.Sprintf("dcal:%s:%s", userID, dateStr)

	if cached, err := h.rdb.HGetAll(ctx, cacheKey).Result(); err == nil && len(cached) > 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(cached)
		return
	}

	calories, protein, fat, carbs, err := h.diary.DailySums(ctx, userID, date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}

	user, _ := h.users.GetByID(ctx, userID)
	summary := &domain.DailySummary{
		Date:          dateStr,
		TotalCalories: calories,
		ProteinG:      protein,
		FatG:          fat,
		CarbsG:        carbs,
	}
	if user != nil {
		if tdee := domain.CalculateTDEE(user); tdee != nil {
			summary.Recommended = &tdee.RecommendedCalories
		}
	}

	h.rdb.HSet(ctx, cacheKey,
		"total", calories,
		"protein", protein,
		"fat", fat,
		"carbs", carbs,
	)
	h.rdb.Expire(ctx, cacheKey, 24*time.Hour)

	writeJSON(w, http.StatusOK, summary)
}

func (h *StatsHandler) Weekly(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	weekStartStr := r.URL.Query().Get("week_start")
	if weekStartStr == "" {
		now := time.Now()
		offset := int(now.Weekday())
		weekStartStr = now.AddDate(0, 0, -offset).Format("2006-01-02")
	}
	start, err := time.Parse("2006-01-02", weekStartStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid week_start format")
		return
	}
	end := start.AddDate(0, 0, 6)

	entries, err := h.diary.ListByRange(r.Context(), userID, start, end)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}

	byDay := map[string]*domain.DailySummary{}
	for d := 0; d <= 6; d++ {
		day := start.AddDate(0, 0, d).Format("2006-01-02")
		byDay[day] = &domain.DailySummary{Date: day}
	}
	for _, e := range entries {
		day := e.EntryDate.Format("2006-01-02")
		s := byDay[day]
		s.TotalCalories += e.Calories
		if e.ProteinG != nil {
			s.ProteinG += *e.ProteinG
		}
		if e.FatG != nil {
			s.FatG += *e.FatG
		}
		if e.CarbsG != nil {
			s.CarbsG += *e.CarbsG
		}
	}

	days := make([]*domain.DailySummary, 0, 7)
	for d := 0; d <= 6; d++ {
		day := start.AddDate(0, 0, d).Format("2006-01-02")
		days = append(days, byDay[day])
	}

	writeJSON(w, http.StatusOK, map[string]any{"week_start": weekStartStr, "days": days})
}
