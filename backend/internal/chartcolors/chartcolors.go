package chartcolors

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"

	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/database"
	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/models"
)

type ChartColorSettings struct {
	SeriesID   string `json:"seriesId"`
	LineColor  string `json:"lineColor"`
	PointColor string `json:"pointColor"`
}

type ChartColorsRequest struct {
	Colors []ChartColorSettings `json:"colors"`
}

type ChartColorsResponse struct {
	Data  []ChartColorSettings `json:"data"`
	Error string               `json:"error"`
}

// ChartColorsHandler handles GET and POST requests for chart color preferences
func ChartColorsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getChartColors(w, r)
	case http.MethodPost:
		updateChartColors(w, r)
	default:
		errorDetails := fmt.Sprintf("Method not allowed: %v", r.Method)
		http.Error(w, errorDetails, http.StatusMethodNotAllowed)
	}
}

// getChartColors retrieves chart color preferences
func getChartColors(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	colors, err := fetchChartColors(ctx)
	if err != nil {
		log.Printf("Error fetching chart colors: %v", err)
		http.Error(w, fmt.Sprintf("Failed to retrieve chart colors: %v", err), http.StatusInternalServerError)
		return
	}

	response := ChartColorsResponse{
		Data:  colors,
		Error: "",
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response to JSON", http.StatusInternalServerError)
	}
}

// updateChartColors saves chart color preferences
func updateChartColors(w http.ResponseWriter, r *http.Request) {
	var request ChartColorsRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// Validate colors
	for _, color := range request.Colors {
		if !isValidHexColor(color.LineColor) || !isValidHexColor(color.PointColor) {
			http.Error(w, "Invalid hex color format", http.StatusBadRequest)
			return
		}
		if color.SeriesID == "" {
			http.Error(w, "series_id is required for each color setting", http.StatusBadRequest)
			return
		}
	}

	ctx := r.Context()
	if err := saveChartColors(ctx, request.Colors); err != nil {
		log.Printf("Error saving chart colors: %v", err)
		http.Error(w, fmt.Sprintf("Failed to save chart colors: %v", err), http.StatusInternalServerError)
		return
	}

	response := models.DefaultJsonResponse{
		Data:  "Chart colors updated successfully",
		Error: "",
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response to JSON", http.StatusInternalServerError)
	}
}

// fetchChartColors retrieves chart colors from database
func fetchChartColors(ctx context.Context) ([]ChartColorSettings, error) {
	query := `
		SELECT series_id, line_color, point_color 
		FROM chart_colors 
		ORDER BY series_id
	`

	rows, err := database.DB.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch chart colors: %w", err)
	}
	defer rows.Close()

	var colors []ChartColorSettings
	for rows.Next() {
		var color ChartColorSettings
		if err := rows.Scan(&color.SeriesID, &color.LineColor, &color.PointColor); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}
		colors = append(colors, color)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading rows: %w", err)
	}

	return colors, nil
}

// saveChartColors saves chart colors to database
func saveChartColors(ctx context.Context, colors []ChartColorSettings) error {
	// Start transaction
	tx, err := database.DB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// First, delete existing colors
	deleteQuery := `DELETE FROM chart_colors`
	if _, err := tx.Exec(ctx, deleteQuery); err != nil {
		return fmt.Errorf("failed to delete existing colors: %w", err)
	}

	// Insert new colors
	insertQuery := `
		INSERT INTO chart_colors (series_id, line_color, point_color, updated_at)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
	`

	for _, color := range colors {
		if _, err := tx.Exec(ctx, insertQuery, color.SeriesID, color.LineColor, color.PointColor); err != nil {
			return fmt.Errorf("failed to insert color for series %s: %w", color.SeriesID, err)
		}
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// isValidHexColor validates hex color format (#RRGGBB)
func isValidHexColor(color string) bool {
	hexColorRegex := regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)
	return hexColorRegex.MatchString(color)
}
