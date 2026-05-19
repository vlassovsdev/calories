package worker

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/vlassovs/calories/internal/config"
	"github.com/vlassovs/calories/internal/db/queries"
)

const (
	streamName    = "photo:analysis"
	groupName     = "workers"
	maxRetries    = 3
	retryCountKey = "retry_count"
)

type Worker struct {
	rdb    *redis.Client
	jobs   *queries.PhotoJobStore
	vision *VisionClient
	cfg    *config.WorkerConfig
	name   string
}

func New(rdb *redis.Client, jobs *queries.PhotoJobStore, cfg *config.WorkerConfig) *Worker {
	hostname, _ := os.Hostname()
	name := fmt.Sprintf("worker-%s-%d", hostname, os.Getpid())
	return &Worker{
		rdb:    rdb,
		jobs:   jobs,
		vision: NewVisionClient(cfg.AnthropicAPIKey),
		cfg:    cfg,
		name:   name,
	}
}

func (w *Worker) Start(ctx context.Context) error {
	if err := w.ensureConsumerGroup(ctx); err != nil {
		return err
	}
	log.Printf("worker %s started, listening on stream %s", w.name, streamName)

	ticker := time.NewTicker(time.Duration(w.cfg.ClaimMinIdleMs) * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			w.claimStalled(ctx)
		default:
		}

		msgs, err := w.rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    groupName,
			Consumer: w.name,
			Streams:  []string{streamName, ">"},
			Count:    1,
			Block:    time.Duration(w.cfg.BlockMs) * time.Millisecond,
		}).Result()
		if err != nil {
			if err == redis.Nil || err.Error() == "redis: nil" {
				continue
			}
			if ctx.Err() != nil {
				return nil
			}
			log.Printf("XReadGroup error: %v", err)
			time.Sleep(time.Second)
			continue
		}

		for _, stream := range msgs {
			for _, msg := range stream.Messages {
				w.processMessage(ctx, msg)
			}
		}
	}
}

func (w *Worker) processMessage(ctx context.Context, msg redis.XMessage) {
	jobID, _ := msg.Values["job_id"].(string)
	if jobID == "" {
		w.rdb.XAck(ctx, streamName, groupName, msg.ID)
		return
	}

	imageB64, _ := msg.Values["image_data_b64"].(string)
	mediaType, _ := msg.Values["media_type"].(string)
	if mediaType == "" {
		mediaType = "image/jpeg"
	}

	retryCount := 0
	if rc, ok := msg.Values[retryCountKey].(string); ok {
		retryCount, _ = strconv.Atoi(rc)
	}

	if err := w.jobs.SetProcessing(ctx, jobID); err != nil {
		log.Printf("SetProcessing(%s): %v", jobID, err)
	}

	result, err := w.vision.AnalyzeFood(ctx, imageB64, mediaType)
	if err != nil {
		log.Printf("AnalyzeFood(%s): %v", jobID, err)
		retryCount++
		if retryCount >= maxRetries {
			w.jobs.SetFailed(ctx, jobID, err.Error())
			w.rdb.XAck(ctx, streamName, groupName, msg.ID)
		}
		return
	}

	if err := w.jobs.SetCompleted(ctx, jobID, result.EstimatedCalories, result.FoodDescription); err != nil {
		log.Printf("SetCompleted(%s): %v", jobID, err)
	}
	w.rdb.XAck(ctx, streamName, groupName, msg.ID)
}

func (w *Worker) claimStalled(ctx context.Context) {
	msgs, _, err := w.rdb.XAutoClaim(ctx, &redis.XAutoClaimArgs{
		Stream:   streamName,
		Group:    groupName,
		Consumer: w.name,
		MinIdle:  time.Duration(w.cfg.ClaimMinIdleMs) * time.Millisecond,
		Start:    "0-0",
		Count:    10,
	}).Result()
	if err != nil {
		return
	}
	for _, msg := range msgs {
		w.processMessage(ctx, msg)
	}
}

func (w *Worker) ensureConsumerGroup(ctx context.Context) error {
	err := w.rdb.XGroupCreateMkStream(ctx, streamName, groupName, "$").Err()
	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		return fmt.Errorf("XGroupCreateMkStream: %w", err)
	}
	return nil
}
