CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE activity_level AS ENUM (
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extra_active'
);

CREATE TYPE goal_type AS ENUM (
    'lose_weight',
    'maintain_weight',
    'gain_weight'
);

CREATE TABLE users (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT           NOT NULL UNIQUE,
    password_hash TEXT           NOT NULL,
    display_name  TEXT           NOT NULL,
    age           INTEGER,
    weight_kg     NUMERIC(5,2),
    height_cm     NUMERIC(5,2),
    sex           CHAR(1),
    activity_level activity_level NOT NULL DEFAULT 'sedentary',
    goal          goal_type      NOT NULL DEFAULT 'maintain_weight',
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
