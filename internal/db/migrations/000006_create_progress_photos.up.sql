CREATE TABLE progress_photos (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_data TEXT NOT NULL,
    weight_kg  NUMERIC(5,2),
    notes      TEXT,
    taken_at   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON progress_photos(user_id, taken_at DESC);
