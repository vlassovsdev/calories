package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/vlassovs/calories/internal/cache"
	"github.com/vlassovs/calories/internal/config"
	"github.com/vlassovs/calories/internal/db"
	"github.com/vlassovs/calories/internal/db/queries"
	"github.com/vlassovs/calories/internal/handler"
	"github.com/vlassovs/calories/internal/router"
	"github.com/vlassovs/calories/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(cfg.DatabaseURL); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	rdb, err := cache.Connect(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis connect: %v", err)
	}
	defer rdb.Close()

	userStore := queries.NewUserStore(pool)
	diaryStore := queries.NewDiaryStore(pool)
	foodStore := queries.NewFoodStore(pool)
	jobStore := queries.NewPhotoJobStore(pool)
	progressPhotoStore := queries.NewProgressPhotoStore(pool)

	authSvc := service.NewAuthService(userStore, rdb,
		[]byte(cfg.JWTSecret), cfg.JWTAccessTTL, cfg.JWTRefreshTTL)

	h := &router.Handlers{
		Auth:          handler.NewAuthHandler(authSvc),
		User:          handler.NewUserHandler(userStore, rdb),
		Diary:         handler.NewDiaryHandler(diaryStore),
		Food:          handler.NewFoodHandler(foodStore),
		Photo:         handler.NewPhotoHandler(jobStore, rdb, cfg.MaxUploadBytes),
		Stats:         handler.NewStatsHandler(diaryStore, userStore, rdb),
		Health:        handler.NewHealthHandler(pool, rdb),
		ProgressPhoto: handler.NewProgressPhotoHandler(progressPhotoStore, cfg.MaxUploadBytes),
	}

	httpHandler := router.New(h, pool, rdb, []byte(cfg.JWTSecret))

	srv := &http.Server{
		Addr:         cfg.ServerAddr,
		Handler:      httpHandler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	shutdownCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("API listening on %s", cfg.ServerAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	<-shutdownCtx.Done()
	log.Println("shutting down...")

	timeout, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(timeout)
}
