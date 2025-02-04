package speedtest

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"strconv"
	"time"

	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/database"
	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/models"
)

func SpeedTestHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getSpeedTests(w, r)
	case http.MethodPost:
		startSpeedTest(w, r)
	default:
		errorDetails := fmt.Sprintf("Method not allowed: %v", r.Method)
		http.Error(w, errorDetails, http.StatusMethodNotAllowed)
	}
}

func getSpeedTests(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	startDate := r.URL.Query().Get("startDate")
	endDate := r.URL.Query().Get("endDate")
	serverName := r.URL.Query().Get("server")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 20
	offset := 0

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

	results, err := fetchFilteredResults(ctx, startDate, endDate, serverName, limit, offset)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve results: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(results); err != nil {
		http.Error(w, "Failed to encode results to JSON", http.StatusInternalServerError)
	}
}

func storeResult(ctx context.Context, result models.SpeedTestResult, rawResult string) error {
	errCount := 0
	errCountMax := 10
	var err error

	// Get the librespeed provider ID
	var providerID string
	err = database.DB.QueryRow(ctx, "SELECT id FROM providers WHERE name = 'librespeed'").Scan(&providerID)
	if err != nil {
		return fmt.Errorf("failed to get librespeed provider ID: %w", err)
	}

	for errCount < errCountMax {
		_, err = database.DB.Exec(ctx, `
        INSERT INTO speedtest_results (
            raw_result, timestamp, server_name, server_url, 
            client_ip, client_hostname, client_city, client_region, client_country, client_loc, client_org, client_postal, client_timezone,
            bytes_sent, bytes_received, ping, jitter, upload, download, share,
            provider_id, provider_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
			rawResult, result.Timestamp, result.Server.Name, result.Server.URL,
			result.Client.IP, result.Client.Hostname, result.Client.City, result.Client.Region, result.Client.Country, result.Client.Loc, result.Client.Org, result.Client.Postal, result.Client.Timezone,
			result.BytesSent, result.BytesReceived, result.Ping, result.Jitter, result.Upload, result.Download, result.Share,
			providerID, "librespeed",
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

func RunSpeedTest(ctx context.Context) {
	cmd := exec.CommandContext(ctx, "librespeed-cli", "--json")
	output, err := cmd.Output()
	if err != nil {
		if ctx.Err() == context.Canceled {
			log.Printf("Speed test was canceled: context deadline exceeded or request canceled")
			return
		}
		if exitErr, ok := err.(*exec.ExitError); ok {
			log.Printf("Speed test failed with stderr: %s", string(exitErr.Stderr))
		} else {
			log.Printf("Error running speedtest: %v", err)
		}
		return
	}

	var results []models.SpeedTestResult
	if err := json.Unmarshal(output, &results); err != nil {
		log.Printf("Error parsing JSON: %v\nOutput: %s", err, string(output))
		return
	}

	for _, result := range results {
		if ctx.Err() != nil {
			log.Printf("Context canceled while storing results")
			return
		}
		if err := storeResult(ctx, result, string(output)); err != nil {
			log.Printf("Error storing result: %v", err)
		}
	}
}

func fetchFilteredResults(ctx context.Context, startDate, endDate string, serverName string, limit, offset int) ([]models.SpeedTestResult, error) {
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
            ping, jitter, upload, download, share,
            provider_id, provider_name
        FROM speedtest_results
        WHERE ($1::timestamptz IS NULL OR timestamp >= $1)
        AND ($2::timestamptz IS NULL OR timestamp <= $2)
        AND ($3 = '' OR server_name = $3)
        ORDER BY timestamp DESC
        LIMIT $4 OFFSET $5
    `

	rows, err := database.DB.Query(ctx, query, startDate, endDate, serverName, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch results: %w", err)
	}
	defer rows.Close()

	var results []models.SpeedTestResult
	for rows.Next() {
		var result models.SpeedTestResult
		var timestamp time.Time

		if err := rows.Scan(
			&timestamp, &result.Server.Name, &result.Server.URL, &result.Client.IP, &result.Client.Hostname,
			&result.Client.City, &result.Client.Region, &result.Client.Country, &result.Client.Loc, &result.Client.Org,
			&result.Client.Postal, &result.Client.Timezone, &result.BytesSent, &result.BytesReceived,
			&result.Ping, &result.Jitter, &result.Upload, &result.Download, &result.Share,
			&result.ProviderID, &result.ProviderName,
		); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		result.Timestamp = timestamp.Format(time.RFC3339)
		results = append(results, result)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading rows: %w", err)
	}

	return results, nil
}

func startSpeedTest(w http.ResponseWriter, r *http.Request) {
	go RunSpeedTest(context.Background())

	w.Header().Set("Content-Type", "application/json")
	response := models.DefaultJsonResponse{
		Data:  "{}",
		Error: "{}",
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response to JSON", http.StatusInternalServerError)
	}
}
