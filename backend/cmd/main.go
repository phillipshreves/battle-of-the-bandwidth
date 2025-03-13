package main

import (
	"log"
	"net/http"

	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/database"
	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/routes"
	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/schedules"
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

	// Load and start cron jobs for scheduled speed tests
	schedules.LoadCronJobs()

	log.Println("Starting server on :8080")

	// loadCronCommand := exec.Command("crontab", "/etc/cron.d/schedules")
	// err := loadCronCommand.Start()
	// if err != nil {
	// 	fmt.Print("Error:", err)
	// 	return
	// }
	// startCronCommand := exec.Command("cron", "-f", "&")
	// err = startCronCommand.Start()
	// if err != nil {
	// 	fmt.Print("Error:", err)
	// 	return
	// }

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
