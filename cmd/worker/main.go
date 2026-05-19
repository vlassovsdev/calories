package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/vlassovs/calories/internal/cache"
	"github.com/vlassovs/calories/internal/config"
	"github.com/vlassovs/calories/internal/db"
	"github.com/vlassovs/calories/internal/db/queries"
	"github.com/vlassovs/calories/internal/worker"
)

func main() {
	cfg, err := config.LoadWorker()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	rdb, err := cache.Connect(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis connect: %v", err)
	}
	defer rdb.Close()

	jobStore := queries.NewPhotoJobStore(pool)
	w := worker.New(rdb, jobStore, cfg)

	shutdownCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := w.Start(shutdownCtx); err != nil {
		log.Fatalf("worker: %v", err)
	}
	log.Println("worker stopped")
}
