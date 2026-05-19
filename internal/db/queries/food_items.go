package queries

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/vlassovs/calories/internal/domain"
)

type FoodStore struct {
	pool *pgxpool.Pool
}

func NewFoodStore(pool *pgxpool.Pool) *FoodStore {
	return &FoodStore{pool: pool}
}

func (s *FoodStore) Create(ctx context.Context, f *domain.FoodItem) (*domain.FoodItem, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO food_items
		  (created_by, name, brand, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, is_public)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id, created_by, name, brand, calories_per_100g, protein_per_100g,
		          fat_per_100g, carbs_per_100g, is_public, created_at`,
		f.CreatedBy, f.Name, f.Brand, f.CaloriesPer100g,
		f.ProteinPer100g, f.FatPer100g, f.CarbsPer100g, f.IsPublic,
	)
	return scanFood(row)
}

func (s *FoodStore) GetByID(ctx context.Context, id, userID string) (*domain.FoodItem, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, created_by, name, brand, calories_per_100g, protein_per_100g,
		       fat_per_100g, carbs_per_100g, is_public, created_at
		FROM food_items
		WHERE id = $1 AND (is_public = true OR created_by = $2)`, id, userID)
	return scanFood(row)
}

func (s *FoodStore) Search(ctx context.Context, query, userID string, limit int) ([]*domain.FoodItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, created_by, name, brand, calories_per_100g, protein_per_100g,
		       fat_per_100g, carbs_per_100g, is_public, created_at
		FROM food_items
		WHERE (is_public = true OR created_by = $2)
		  AND ($1 = '' OR to_tsvector('english', name || ' ' || COALESCE(brand,'')) @@ plainto_tsquery('english', $1))
		ORDER BY name
		LIMIT $3`,
		query, userID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("Search: %w", err)
	}
	defer rows.Close()

	var items []*domain.FoodItem
	for rows.Next() {
		item, err := scanFood(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *FoodStore) Update(ctx context.Context, id, userID string, f *domain.FoodItem) (*domain.FoodItem, error) {
	row := s.pool.QueryRow(ctx, `
		UPDATE food_items SET
			name = $3, brand = $4, calories_per_100g = $5,
			protein_per_100g = $6, fat_per_100g = $7, carbs_per_100g = $8, is_public = $9
		WHERE id = $1 AND created_by = $2
		RETURNING id, created_by, name, brand, calories_per_100g, protein_per_100g,
		          fat_per_100g, carbs_per_100g, is_public, created_at`,
		id, userID, f.Name, f.Brand, f.CaloriesPer100g,
		f.ProteinPer100g, f.FatPer100g, f.CarbsPer100g, f.IsPublic,
	)
	return scanFood(row)
}

func (s *FoodStore) Delete(ctx context.Context, id, userID string) error {
	cmd, err := s.pool.Exec(ctx, `DELETE FROM food_items WHERE id = $1 AND created_by = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

type foodScanner interface {
	Scan(dest ...any) error
}

func scanFood(row foodScanner) (*domain.FoodItem, error) {
	var f domain.FoodItem
	err := row.Scan(
		&f.ID, &f.CreatedBy, &f.Name, &f.Brand, &f.CaloriesPer100g,
		&f.ProteinPer100g, &f.FatPer100g, &f.CarbsPer100g, &f.IsPublic, &f.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("scanFood: %w", err)
	}
	return &f, nil
}
