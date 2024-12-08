package servers

import (
        "encoding/json"
        "fmt"
        "net/http"

        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/database"
)

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