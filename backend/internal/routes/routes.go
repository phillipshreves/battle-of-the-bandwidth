package routes

import (
	"net/http"

	"github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/handlers"
)

func SetupRoutes() {
	http.HandleFunc("/api/speedtest", handlers.SpeedTestHandler)
	http.HandleFunc("/api/server-names", handlers.ServerNamesHandler)
	http.HandleFunc("/api/settings", handlers.SettingsHandler)
}
