CREATE TABLE food_items (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
    name              TEXT        NOT NULL,
    brand             TEXT,
    calories_per_100g NUMERIC(7,2) NOT NULL,
    protein_per_100g  NUMERIC(7,2),
    fat_per_100g      NUMERIC(7,2),
    carbs_per_100g    NUMERIC(7,2),
    is_public         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_food_items_name_fts
    ON food_items USING GIN(to_tsvector('english', name || ' ' || COALESCE(brand, '')));
CREATE INDEX idx_food_items_created_by ON food_items(created_by);
