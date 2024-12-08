package routes

import (
        "net/http"

        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/servers"
        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/settings"
        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/speedtest"
)

func SetupRoutes() {
        http.HandleFunc("/api/speedtest", speedtest.SpeedTestHandler)
        http.HandleFunc("/api/server-names", servers.ServerNamesHandler)
        http.HandleFunc("/api/settings", settings.SettingsHandler)
}
