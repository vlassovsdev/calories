CREATE TABLE diary_entries (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_item_id UUID         REFERENCES food_items(id) ON DELETE SET NULL,
    entry_date   DATE         NOT NULL,
    meal_type    TEXT         NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
    quantity_grams NUMERIC(7,2) NOT NULL,
    calories     NUMERIC(7,2) NOT NULL,
    protein_g    NUMERIC(7,2),
    fat_g        NUMERIC(7,2),
    carbs_g      NUMERIC(7,2),
    notes        TEXT,
    source       TEXT         NOT NULL DEFAULT 'manual',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diary_entries_user_date
    ON diary_entries(user_id, entry_date DESC);
