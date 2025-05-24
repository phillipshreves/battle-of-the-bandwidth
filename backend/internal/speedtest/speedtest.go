package speedtest

import (
	"context"
	"database/sql"
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
	serverNames := r.URL.Query()["server"]
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")
	providers := r.URL.Query()["providers"]

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

func pruneOldResults(ctx context.Context, scheduleID string) error {
	// Get the result limit for this schedule
	var resultLimit int
	err := database.DB.QueryRow(ctx, "SELECT result_limit FROM schedules WHERE id = $1", scheduleID).Scan(&resultLimit)
	if err != nil {
		return fmt.Errorf("failed to get result limit: %w", err)
	}

	// If result limit is 0, no pruning needed
	if resultLimit == 0 {
		return nil
	}

	// Delete excess results, keeping only the most recent ones up to the limit
	_, err = database.DB.Exec(ctx, `
		DELETE FROM speedtest_results
		WHERE schedule_id = $1
		AND id NOT IN (
			SELECT id
			FROM speedtest_results
			WHERE schedule_id = $1
			ORDER BY timestamp DESC
			LIMIT $2
		)`, scheduleID, resultLimit)

	if err != nil {
		return fmt.Errorf("failed to prune old results: %w", err)
	}

	return nil
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
            provider_id, provider_name, schedule_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
			rawResult, result.Timestamp, result.Server.Name, result.Server.URL,
			result.Client.IP, result.Client.Hostname, result.Client.City, result.Client.Region, result.Client.Country, result.Client.Loc, result.Client.Org, result.Client.Postal, result.Client.Timezone,
			result.BytesSent, result.BytesReceived, result.Ping, result.Jitter, result.Upload, result.Download, result.Share,
			result.ProviderID, result.ProviderName, result.ScheduleID,
		)

		if err == nil {
			log.Printf("Successfully stored result for %s using provider %s", result.Timestamp, result.ProviderName)

			// If this result is associated with a schedule, check and enforce the result limit
			if result.ScheduleID != "" {
				if err := pruneOldResults(ctx, result.ScheduleID); err != nil {
					log.Printf("Warning: Failed to prune old results: %v", err)
				}
			}

			return nil
		}

		log.Printf("Failed to store speed test result: %v", err)
		time.Sleep(time.Second)
		errCount++
	}
	return fmt.Errorf("failed to store speed test result: %w", err)
}

func RunSpeedTests(ctx context.Context, requestData models.SpeedTestRequest) {
	if len(requestData.Providers) == 0 {
		requestData.Providers = []string{"librespeed"}
	}

	for _, providerName := range requestData.Providers {
		if ctx.Err() != nil {
			log.Printf("Context canceled, stopping speed tests")
			return
		}

		var providerID string
		err := database.DB.QueryRow(ctx, "SELECT id FROM providers WHERE name = $1", providerName).Scan(&providerID)
		if err != nil {
			log.Printf("Provider '%s' not found in database: %v", providerName, err)
			continue
		}

		if providerName == "librespeed" {
			runLibrespeedTest(ctx, providerID, providerName, requestData.ScheduleID)
		} else if providerName == "cloudflare" {
			runCloudflareTest(ctx, providerID, providerName, requestData.ScheduleID)
		} else if providerName == "iperf3" {
			runIperf3Test(ctx, providerID, providerName, requestData.HostEndpoint, requestData.HostPort, requestData.ScheduleID)
		} else {
			log.Printf("Provider '%s' is not currently supported for testing", providerName)
		}
	}
}

func runLibrespeedTest(ctx context.Context, providerID, providerName, scheduleID string) {
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

		result.ProviderID = providerID
		result.ProviderName = providerName
		result.ScheduleID = scheduleID

		if err := storeResult(ctx, result, string(output)); err != nil {
			log.Printf("Error storing result: %v", err)
		}
	}
}

