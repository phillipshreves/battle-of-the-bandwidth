package main

import (
	"context"
	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/speedtest"
	"log"
	"net/http"
	"time"

	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/database"
	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/routes"
)

func main() {
	if err := database.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	if err := database.MigrateDB(); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}
	defer database.CloseDB() // Ensure the database connection is closed on exit

	routes.SetupRoutes() // Set up the routes
	log.Println("Starting server on :8080")

	go func() {
		var frequency int32
		// Fetch the current speed test frequency from the database
		query := `SELECT speedtest_frequency FROM user_settings LIMIT 1`
		for {
			speedtest.RunSpeedTest(context.Background())
			row := database.DB.QueryRow(context.Background(), query)
			if err := row.Scan(&frequency); err != nil {
				log.Printf("Failed to retrieve speed test frequency: %v", err)
				// Default to 1 day if there's an error
				frequency = 1440
			}
			log.Printf("Waiting for %d minutes before the next speed test...", frequency)
			time.Sleep(time.Duration(frequency) * time.Minute) // Wait for the specified frequency before the next test
		}
	}()

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
