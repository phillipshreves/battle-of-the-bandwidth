package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"strconv"
	"time"
)

func speedTestHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getSpeedtests(w, r)
	case http.MethodPost:
		runSpeedTestHandler(w, r)
	default:
		errorDetails := fmt.Sprintf("Method not allowed: %v", r.Method)
		http.Error(w, errorDetails, http.StatusMethodNotAllowed)
	}
}

func getSpeedtests(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	startDate := r.URL.Query().Get("startDate")
	endDate := r.URL.Query().Get("endDate")
	serverName := r.URL.Query().Get("server")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	// Default values for pagination
	limit := 20
	offset := 0

	// Parse pagination parameters if provided
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	results, err := fetchFilteredResults(startDate, endDate, serverName, limit, offset)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve results: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(results); err != nil {
		http.Error(w, "Failed to encode results to JSON", http.StatusInternalServerError)
	}
}

func getServerNamesHandler(w http.ResponseWriter, r *http.Request) {
	query := `
        SELECT DISTINCT server_name 
        FROM speedtest_results 
        WHERE server_name IS NOT NULL AND server_name != '' 
        ORDER BY server_name
    `

	rows, err := db.Query(context.Background(), query)
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

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(serverNames); err != nil {
		http.Error(w, "Failed to encode results to JSON", http.StatusInternalServerError)
	}
}

func storeResult(result SpeedTestResult) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	errCount := 0
	errCountMax := 10
	var err error

	for errCount < errCountMax {
		_, err = db.Exec(ctx, `
        INSERT INTO speedtest_results (
            timestamp, server_name, server_url, 
            client_ip, client_hostname, client_city, client_region, client_country, client_loc, client_org, client_postal, client_timezone,
            bytes_sent, bytes_received, ping, jitter, upload, download, share
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
			result.Timestamp, result.Server.Name, result.Server.URL,
			result.Client.IP, result.Client.Hostname, result.Client.City, result.Client.Region, result.Client.Country, result.Client.Loc, result.Client.Org, result.Client.Postal, result.Client.Timezone,
			result.BytesSent, result.BytesReceived, result.Ping, result.Jitter, result.Upload, result.Download, result.Share,
		)

		if err == nil {
			log.Printf("Successfully stored result for %s", result.Timestamp)
			return nil
		}

		log.Printf("Failed to store speed test result: %v", err)
		time.Sleep(time.Second)
		errCount++
	}
	return fmt.Errorf("failed to store speed test result: %w", err)
}

func runSpeedTest() {
	cmd := exec.Command("librespeed-cli", "--json")
	output, err := cmd.Output()
	if err != nil {
		log.Printf("Error running speedtest: %v", err)
		return
	}

	var results []SpeedTestResult
	if err := json.Unmarshal(output, &results); err != nil {
		log.Printf("Error parsing JSON: %v", err)
		return
	}

	for _, result := range results {
		if err := storeResult(result); err != nil {
			log.Printf("Error storing result: %v", err)
		}
	}
}

func fetchFilteredResults(startDate, endDate string, serverName string, limit, offset int) ([]SpeedTestResult, error) {
	if startDate == "" {
		startDate = "1900-01-01T00:00:00.000-00"
	}
	if endDate == "" {
		endDate = "2500-01-01T00:00:00.000-00"
	}
	query := `
        SELECT 
            timestamp, server_name, server_url, client_ip, client_hostname,
            client_city, client_region, client_country, client_loc, client_org,
            client_postal, client_timezone, bytes_sent, bytes_received, 
            ping, jitter, upload, download, share
        FROM speedtest_results
        WHERE ($1::timestamptz IS NULL OR timestamp >= $1)
        AND ($2::timestamptz IS NULL OR timestamp <= $2)
        AND ($3 = '' OR server_name = $3)
        ORDER BY timestamp DESC
        LIMIT $4 OFFSET $5
    `

	rows, err := db.Query(context.Background(), query, startDate, endDate, serverName, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch results: %w", err)
	}
	defer rows.Close()

	var results []SpeedTestResult
	for rows.Next() {
		var result SpeedTestResult
		var timestamp time.Time

		if err := rows.Scan(
			&timestamp, &result.Server.Name, &result.Server.URL, &result.Client.IP, &result.Client.Hostname,
			&result.Client.City, &result.Client.Region, &result.Client.Country, &result.Client.Loc, &result.Client.Org,
			&result.Client.Postal, &result.Client.Timezone, &result.BytesSent, &result.BytesReceived,
			&result.Ping, &result.Jitter, &result.Upload, &result.Download, &result.Share,
		); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		result.Timestamp = timestamp.Format(time.RFC3339)
		results = append(results, result)
	}

	if rows.Err() != nil {
		return nil, fmt.Errorf("error reading rows: %w", rows.Err())
	}

	return results, nil
}

// handleSettings manages user settings.
func handleSettings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getSettings(w, r)
	case http.MethodPatch:
		updateSettings(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// getSettings retrieves the user settings from the database.
func getSettings(w http.ResponseWriter, r *http.Request) {
	query := `SELECT id, speedtest_frequency, created_at, updated_at FROM user_settings LIMIT 1`
	row := db.QueryRow(context.Background(), query)

	var settings UserSettings
	if err := row.Scan(&settings.ID, &settings.SpeedtestFrequency, &settings.CreatedAt, &settings.UpdatedAt); err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve settings: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(settings); err != nil {
		http.Error(w, "Failed to encode settings to JSON", http.StatusInternalServerError)
	}
}

// updateSettings updates the user settings in the database.
func updateSettings(w http.ResponseWriter, r *http.Request) {
	var settings UserSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	query := `UPDATE user_settings SET speedtest_frequency = $1, updated_at = CURRENT_TIMESTAMP`
	if _, err := db.Exec(context.Background(), query, settings.SpeedtestFrequency); err != nil {
		fmt.Println(err)
		http.Error(w, fmt.Sprintf("Failed to update settings: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent) // No content to return
}

func runSpeedTestHandler(w http.ResponseWriter, r *http.Request) {
	go runSpeedTest() // Run the speed test in a goroutine
	w.WriteHeader(http.StatusNoContent)
}
