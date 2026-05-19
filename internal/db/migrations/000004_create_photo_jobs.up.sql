CREATE TYPE job_status AS ENUM ('pending','processing','completed','failed');

CREATE TABLE photo_jobs (
    id               UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stream_msg_id    TEXT       NOT NULL,
    status           job_status NOT NULL DEFAULT 'pending',
    image_url        TEXT,
    result_calories  NUMERIC(7,2),
    result_food_desc TEXT,
    error_message    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ
);

CREATE INDEX idx_photo_jobs_user ON photo_jobs(user_id, created_at DESC);
CREATE INDEX idx_photo_jobs_status ON photo_jobs(status)
    WHERE status IN ('pending','processing');
