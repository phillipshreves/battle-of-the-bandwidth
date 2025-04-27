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
					 s.is_active, s.created_at, s.updated_at, s.host_endpoint, s.host_port
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
		var hostEndpoint sql.NullString
		var hostPort sql.NullString
		err := rows.Scan(&s.ID, &s.Name, &s.CronExpression, &providerID, &providerName,
			&s.IsActive, &s.CreatedAt, &s.UpdatedAt, &hostEndpoint, &hostPort)
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
		if hostEndpoint.Valid {
			s.HostEndpoint = hostEndpoint.String
		}
		if hostPort.Valid {
			s.HostPort = hostPort.String
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
	var hostEndpoint sql.NullString
	var hostPort sql.NullString
	err := database.DB.QueryRow(ctx, `
		SELECT s.id, s.name, s.cron_expression, s.provider_id, s.provider_name, 
		       s.is_active, s.created_at, s.updated_at, s.host_endpoint, s.host_port
		FROM schedules s 
		WHERE s.id = $1
	`, id).Scan(&s.ID, &s.Name, &s.CronExpression, &providerID, &providerName,
		&s.IsActive, &s.CreatedAt, &s.UpdatedAt, &hostEndpoint, &hostPort)

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
	if hostEndpoint.Valid {
		s.HostEndpoint = hostEndpoint.String
	}
	if hostPort.Valid {
		s.HostPort = hostPort.String
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
		INSERT INTO schedules (name, cron_expression, provider_id, provider_name, is_active, host_endpoint, host_port)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`, s.Name, s.CronExpression, s.ProviderID, s.ProviderName, s.IsActive, s.HostEndpoint, s.HostPort).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Restart cron jobs after creation to load the new schedule into the cron scheduler
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
		SET name = $1, cron_expression = $2, provider_id = $3, provider_name = $4, is_active = $5, host_endpoint = $6, host_port = $7,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $8
	`, s.Name, s.CronExpression, s.ProviderID, s.ProviderName, s.IsActive, s.HostEndpoint, s.HostPort, id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Schedule not found", http.StatusNotFound)
		return
	}

	// Restart cron jobs after updating to load the new schedule into the cron scheduler
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

	// Restart cron jobs after deletion to remove the schedule from the cron scheduler
	go RestartCronJobs()

	w.WriteHeader(http.StatusNoContent)
}

func RestartCronJobs() {
	cronMutex.Lock()
	defer cronMutex.Unlock()

	if cronScheduler != nil {
		cronScheduler.Stop()
	}

	loadCronJobsInternal()
}

func LoadCronJobs() {
	cronMutex.Lock()
	defer cronMutex.Unlock()

	loadCronJobsInternal()
}

// loadCronJobsInternal is the internal implementation of LoadCronJobs
// It assumes the caller has acquired the cronMutex
func loadCronJobsInternal() {
	cronScheduler = cron.New()

	ctx := context.Background()
	rows, err := database.DB.Query(ctx, `
		SELECT id, name, cron_expression, provider_id, provider_name, host_endpoint, host_port
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
		var hostEndpoint sql.NullString
		var hostPort sql.NullString
		err := rows.Scan(&schedule.ID, &schedule.Name, &schedule.CronExpression, &providerID, &providerName, &hostEndpoint, &hostPort)
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
		if hostEndpoint.Valid {
			schedule.HostEndpoint = hostEndpoint.String
		}
		if hostPort.Valid {
			schedule.HostPort = hostPort.String
		}

		// Create a closure to capture the schedule variables
		func(s models.Schedule) {
			_, err := cronScheduler.AddFunc(s.CronExpression, func() {

				var providers []string
				if s.ProviderName != "" {
					providers = []string{s.ProviderName}
				}

				ctx := context.Background()
				go func() {
					fmt.Printf("Starting speed test for schedule %s with provider %s\n", s.Name, s.ProviderName)
					speedtest.RunSpeedTests(ctx, models.SpeedTestRequest{
						Providers:    providers,
						HostEndpoint: s.HostEndpoint,
						HostPort:     s.HostPort,
					})
				}()
			})

			if err != nil {
				fmt.Printf("Error adding cron job for schedule %s: %v\n", s.Name, err)
			}
		}(schedule)
	}

	if err := rows.Err(); err != nil {
		fmt.Printf("Error iterating schedules: %v\n", err)
	}

	cronScheduler.Start()
	fmt.Println("Cron scheduler started")
}
