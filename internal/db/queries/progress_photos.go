package queries

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/vlassovs/calories/internal/domain"
)

type ProgressPhotoStore struct {
	pool *pgxpool.Pool
}

func NewProgressPhotoStore(pool *pgxpool.Pool) *ProgressPhotoStore {
	return &ProgressPhotoStore{pool: pool}
}

func (s *ProgressPhotoStore) Create(ctx context.Context, userID, imageData string, weightKg *float64, notes *string, takenAt string) (*domain.ProgressPhoto, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO progress_photos (user_id, image_data, weight_kg, notes, taken_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, image_data, weight_kg, notes, taken_at, created_at`,
		userID, imageData, weightKg, notes, takenAt,
	)
	var p domain.ProgressPhoto
	var takenAtTime time.Time
	err := row.Scan(&p.ID, &p.UserID, &p.ImageData, &p.WeightKg, &p.Notes, &takenAtTime, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("Create progress_photo: %w", err)
	}
	p.TakenAt = takenAtTime.Format("2006-01-02")
	return &p, nil
}

func (s *ProgressPhotoStore) ListByUser(ctx context.Context, userID string) ([]*domain.ProgressPhoto, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, user_id, image_data, weight_kg, notes, taken_at, created_at
		FROM progress_photos WHERE user_id = $1
		ORDER BY taken_at DESC, created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("ListByUser progress_photos: %w", err)
	}
	defer rows.Close()

	var photos []*domain.ProgressPhoto
	for rows.Next() {
		var p domain.ProgressPhoto
		var takenAt time.Time
		if err := rows.Scan(&p.ID, &p.UserID, &p.ImageData, &p.WeightKg, &p.Notes, &takenAt, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan progress_photo: %w", err)
		}
		p.TakenAt = takenAt.Format("2006-01-02")
		photos = append(photos, &p)
	}
	return photos, rows.Err()
}
