package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const anthropicMessagesURL = "https://api.anthropic.com/v1/messages"

type VisionClient struct {
	apiKey     string
	httpClient *http.Client
	model      string
}

func NewVisionClient(apiKey string) *VisionClient {
	return &VisionClient{
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 60 * time.Second},
		model:      "claude-haiku-4-5-20251001",
	}
}

type AnalysisResult struct {
	FoodDescription   string   `json:"food_description"`
	EstimatedCalories float64  `json:"estimated_calories"`
	CaloriesRangeLow  float64  `json:"calories_range_low"`
	CaloriesRangeHigh float64  `json:"calories_range_high"`
	ProteinG          *float64 `json:"protein_g"`
	FatG              *float64 `json:"fat_g"`
	CarbsG            *float64 `json:"carbs_g"`
	Error             string   `json:"error,omitempty"`
}

func (c *VisionClient) AnalyzeFood(ctx context.Context, imageDataB64, mediaType string) (*AnalysisResult, error) {
	prompt := `Analyze this food photo. Respond ONLY with valid JSON (no markdown):
{
  "food_description": "brief description of what you see",
  "estimated_calories": <number, total for the visible portion>,
  "calories_range_low": <number>,
  "calories_range_high": <number>,
  "protein_g": <number or null>,
  "fat_g": <number or null>,
  "carbs_g": <number or null>
}
If you cannot identify food, return {"error": "not_food"}.`

	reqBody := map[string]any{
		"model":      c.model,
		"max_tokens": 512,
		"messages": []map[string]any{
			{
				"role": "user",
				"content": []map[string]any{
					{
						"type": "image",
						"source": map[string]any{
							"type":       "base64",
							"media_type": mediaType,
							"data":       imageDataB64,
						},
					},
					{
						"type": "text",
						"text": prompt,
					},
				},
			},
		},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, anthropicMessagesURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http do: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("anthropic API error %d: %s", resp.StatusCode, string(b))
	}

	var apiResp struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	if len(apiResp.Content) == 0 {
		return nil, fmt.Errorf("empty response from API")
	}

	var result AnalysisResult
	if err := json.Unmarshal([]byte(apiResp.Content[0].Text), &result); err != nil {
		return nil, fmt.Errorf("parse analysis result: %w", err)
	}
	if result.Error != "" {
		return nil, fmt.Errorf("analysis failed: %s", result.Error)
	}
	return &result, nil
}
