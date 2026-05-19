package config

import (
	"time"

	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	ServerAddr      string        `envconfig:"SERVER_ADDR" default:":8080"`
	DatabaseURL     string        `envconfig:"DATABASE_URL" required:"true"`
	RedisURL        string        `envconfig:"REDIS_URL" required:"true"`
	JWTSecret       string        `envconfig:"JWT_SECRET" required:"true"`
	JWTAccessTTL    time.Duration `envconfig:"JWT_ACCESS_TTL" default:"15m"`
	JWTRefreshTTL   time.Duration `envconfig:"JWT_REFRESH_TTL" default:"720h"`
	AnthropicAPIKey string        `envconfig:"ANTHROPIC_API_KEY" required:"true"`
	MaxUploadBytes  int64         `envconfig:"MAX_UPLOAD_BYTES" default:"5242880"`
}

type WorkerConfig struct {
	DatabaseURL     string `envconfig:"DATABASE_URL" required:"true"`
	RedisURL        string `envconfig:"REDIS_URL" required:"true"`
	AnthropicAPIKey string `envconfig:"ANTHROPIC_API_KEY" required:"true"`
	Concurrency     int    `envconfig:"WORKER_CONCURRENCY" default:"4"`
	BlockMs         int    `envconfig:"WORKER_BLOCK_MS" default:"5000"`
	ClaimMinIdleMs  int64  `envconfig:"WORKER_CLAIM_MIN_IDLE_MS" default:"300000"`
}

func Load() (*Config, error) {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func LoadWorker() (*WorkerConfig, error) {
	var cfg WorkerConfig
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
