package settings

import (
        "encoding/json"
        "fmt"
        "log"
        "net/http"

        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/database"
        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/models"
)



func SettingsHandler(w http.ResponseWriter, r *http.Request) {
        switch r.Method {
        case http.MethodGet:
                getSettings(w, r)
        case http.MethodPatch:
                updateSettings(w, r)
        default:
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        }
}

func getSettings(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        query := `SELECT id, speedtest_frequency, created_at, updated_at FROM user_settings LIMIT 1`
        row := database.DB.QueryRow(ctx, query)

        var settings models.UserSettings
        if err := row.Scan(&settings.ID, &settings.SpeedtestFrequency, &settings.CreatedAt, &settings.UpdatedAt); err != nil {
                http.Error(w, fmt.Sprintf("Failed to retrieve settings: %v", err), http.StatusInternalServerError)
                return
        }

        w.Header().Set("Content-Type", "application/json")
        if err := json.NewEncoder(w).Encode(settings); err != nil {
                http.Error(w, "Failed to encode settings to JSON", http.StatusInternalServerError)
        }
}

func updateSettings(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        var settings models.UserSettings
        if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
                http.Error(w, "Invalid request payload", http.StatusBadRequest)
                return
        }

        query := `UPDATE user_settings SET speedtest_frequency = $1, updated_at = CURRENT_TIMESTAMP`
        if _, err := database.DB.Exec(ctx, query, settings.SpeedtestFrequency); err != nil {
                log.Printf("Failed to update settings: %v", err)
                http.Error(w, fmt.Sprintf("Failed to update settings: %v", err), http.StatusInternalServerError)
                return
        }

        w.Header().Set("Content-Type", "application/json")
        response := models.DefaultJsonResponse{
                Data:  "{}",
                Error: "{}",
        }

        if err := json.NewEncoder(w).Encode(response); err != nil {
                http.Error(w, "Failed to encode response to JSON", http.StatusInternalServerError)
        }
}