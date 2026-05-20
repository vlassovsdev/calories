package queries

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/vlassovs/calories/internal/domain"
)

type PhotoJobStore struct {
	pool *pgxpool.Pool
}

func NewPhotoJobStore(pool *pgxpool.Pool) *PhotoJobStore {
	return &PhotoJobStore{pool: pool}
}

func (s *PhotoJobStore) Create(ctx context.Context, userID, streamMsgID string) (*domain.PhotoJob, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO photo_jobs (user_id, stream_msg_id)
		VALUES ($1, $2)
		RETURNING id, user_id, stream_msg_id, status, result_calories,
		          result_food_desc, error_message, created_at, completed_at`,
		userID, streamMsgID,
	)
	return scanJob(row)
}

func (s *PhotoJobStore) GetByID(ctx context.Context, id, userID string) (*domain.PhotoJob, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, user_id, stream_msg_id, status, result_calories,
		       result_food_desc, error_message, created_at, completed_at
		FROM photo_jobs WHERE id = $1 AND user_id = $2`, id, userID)
	return scanJob(row)
}

func (s *PhotoJobStore) SetProcessing(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE photo_jobs SET status = 'processing' WHERE id = $1`, id)
	return err
}

func (s *PhotoJobStore) SetCompleted(ctx context.Context, id string, calories float64, foodDesc string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE photo_jobs SET status = 'completed',
			result_calories = $2, result_food_desc = $3, completed_at = NOW()
		WHERE id = $1`, id, calories, foodDesc)
	return err
}

func (s *PhotoJobStore) ListByUser(ctx context.Context, userID string, limit int) ([]*domain.PhotoJob, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, user_id, stream_msg_id, status, result_calories,
		       result_food_desc, error_message, created_at, completed_at
		FROM photo_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("ListByUser: %w", err)
	}
	defer rows.Close()

	var jobs []*domain.PhotoJob
	for rows.Next() {
		var j domain.PhotoJob
		var status string
		if err := rows.Scan(
			&j.ID, &j.UserID, &j.StreamMsgID, &status,
			&j.ResultCalories, &j.ResultFoodDesc, &j.ErrorMessage,
			&j.CreatedAt, &j.CompletedAt,
		); err != nil {
			return nil, fmt.Errorf("ListByUser scan: %w", err)
		}
		j.Status = domain.JobStatus(status)
		jobs = append(jobs, &j)
	}
	return jobs, rows.Err()
}

func (s *PhotoJobStore) SetFailed(ctx context.Context, id, errMsg string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE photo_jobs SET status = 'failed',
			error_message = $2, completed_at = NOW()
		WHERE id = $1`, id, errMsg)
	return err
}

func scanJob(row pgx.Row) (*domain.PhotoJob, error) {
	var j domain.PhotoJob
	var status string
	err := row.Scan(
		&j.ID, &j.UserID, &j.StreamMsgID, &status,
		&j.ResultCalories, &j.ResultFoodDesc, &j.ErrorMessage,
		&j.CreatedAt, &j.CompletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("scanJob: %w", err)
	}
	j.Status = domain.JobStatus(status)
	return &j, nil
}
