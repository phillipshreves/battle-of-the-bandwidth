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

	if err := database.VerifyMetadata(); err != nil {
		log.Fatalf("Failed to verify database metadata: %v", err)
	}

	if err := database.MigrateDB(); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}
	defer database.CloseDB()

	routes.SetupRoutes()

	schedules.LoadCronJobs()

	log.Println("Starting server on :8080")

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
