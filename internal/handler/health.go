package handler

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type HealthHandler struct {
	pool *pgxpool.Pool
	rdb  *redis.Client
}

func NewHealthHandler(pool *pgxpool.Pool, rdb *redis.Client) *HealthHandler {
	return &HealthHandler{pool: pool, rdb: rdb}
}

func (h *HealthHandler) Check(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	status := map[string]string{"status": "ok"}

	if err := h.pool.Ping(ctx); err != nil {
		status["postgres"] = "error: " + err.Error()
		status["status"] = "degraded"
	} else {
		status["postgres"] = "ok"
	}

	if err := h.rdb.Ping(ctx).Err(); err != nil {
		status["redis"] = "error: " + err.Error()
		status["status"] = "degraded"
	} else {
		status["redis"] = "ok"
	}

	code := http.StatusOK
	if status["status"] != "ok" {
		code = http.StatusServiceUnavailable
	}
	writeJSON(w, code, status)
}
