package handler

import (
	"encoding/base64"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/vlassovs/calories/internal/db/queries"
	"github.com/vlassovs/calories/internal/domain"
	"github.com/vlassovs/calories/internal/middleware"
)

type ProgressPhotoHandler struct {
	store          *queries.ProgressPhotoStore
	maxUploadBytes int64
}

func NewProgressPhotoHandler(store *queries.ProgressPhotoStore, maxUploadBytes int64) *ProgressPhotoHandler {
	return &ProgressPhotoHandler{store: store, maxUploadBytes: maxUploadBytes}
}

func (h *ProgressPhotoHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	photos, err := h.store.ListByUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	if photos == nil {
		photos = []*domain.ProgressPhoto{}
	}
	writeJSON(w, http.StatusOK, photos)
}

func (h *ProgressPhotoHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	if err := r.ParseMultipartForm(h.maxUploadBytes); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or invalid multipart form")
		return
	}

	file, _, err := r.FormFile("photo")
	if err != nil {
		writeError(w, http.StatusBadRequest, "photo field required")
		return
	}
	defer file.Close()

	imgBytes, err := io.ReadAll(io.LimitReader(file, h.maxUploadBytes))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "read failed")
		return
	}

	mime := http.DetectContentType(imgBytes[:minPP(512, len(imgBytes))])
	if mime != "image/jpeg" && mime != "image/png" && mime != "image/webp" {
		writeError(w, http.StatusBadRequest, "only JPEG, PNG, WebP images are supported")
		return
	}

	imageData := "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(imgBytes)

	var weightKg *float64
	if wStr := r.FormValue("weight_kg"); wStr != "" {
		if w64, err := strconv.ParseFloat(wStr, 64); err == nil {
			weightKg = &w64
		}
	}

	var notes *string
	if n := r.FormValue("notes"); n != "" {
		notes = &n
	}

	takenAt := r.FormValue("taken_at")
	if takenAt == "" {
		takenAt = time.Now().Format("2006-01-02")
	}

	photo, err := h.store.Create(r.Context(), userID, imageData, weightKg, notes, takenAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	writeJSON(w, http.StatusCreated, photo)
}

func minPP(a, b int) int {
	if a < b {
		return a
	}
	return b
}
