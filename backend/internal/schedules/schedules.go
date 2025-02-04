package schedules

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/database"
	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/models"
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

	w.WriteHeader(http.StatusNoContent)
}
