package handler

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"
	"github.com/vlassovs/calories/internal/db/queries"
	"github.com/vlassovs/calories/internal/middleware"
)

type PhotoHandler struct {
	jobs           *queries.PhotoJobStore
	rdb            *redis.Client
	maxUploadBytes int64
}

func NewPhotoHandler(jobs *queries.PhotoJobStore, rdb *redis.Client, maxUploadBytes int64) *PhotoHandler {
	return &PhotoHandler{jobs: jobs, rdb: rdb, maxUploadBytes: maxUploadBytes}
}

func (h *PhotoHandler) Analyze(w http.ResponseWriter, r *http.Request) {
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

	// Detect MIME type from first 512 bytes
	mime := http.DetectContentType(imgBytes[:min(512, len(imgBytes))])
	if mime != "image/jpeg" && mime != "image/png" && mime != "image/webp" && mime != "image/gif" {
		writeError(w, http.StatusBadRequest, "only JPEG, PNG, WebP images are supported")
		return
	}

	imgB64 := base64.StdEncoding.EncodeToString(imgBytes)

	ctx := r.Context()

	// Insert job with placeholder stream ID; update after XADD
	job, err := h.jobs.Create(ctx, userID, "pending")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create job failed")
		return
	}

	msgID, err := h.rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: "photo:analysis",
		Values: map[string]any{
			"job_id":         job.ID,
			"user_id":        userID,
			"image_data_b64": imgB64,
			"media_type":     mime,
			"created_at":     fmt.Sprintf("%d", time.Now().Unix()),
		},
	}).Result()
	if err != nil {
		h.jobs.SetFailed(ctx, job.ID, "failed to enqueue")
		writeError(w, http.StatusInternalServerError, "queue error")
		return
	}

	// Update stream_msg_id now that we have it
	h.rdb.HSet(ctx, fmt.Sprintf("pjob:%s", job.ID),
		"status", "pending",
		"stream_msg_id", msgID,
	)
	h.rdb.Expire(ctx, fmt.Sprintf("pjob:%s", job.ID), time.Hour)

	writeJSON(w, http.StatusAccepted, map[string]string{
		"job_id":   job.ID,
		"poll_url": fmt.Sprintf("/api/v1/photos/jobs/%s", job.ID),
		"status":   "pending",
	})
}

func (h *PhotoHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	jobID := chi.URLParam(r, "id")
	ctx := r.Context()

	// Fast path: Redis hash
	data, err := h.rdb.HGetAll(ctx, fmt.Sprintf("pjob:%s", jobID)).Result()
	if err == nil && len(data) > 0 {
		writeJSON(w, http.StatusOK, data)
		return
	}

	// Fallback: database
	job, err := h.jobs.GetByID(ctx, jobID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	if job == nil {
		writeError(w, http.StatusNotFound, "job not found")
		return
	}
	writeJSON(w, http.StatusOK, job)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
