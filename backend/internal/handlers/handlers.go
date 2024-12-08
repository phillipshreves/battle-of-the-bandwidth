package handlers

import (
        "encoding/json"
        "fmt"
        "log"
        "net/http"

        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/database"
        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/models"
        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/speedtest"
)

type DefaultJsonResponse struct {
        Data  string `json:"data"`
        Error string `json:"error"`
}

func SpeedTestHandler(w http.ResponseWriter, r *http.Request) {
        speedtest.SpeedTestHandler(w, r)
}

func ServerNamesHandler(w http.ResponseWriter, r *http.Request) {
        switch r.Method {
        case http.MethodGet:
                getServerNames(w, r)
        }
}

func getServerNames(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        query := `
        SELECT DISTINCT server_name 
        FROM speedtest_results 
        WHERE server_name IS NOT NULL AND server_name != '' 
        ORDER BY server_name
    `

        rows, err := database.DB.Query(ctx, query)
        if err != nil {
                http.Error(w, fmt.Sprintf("Failed to fetch server names: %v", err), http.StatusInternalServerError)
                return
        }
        defer rows.Close()

        var serverNames []string
        for rows.Next() {
                var name string
                if err := rows.Scan(&name); err != nil {
                        http.Error(w, fmt.Sprintf("Failed to scan row: %v", err), http.StatusInternalServerError)
                        return
                }
                serverNames = append(serverNames, name)
        }

        if err := rows.Err(); err != nil {
                http.Error(w, fmt.Sprintf("Error reading rows: %v", err), http.StatusInternalServerError)
                return
        }

        w.Header().Set("Content-Type", "application/json")
        if err := json.NewEncoder(w).Encode(serverNames); err != nil {
                http.Error(w, "Failed to encode results to JSON", http.StatusInternalServerError)
        }
}

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
        response := DefaultJsonResponse{
                Data:  "{}",
                Error: "{}",
        }

        if err := json.NewEncoder(w).Encode(response); err != nil {
                http.Error(w, "Failed to encode response to JSON", http.StatusInternalServerError)
        }
}