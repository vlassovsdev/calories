package router

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/vlassovs/calories/internal/handler"
	"github.com/vlassovs/calories/internal/middleware"
)

type Handlers struct {
	Auth   *handler.AuthHandler
	User   *handler.UserHandler
	Diary  *handler.DiaryHandler
	Food   *handler.FoodHandler
	Photo  *handler.PhotoHandler
	Stats  *handler.StatsHandler
	Health *handler.HealthHandler
}

func New(h *Handlers, pool *pgxpool.Pool, rdb *redis.Client, jwtSecret []byte) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/health", h.Health.Check)

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Use(middleware.RateLimitMiddleware(rdb, "auth", 10, time.Minute))
			r.Post("/register", h.Auth.Register)
			r.Post("/login", h.Auth.Login)
			r.Post("/refresh", h.Auth.Refresh)
			r.Post("/logout", h.Auth.Logout)
		})

		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTMiddleware(jwtSecret))
			r.Use(middleware.RateLimitMiddleware(rdb, "api", 100, time.Minute))

			r.Route("/users/me", func(r chi.Router) {
				r.Get("/", h.User.GetProfile)
				r.Put("/", h.User.UpdateProfile)
				r.Get("/tdee", h.User.GetTDEE)
			})

			r.Route("/diary/entries", func(r chi.Router) {
				r.Get("/", h.Diary.List)
				r.Post("/", h.Diary.Create)
				r.Put("/{id}", h.Diary.Update)
				r.Delete("/{id}", h.Diary.Delete)
			})

			r.Route("/food/items", func(r chi.Router) {
				r.Get("/", h.Food.Search)
				r.Post("/", h.Food.Create)
				r.Get("/{id}", h.Food.Get)
				r.Put("/{id}", h.Food.Update)
				r.Delete("/{id}", h.Food.Delete)
			})

			r.Route("/photos", func(r chi.Router) {
				r.With(middleware.RateLimitMiddleware(rdb, "photo", 5, time.Minute)).
					Post("/analyze", h.Photo.Analyze)
				r.Get("/jobs/{id}", h.Photo.GetJob)
			})

			r.Route("/stats", func(r chi.Router) {
				r.Get("/daily", h.Stats.Daily)
				r.Get("/weekly", h.Stats.Weekly)
			})
		})
	})

	return r
}
