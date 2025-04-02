package speedtest

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
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
	serverNames := r.URL.Query()["server"] // Get all server values as an array
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")
	providers := r.URL.Query()["providers"] // Get all providers values

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

	results, err := fetchFilteredResults(ctx, startDate, endDate, serverNames, providers, limit, offset)
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
			result.ProviderID, result.ProviderName,
		)

		if err == nil {
			log.Printf("Successfully stored result for %s using provider %s", result.Timestamp, result.ProviderName)
			return nil
		}

		log.Printf("Failed to store speed test result: %v", err)
		time.Sleep(time.Second)
		errCount++
	}
	return fmt.Errorf("failed to store speed test result: %w", err)
}

func RunSpeedTests(ctx context.Context, providers []string) {
	// If no providers specified, use librespeed as default
	if len(providers) == 0 {
		providers = []string{"librespeed"}
	}

	for _, providerName := range providers {
		// Skip if context is canceled
		if ctx.Err() != nil {
			log.Printf("Context canceled, stopping speed tests")
			return
		}

		// Get provider ID from database
		var providerID string
		err := database.DB.QueryRow(ctx, "SELECT id FROM providers WHERE name = $1", providerName).Scan(&providerID)
		if err != nil {
			log.Printf("Provider '%s' not found in database: %v", providerName, err)
			continue
		}

		log.Printf("Running speed test with provider: %s", providerName)

		// Currently only librespeed is supported
		if providerName == "librespeed" {
			runLibrespeedTest(ctx, providerID, providerName)
		} else if providerName == "cloudflare" {
			runCloudflareTest(ctx, providerID, providerName)
		} else {
			log.Printf("Provider '%s' is not currently supported for testing", providerName)
		}
	}
}

func runLibrespeedTest(ctx context.Context, providerID, providerName string) {
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

		// Set the provider information
		result.ProviderID = providerID
		result.ProviderName = providerName

		if err := storeResult(ctx, result, string(output)); err != nil {
			log.Printf("Error storing result: %v", err)
		}
	}
}

func runCloudflareTest(ctx context.Context, providerID, providerName string) {
	// Get the Node.js backend URL from environment or use default
	nodeBackendURL := os.Getenv("NODE_BACKEND_URL")
	if nodeBackendURL == "" {
		nodeBackendURL = "http://localhost:3000"
	}

	// Create HTTP request to the Node.js backend
	req, err := http.NewRequestWithContext(ctx, "POST", nodeBackendURL+"/cloudflare/speed-test", nil)
	if err != nil {
		log.Printf("Error creating request to Node.js backend: %v", err)
		return
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")

	// Create HTTP client and send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request to Node.js backend: %v", err)
		return
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response from Node.js backend: %v", err)
		return
	}

	// Check if response is successful
	if !(resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated) {
		log.Printf("Node.js backend returned non-OK status: %d, body: %s", resp.StatusCode, string(body))
		return
	}

	// Parse response
	var cloudflareResult struct {
		Status   string  `json:"status"`
		Download float64 `json:"download"`
		Upload   float64 `json:"upload"`
		Latency  float64 `json:"latency"`
	}
	if err := json.Unmarshal(body, &cloudflareResult); err != nil {
		log.Printf("Error parsing Cloudflare result: %v", err)
		return
	}

	// Check if test is still running
	if cloudflareResult.Status == "running" {
		log.Printf("Cloudflare speed test is already running")
		return
	}

	// Create a SpeedTestResult from the Cloudflare result
	timestamp := time.Now().Format(time.RFC3339)
	result := models.SpeedTestResult{
		Timestamp: timestamp,
		Server: struct {
			Name string `json:"name"`
			URL  string `json:"url"`
		}{
			Name: "Cloudflare",
			URL:  "https://speed.cloudflare.com",
		},
		Client: struct {
			IP       string `json:"ip"`
			Hostname string `json:"hostname"`
			City     string `json:"city"`
			Region   string `json:"region"`
			Country  string `json:"country"`
			Loc      string `json:"loc"`
			Org      string `json:"org"`
			Postal   string `json:"postal"`
			Timezone string `json:"timezone"`
		}{
			// Client info is not provided by Cloudflare speed test
			// These fields will be empty
		},
		BytesSent:     0, // Not provided by Cloudflare
		BytesReceived: 0, // Not provided by Cloudflare
		Ping:          cloudflareResult.Latency,
		Jitter:        0, // Not provided by Cloudflare
		Upload:        cloudflareResult.Upload,
		Download:      cloudflareResult.Download,
		Share:         "",
		ProviderID:    providerID,
		ProviderName:  providerName,
	}

	// Store the result
	rawResult, _ := json.Marshal(cloudflareResult)
	if err := storeResult(ctx, result, string(rawResult)); err != nil {
		log.Printf("Error storing Cloudflare result: %v", err)
	}
}

func fetchFilteredResults(ctx context.Context, startDate, endDate string, serverNames []string, providers []string, limit, offset int) ([]models.SpeedTestResult, error) {
	if startDate == "" {
		startDate = "1900-01-01T00:00:00.000-00"
	}
	if endDate == "" {
		endDate = "2500-01-01T00:00:00.000-00"
	}

	// Base query
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
    `

	args := []interface{}{startDate, endDate}
	paramIndex := 3

	// Add server names filter if specified
	if len(serverNames) > 0 {
		placeholders := make([]string, len(serverNames))
		for i := range serverNames {
			placeholders[i] = fmt.Sprintf("$%d", paramIndex)
			args = append(args, serverNames[i])
			paramIndex++
		}
		query += fmt.Sprintf(" AND (server_name IN (%s))", strings.Join(placeholders, ", "))
	}

	// Add provider filter if providers are specified
	if len(providers) > 0 {
		placeholders := make([]string, len(providers))
		for i := range providers {
			placeholders[i] = fmt.Sprintf("$%d", paramIndex)
			args = append(args, providers[i])
			paramIndex++
		}
		query += fmt.Sprintf(" AND (provider_id IN (%s))", strings.Join(placeholders, ", "))
	}

	// Add ordering, limit and offset
	query += " ORDER BY timestamp DESC LIMIT $" + strconv.Itoa(paramIndex) + " OFFSET $" + strconv.Itoa(paramIndex+1)
	args = append(args, limit, offset)

	rows, err := database.DB.Query(ctx, query, args...)
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
	var requestData struct {
		Providers []string `json:"providers"`
	}

	// Default to librespeed if no providers specified
	requestData.Providers = []string{"librespeed"}

	// Parse request body if it exists
	if r.Body != nil {
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&requestData); err != nil {
			// If there's an error parsing, just use the default provider
			log.Printf("Error parsing request body: %v", err)
		}
	}

	go RunSpeedTests(context.Background(), requestData.Providers)

	w.Header().Set("Content-Type", "application/json")
	response := models.DefaultJsonResponse{
		Data:  "{}",
		Error: "{}",
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response to JSON", http.StatusInternalServerError)
	}
}
