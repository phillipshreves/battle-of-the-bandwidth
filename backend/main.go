package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
)

type SpeedTestResult struct {
	Timestamp string `json:"timestamp"`
	Server    struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	} `json:"server"`
	Client struct {
		IP       string `json:"ip"`
		Hostname string `json:"hostname"`
		City     string `json:"city"`
		Region   string `json:"region"`
		Country  string `json:"country"`
		Loc      string `json:"loc"`
		Org      string `json:"org"`
		Postal   string `json:"postal"`
		Timezone string `json:"timezone"`
	} `json:"client"`
	BytesSent     int64   `json:"bytes_sent"`
	BytesReceived int64   `json:"bytes_received"`
	Ping          float64 `json:"ping"`
	Jitter        float64 `json:"jitter"`
	Upload        float64 `json:"upload"`
	Download      float64 `json:"download"`
	Share         string  `json:"share"`
}

var db *pgx.Conn
var latestResult SpeedTestResult

// Initialize and connect to the database with retry logic.
func initDB() error {
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s", dbUser, dbPassword, dbHost, dbPort, dbName)

	var err error
	for retries := 5; retries > 0; retries-- {
		db, err = pgx.Connect(context.Background(), connStr)
		if err == nil {
			// Successfully connected
			if pingErr := db.Ping(context.Background()); pingErr == nil {
				log.Println("Connected to the database.")
				return nil
			} else {
				err = fmt.Errorf("failed to ping database: %w", pingErr)
			}
		}

		log.Printf("Database connection failed: %v. Retrying in 5 seconds...", err)
		time.Sleep(5 * time.Second)
	}

	return fmt.Errorf("could not connect to database after retries: %w", err)
}

// Gracefully close the database connection.
func closeDB() {
	if db != nil {
		if err := db.Close(context.Background()); err != nil {
			log.Printf("Error closing database connection: %v", err)
		}
	}
}

// Store speed test result in the database with enhanced error handling.
func storeResult(result SpeedTestResult) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := db.Exec(ctx, `
        INSERT INTO speedtest_results (
            timestamp, server_name, server_url, 
            client_ip, client_hostname, client_city, client_region, client_country, client_loc, client_org, client_postal, client_timezone,
            bytes_sent, bytes_received, ping, jitter, upload, download, share
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
		result.Timestamp, result.Server.Name, result.Server.URL,
		result.Client.IP, result.Client.Hostname, result.Client.City, result.Client.Region, result.Client.Country, result.Client.Loc, result.Client.Org, result.Client.Postal, result.Client.Timezone,
		result.BytesSent, result.BytesReceived, result.Ping, result.Jitter, result.Upload, result.Download, result.Share,
	)
	if err != nil {
		return fmt.Errorf("failed to store speed test result: %w", err)
	}

	log.Printf("Successfully stored result for %s", result.Timestamp)
	return nil
}

// Run a speed test and handle errors gracefully.
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
		startDate = "1950-01-01T00:00:00.000-00"
	}
	if endDate == "" {
		endDate = "2500-01-01T00:00:00.000-00"
	}
	//query := `
	//    SELECT
	//        timestamp, server_name, server_url, client_ip, client_hostname,
	//        client_city, client_region, client_country, client_loc, client_org,
	//        client_postal, client_timezone, bytes_sent, bytes_received,
	//        ping, jitter, upload, download, share
	//    FROM speedtest_results
	//    WHERE ($1::timestamptz IS NULL OR timestamp >= $1)
	//    AND ($2::timestamptz IS NULL OR timestamp <= $2)
	//    AND ($3::text IS NULL OR server_name = $3)
	//    LIMIT $4 OFFSET $5
	//`
	query := `
        SELECT 
            timestamp, server_name, server_url, client_ip, client_hostname,
            client_city, client_region, client_country, client_loc, client_org,
            client_postal, client_timezone, bytes_sent, bytes_received, 
            ping, jitter, upload, download, share
        FROM speedtest_results
        WHERE ($1::timestamptz IS NULL OR timestamp >= $1)
        AND ($2::timestamptz IS NULL OR timestamp <= $2)
        LIMIT $3 OFFSET $4
    `

	//rows, err := db.Query(context.Background(), query, startDate, endDate, serverName, limit, offset)
	rows, err := db.Query(context.Background(), query, startDate, endDate, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch results: %w", err)
	}
	defer rows.Close()

	var results []SpeedTestResult = make([]SpeedTestResult, 0)
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

func apiHandler(w http.ResponseWriter, r *http.Request) {
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
		if l, err := strconv.Atoi(limitStr); err == nil {
			if l > 0 {
				limit = l
			}
		}
	}
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil {
			if o >= 0 {
				offset = o
			}
		}
	}

	log.Println("limit: ", limit, "limitStr: ", limitStr)

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

// Main function with graceful shutdown and error handling.
func main() {
	if err := initDB(); err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}
	defer closeDB()

	// Run speed test every hour with error handling.
	go func() {
		for {
			runSpeedTest()
			//time.Sleep(time.Hour)
			time.Sleep(time.Minute)
		}
	}()

	// Set up API endpoint.
	http.HandleFunc("/api/bandwidth", apiHandler)
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("HTTP server failed: %v", err)
	}
}
