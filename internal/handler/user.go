package handler

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
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

func (h *UserHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	const maxBytes = 2 << 20 // 2 MB
	if err := r.ParseMultipartForm(maxBytes); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or invalid multipart form")
		return
	}
	file, _, err := r.FormFile("avatar")
	if err != nil {
		writeError(w, http.StatusBadRequest, "avatar field required")
		return
	}
	defer file.Close()

	imgBytes, err := io.ReadAll(io.LimitReader(file, maxBytes))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "read failed")
		return
	}

	mime := http.DetectContentType(imgBytes[:min512(len(imgBytes))])
	if mime != "image/jpeg" && mime != "image/png" && mime != "image/webp" {
		writeError(w, http.StatusBadRequest, "only JPEG, PNG, WebP images are supported")
		return
	}

	dataURL := "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(imgBytes)
	user, err := h.users.UpdateAvatar(r.Context(), userID, dataURL)
	if err != nil || user == nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func min512(n int) int {
	if n < 512 {
		return n
	}
	return 512
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
