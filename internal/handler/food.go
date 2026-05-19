package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/vlassovs/calories/internal/db/queries"
	"github.com/vlassovs/calories/internal/domain"
	"github.com/vlassovs/calories/internal/middleware"
)

type FoodHandler struct {
	food *queries.FoodStore
}

func NewFoodHandler(food *queries.FoodStore) *FoodHandler {
	return &FoodHandler{food: food}
}

func (h *FoodHandler) Search(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	q := r.URL.Query().Get("q")
	items, err := h.food.Search(r.Context(), q, userID, 50)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "search failed")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *FoodHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	var req struct {
		Name            string   `json:"name"`
		Brand           *string  `json:"brand"`
		CaloriesPer100g float64  `json:"calories_per_100g"`
		ProteinPer100g  *float64 `json:"protein_per_100g"`
		FatPer100g      *float64 `json:"fat_per_100g"`
		CarbsPer100g    *float64 `json:"carbs_per_100g"`
		IsPublic        bool     `json:"is_public"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Name == "" || req.CaloriesPer100g < 0 {
		writeError(w, http.StatusBadRequest, "name and calories_per_100g required")
		return
	}
	item := &domain.FoodItem{
		CreatedBy:       &userID,
		Name:            req.Name,
		Brand:           req.Brand,
		CaloriesPer100g: req.CaloriesPer100g,
		ProteinPer100g:  req.ProteinPer100g,
		FatPer100g:      req.FatPer100g,
		CarbsPer100g:    req.CarbsPer100g,
		IsPublic:        req.IsPublic,
	}
	created, err := h.food.Create(r.Context(), item)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (h *FoodHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	id := chi.URLParam(r, "id")
	item, err := h.food.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	if item == nil {
		writeError(w, http.StatusNotFound, "food item not found")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *FoodHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	id := chi.URLParam(r, "id")
	var req struct {
		Name            string   `json:"name"`
		Brand           *string  `json:"brand"`
		CaloriesPer100g float64  `json:"calories_per_100g"`
		ProteinPer100g  *float64 `json:"protein_per_100g"`
		FatPer100g      *float64 `json:"fat_per_100g"`
		CarbsPer100g    *float64 `json:"carbs_per_100g"`
		IsPublic        bool     `json:"is_public"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	item := &domain.FoodItem{
		Name:            req.Name,
		Brand:           req.Brand,
		CaloriesPer100g: req.CaloriesPer100g,
		ProteinPer100g:  req.ProteinPer100g,
		FatPer100g:      req.FatPer100g,
		CarbsPer100g:    req.CarbsPer100g,
		IsPublic:        req.IsPublic,
	}
	updated, err := h.food.Update(r.Context(), id, userID, item)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	if updated == nil {
		writeError(w, http.StatusNotFound, "food item not found")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *FoodHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	id := chi.URLParam(r, "id")
	if err := h.food.Delete(r.Context(), id, userID); err != nil {
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusNotFound, "food item not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "delete failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
