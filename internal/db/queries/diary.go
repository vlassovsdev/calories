package queries

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/vlassovs/calories/internal/domain"
)

type DiaryStore struct {
	pool *pgxpool.Pool
}

func NewDiaryStore(pool *pgxpool.Pool) *DiaryStore {
	return &DiaryStore{pool: pool}
}

func (s *DiaryStore) Create(ctx context.Context, e *domain.DiaryEntry) (*domain.DiaryEntry, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO diary_entries
		  (user_id, food_item_id, entry_date, meal_type, quantity_grams,
		   calories, protein_g, fat_g, carbs_g, notes, source)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING id, user_id, food_item_id, entry_date, meal_type, quantity_grams,
		          calories, protein_g, fat_g, carbs_g, notes, source, created_at`,
		e.UserID, e.FoodItemID, e.EntryDate.Format("2006-01-02"), e.MealType, e.QuantityG,
		e.Calories, e.ProteinG, e.FatG, e.CarbsG, e.Notes, e.Source,
	)
	return scanEntry(row)
}

func (s *DiaryStore) ListByDate(ctx context.Context, userID string, date time.Time) ([]*domain.DiaryEntry, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, user_id, food_item_id, entry_date, meal_type, quantity_grams,
		       calories, protein_g, fat_g, carbs_g, notes, source, created_at
		FROM diary_entries
		WHERE user_id = $1 AND entry_date = $2
		ORDER BY created_at`,
		userID, date.Format("2006-01-02"),
	)
	if err != nil {
		return nil, fmt.Errorf("ListByDate: %w", err)
	}
	defer rows.Close()
	return collectEntries(rows)
}

func (s *DiaryStore) ListByRange(ctx context.Context, userID string, start, end time.Time) ([]*domain.DiaryEntry, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, user_id, food_item_id, entry_date, meal_type, quantity_grams,
		       calories, protein_g, fat_g, carbs_g, notes, source, created_at
		FROM diary_entries
		WHERE user_id = $1 AND entry_date BETWEEN $2 AND $3
		ORDER BY entry_date, created_at`,
		userID, start.Format("2006-01-02"), end.Format("2006-01-02"),
	)
	if err != nil {
		return nil, fmt.Errorf("ListByRange: %w", err)
	}
	defer rows.Close()
	return collectEntries(rows)
}

func (s *DiaryStore) Update(ctx context.Context, id, userID string, mealType string, quantityG, calories float64,
	proteinG, fatG, carbsG *float64, notes *string) (*domain.DiaryEntry, error) {
	row := s.pool.QueryRow(ctx, `
		UPDATE diary_entries SET
			meal_type = $3, quantity_grams = $4, calories = $5,
			protein_g = $6, fat_g = $7, carbs_g = $8, notes = $9
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, food_item_id, entry_date, meal_type, quantity_grams,
		          calories, protein_g, fat_g, carbs_g, notes, source, created_at`,
		id, userID, mealType, quantityG, calories, proteinG, fatG, carbsG, notes,
	)
	return scanEntry(row)
}

func (s *DiaryStore) Delete(ctx context.Context, id, userID string) error {
	cmd, err := s.pool.Exec(ctx, `DELETE FROM diary_entries WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (s *DiaryStore) DailySums(ctx context.Context, userID string, date time.Time) (calories, protein, fat, carbs float64, err error) {
	row := s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(calories),0), COALESCE(SUM(protein_g),0),
		       COALESCE(SUM(fat_g),0), COALESCE(SUM(carbs_g),0)
		FROM diary_entries WHERE user_id = $1 AND entry_date = $2`,
		userID, date.Format("2006-01-02"),
	)
	err = row.Scan(&calories, &protein, &fat, &carbs)
	return
}

func scanEntry(row pgx.Row) (*domain.DiaryEntry, error) {
	var e domain.DiaryEntry
	var entryDate time.Time
	err := row.Scan(
		&e.ID, &e.UserID, &e.FoodItemID, &entryDate, &e.MealType, &e.QuantityG,
		&e.Calories, &e.ProteinG, &e.FatG, &e.CarbsG, &e.Notes, &e.Source, &e.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("scanEntry: %w", err)
	}
	e.EntryDate = entryDate
	return &e, nil
}

func collectEntries(rows pgx.Rows) ([]*domain.DiaryEntry, error) {
	var entries []*domain.DiaryEntry
	for rows.Next() {
		var e domain.DiaryEntry
		var entryDate time.Time
		if err := rows.Scan(
			&e.ID, &e.UserID, &e.FoodItemID, &entryDate, &e.MealType, &e.QuantityG,
			&e.Calories, &e.ProteinG, &e.FatG, &e.CarbsG, &e.Notes, &e.Source, &e.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("collectEntries scan: %w", err)
		}
		e.EntryDate = entryDate
		entries = append(entries, &e)
	}
	return entries, rows.Err()
}
