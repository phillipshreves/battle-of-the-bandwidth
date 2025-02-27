package providers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/database"
	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/models"
)

func GetProviders() ([]models.Provider, error) {
	rows, err := database.DB.Query(context.Background(), "SELECT id, name FROM providers")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var providers []models.Provider
	for rows.Next() {
		var provider models.Provider
		if err := rows.Scan(&provider.ID, &provider.Name); err != nil {
			return nil, err
		}
		providers = append(providers, provider)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return providers, nil
}

func ProvidersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	providers, err := GetProviders()
	if err != nil {
		http.Error(w, "Failed to fetch providers", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": providers,
	})
}
