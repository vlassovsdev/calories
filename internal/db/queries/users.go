package queries

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/vlassovs/calories/internal/domain"
)

type UserStore struct {
	pool *pgxpool.Pool
}

func NewUserStore(pool *pgxpool.Pool) *UserStore {
	return &UserStore{pool: pool}
}

func (s *UserStore) Create(ctx context.Context, email, passwordHash, displayName string) (*domain.User, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, display_name)
		VALUES ($1, $2, $3)
		RETURNING id, email, display_name, age, weight_kg, height_cm, sex,
		          activity_level, goal, avatar_data, created_at, updated_at`,
		email, passwordHash, displayName,
	)
	return scanUser(row)
}

func (s *UserStore) GetByEmail(ctx context.Context, email string) (*domain.User, string, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, display_name, age, weight_kg, height_cm, sex,
		       activity_level, goal, avatar_data, created_at, updated_at
		FROM users WHERE email = $1`, email)

	var u domain.User
	var hash string
	var age *int32
	var weightKg, heightCm *float64
	var sex *string
	var activityLevel, goal string

	err := row.Scan(&u.ID, &u.Email, &hash, &u.DisplayName,
		&age, &weightKg, &heightCm, &sex,
		&activityLevel, &goal, &u.AvatarData, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, "", nil
		}
		return nil, "", fmt.Errorf("GetByEmail: %w", err)
	}
	if age != nil {
		a := int(*age)
		u.Age = &a
	}
	u.WeightKg = weightKg
	u.HeightCm = heightCm
	u.Sex = sex
	u.ActivityLevel = domain.ActivityLevel(activityLevel)
	u.Goal = domain.GoalType(goal)
	return &u, hash, nil
}

func (s *UserStore) GetByID(ctx context.Context, id string) (*domain.User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, email, display_name, age, weight_kg, height_cm, sex,
		       activity_level, goal, avatar_data, created_at, updated_at
		FROM users WHERE id = $1`, id)
	return scanUser(row)
}

func (s *UserStore) Update(ctx context.Context, id string, age *int, weightKg, heightCm *float64, sex *string,
	activityLevel domain.ActivityLevel, goal domain.GoalType) (*domain.User, error) {
	row := s.pool.QueryRow(ctx, `
		UPDATE users SET
			age = $2, weight_kg = $3, height_cm = $4, sex = $5,
			activity_level = $6, goal = $7, updated_at = NOW()
		WHERE id = $1
		RETURNING id, email, display_name, age, weight_kg, height_cm, sex,
		          activity_level, goal, avatar_data, created_at, updated_at`,
		id, age, weightKg, heightCm, sex, string(activityLevel), string(goal),
	)
	return scanUser(row)
}

func (s *UserStore) UpdateAvatar(ctx context.Context, id, avatarData string) (*domain.User, error) {
	row := s.pool.QueryRow(ctx, `
		UPDATE users SET avatar_data = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING id, email, display_name, age, weight_kg, height_cm, sex,
		          activity_level, goal, avatar_data, created_at, updated_at`,
		id, avatarData,
	)
	return scanUser(row)
}

func scanUser(row pgx.Row) (*domain.User, error) {
	var u domain.User
	var age *int32
	var weightKg, heightCm *float64
	var sex *string
	var activityLevel, goal string

	err := row.Scan(&u.ID, &u.Email, &u.DisplayName,
		&age, &weightKg, &heightCm, &sex,
		&activityLevel, &goal, &u.AvatarData, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("scanUser: %w", err)
	}
	if age != nil {
		a := int(*age)
		u.Age = &a
	}
	u.WeightKg = weightKg
	u.HeightCm = heightCm
	u.Sex = sex
	u.ActivityLevel = domain.ActivityLevel(activityLevel)
	u.Goal = domain.GoalType(goal)
	return &u, nil
}
