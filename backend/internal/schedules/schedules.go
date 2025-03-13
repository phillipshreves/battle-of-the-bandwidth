package schedules

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/database"
	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/models"
	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/speedtest"
	"github.com/robfig/cron/v3"
)

// Global cron scheduler instance with mutex for thread safety
var (
	cronScheduler *cron.Cron
	cronMutex     sync.Mutex
)

func SchedulesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		if r.PathValue("id") != "" {
			getSchedule(w, r)
		} else {
			listSchedules(w, r)
		}
	case http.MethodPost:
		createSchedule(w, r)
	case http.MethodPatch:
		updateSchedule(w, r)
	case http.MethodDelete:
		deleteSchedule(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func listSchedules(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := database.DB.Query(ctx, `
		SELECT s.id, s.name, s.cron_expression, s.provider_id, s.provider_name, 
		       s.is_active, s.created_at, s.updated_at 
		FROM schedules s 
		ORDER BY s.created_at DESC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var schedules []models.Schedule
	for rows.Next() {
		var s models.Schedule
		var providerID sql.NullString
		var providerName sql.NullString
		err := rows.Scan(&s.ID, &s.Name, &s.CronExpression, &providerID, &providerName,
			&s.IsActive, &s.CreatedAt, &s.UpdatedAt)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if providerID.Valid {
			s.ProviderID = providerID.String
		}
		if providerName.Valid {
			s.ProviderName = providerName.String
		}
		schedules = append(schedules, s)
	}

	json.NewEncoder(w).Encode(schedules)
}

func getSchedule(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	var s models.Schedule
	var providerID sql.NullString
	var providerName sql.NullString
	err := database.DB.QueryRow(ctx, `
		SELECT s.id, s.name, s.cron_expression, s.provider_id, s.provider_name, 
		       s.is_active, s.created_at, s.updated_at 
		FROM schedules s 
		WHERE s.id = $1
	`, id).Scan(&s.ID, &s.Name, &s.CronExpression, &providerID, &providerName,
		&s.IsActive, &s.CreatedAt, &s.UpdatedAt)

	if err == sql.ErrNoRows {
		http.Error(w, "Schedule not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if providerID.Valid {
		s.ProviderID = providerID.String
	}
	if providerName.Valid {
		s.ProviderName = providerName.String
	}

	json.NewEncoder(w).Encode(s)
}

func createSchedule(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var s models.Schedule
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err := database.DB.QueryRow(ctx, `
		INSERT INTO schedules (name, cron_expression, provider_id, provider_name, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`, s.Name, s.CronExpression, s.ProviderID, s.ProviderName, s.IsActive).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Restart cron jobs after creating a new schedule
	go RestartCronJobs()

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(s)
}

func updateSchedule(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var s models.Schedule
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	result, err := database.DB.Exec(ctx, `
		UPDATE schedules 
		SET name = $1, cron_expression = $2, provider_id = $3, provider_name = $4, is_active = $5, 
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $6
	`, s.Name, s.CronExpression, s.ProviderID, s.ProviderName, s.IsActive, id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Schedule not found", http.StatusNotFound)
		return
	}

	// Restart cron jobs after updating a schedule
	go RestartCronJobs()

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(s)
}

func deleteSchedule(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	result, err := database.DB.Exec(ctx, "DELETE FROM schedules WHERE id = $1", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Schedule not found", http.StatusNotFound)
		return
	}

	// Restart cron jobs after deleting a schedule
	go RestartCronJobs()

	w.WriteHeader(http.StatusNoContent)
}

// RestartCronJobs stops the current cron scheduler and starts a new one with updated schedules
func RestartCronJobs() {
	cronMutex.Lock()
	defer cronMutex.Unlock()

	// Stop the existing cron scheduler if it exists
	if cronScheduler != nil {
		fmt.Println("Stopping existing cron scheduler")
		cronScheduler.Stop()
	}

	// Start a new cron scheduler
	LoadCronJobsInternal()
}

// LoadCronJobs initializes the cron scheduler
func LoadCronJobs() {
	cronMutex.Lock()
	defer cronMutex.Unlock()

	LoadCronJobsInternal()
}

// LoadCronJobsInternal is the internal implementation of LoadCronJobs
// It assumes the caller has acquired the cronMutex
func LoadCronJobsInternal() {
	cronScheduler = cron.New()

	// Get all active schedules from the database
	ctx := context.Background()
	rows, err := database.DB.Query(ctx, `
		SELECT id, name, cron_expression, provider_id, provider_name
		FROM schedules
		WHERE is_active = true
	`)
	if err != nil {
		fmt.Printf("Error loading schedules: %v\n", err)
		return
	}
	defer rows.Close()

	// Set up a cron job for each schedule
	for rows.Next() {
		var schedule models.Schedule
		var providerID sql.NullString
		var providerName sql.NullString

		err := rows.Scan(&schedule.ID, &schedule.Name, &schedule.CronExpression, &providerID, &providerName)
		if err != nil {
			fmt.Printf("Error scanning schedule: %v\n", err)
			continue
		}

		if providerID.Valid {
			schedule.ProviderID = providerID.String
		}
		if providerName.Valid {
			schedule.ProviderName = providerName.String
		}

		// Create a closure to capture the schedule variables
		func(s models.Schedule) {
			_, err := cronScheduler.AddFunc(s.CronExpression, func() {
				fmt.Printf("Running scheduled speed test: %s\n", s.Name)

				// Create a slice of providers to test
				var providers []string
				if s.ProviderName != "" {
					providers = []string{s.ProviderName}
				}

				// Run the speed test
				ctx := context.Background()
				go func() {
					fmt.Printf("Starting speed test for schedule %s with provider %s\n", s.Name, s.ProviderName)
					speedtest.RunSpeedTests(ctx, providers)
				}()
			})

			if err != nil {
				fmt.Printf("Error adding cron job for schedule %s: %v\n", s.Name, err)
			} else {
				fmt.Printf("Added cron job for schedule: %s with expression: %s\n", s.Name, s.CronExpression)
			}
		}(schedule)
	}

	if err := rows.Err(); err != nil {
		fmt.Printf("Error iterating schedules: %v\n", err)
	}

	// Start the cron scheduler
	cronScheduler.Start()
	fmt.Println("Cron scheduler started")
}