func runCloudflareTest(ctx context.Context, providerID, providerName, scheduleID string) {
	nodeBackendURL := os.Getenv("NODE_BACKEND_URL")
	if nodeBackendURL == "" {
		nodeBackendURL = "http://localhost:3000"
	}

	req, err := http.NewRequestWithContext(ctx, "POST", nodeBackendURL+"/cloudflare/speed-test", nil)
	if err != nil {
		log.Printf("Error creating request to Node.js backend: %v", err)
		return
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request to Node.js backend: %v", err)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response from Node.js backend: %v", err)
		return
	}

	if !(resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated) {
		log.Printf("Node.js backend returned non-OK status: %d, body: %s", resp.StatusCode, string(body))
		return
	}

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

	if cloudflareResult.Status == "running" {
		log.Printf("Cloudflare speed test is already running")
		return
	}

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
		BytesSent:     0,
		BytesReceived: 0,
		Ping:          cloudflareResult.Latency,
		Jitter:        0,
		Upload:        cloudflareResult.Upload,
		Download:      cloudflareResult.Download,
		Share:         "",
		ProviderID:    providerID,
		ProviderName:  providerName,
		ScheduleID:    scheduleID,
	}

	rawResult, _ := json.Marshal(cloudflareResult)
	if err := storeResult(ctx, result, string(rawResult)); err != nil {
		log.Printf("Error storing Cloudflare result: %v", err)
	}
}

func runIperf3Test(ctx context.Context, providerID, providerName, hostEndpoint, hostPort, scheduleID string) {
	timestamp := time.Now().Format(time.RFC3339)
	cmd := exec.CommandContext(ctx, "iperf3", "-c", hostEndpoint, "-p", hostPort, "--json")
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

	var iperf3Result models.Iperf3Result
	if err := json.Unmarshal(output, &iperf3Result); err != nil {
		log.Printf("Error parsing iperf3 JSON: %v\nOutput: %s", err, string(output))
		return
	}

	result := iperf3Result.ToSpeedTestResult(providerID, providerName)
	result.Timestamp = timestamp
	result.ScheduleID = scheduleID

	cmd = exec.CommandContext(ctx, "ping", "-c", "10", hostEndpoint)
	output, err = cmd.Output()
	if err != nil {
		log.Printf("Error pinging iperf.test.kdl.io: %v", err)
		return
	}

	pingOutput := string(output)

	// Parse the ping statistics to get the average ping time
	lines := strings.Split(pingOutput, "\n")
	for _, line := range lines {
		if strings.Contains(line, "round-trip") {
			// Extract average ping from the line like:
			// round-trip min/avg/max/stddev = 2.979/8.678/18.574/4.779 ms
			parts := strings.Split(line, " = ")
			if len(parts) == 2 {
				stats := strings.Split(parts[1], "/")
				if len(stats) >= 2 {
					pingFloat, err := strconv.ParseFloat(stats[1], 64)
					if err != nil {
						log.Printf("Error parsing ping average: %v", err)
					} else {
						result.Ping = pingFloat
					}
					break
				}
			}
		}
	}

	if err := storeResult(ctx, result, string(output)); err != nil {
		log.Printf("Error storing result: %v", err)
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
            provider_id, provider_name, schedule_id
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
		var scheduleID sql.NullString

		if err := rows.Scan(
			&timestamp, &result.Server.Name, &result.Server.URL, &result.Client.IP, &result.Client.Hostname,
			&result.Client.City, &result.Client.Region, &result.Client.Country, &result.Client.Loc, &result.Client.Org,
			&result.Client.Postal, &result.Client.Timezone, &result.BytesSent, &result.BytesReceived,
			&result.Ping, &result.Jitter, &result.Upload, &result.Download, &result.Share,
			&result.ProviderID, &result.ProviderName, &scheduleID,
		); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		result.Timestamp = timestamp.Format(time.RFC3339)
		if scheduleID.Valid {
			result.ScheduleID = scheduleID.String
		}
		results = append(results, result)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading rows: %w", err)
	}

	return results, nil
}

func startSpeedTest(w http.ResponseWriter, r *http.Request) {
	var requestData models.SpeedTestRequest

	if r.Body != nil {
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&requestData); err != nil {
			log.Printf("Error parsing request body: %v", err)
		}
	}

	go RunSpeedTests(context.Background(), requestData)

	w.Header().Set("Content-Type", "application/json")
	response := models.DefaultJsonResponse{
		Data:  "{}",
		Error: "{}",
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response to JSON", http.StatusInternalServerError)
	}
}
