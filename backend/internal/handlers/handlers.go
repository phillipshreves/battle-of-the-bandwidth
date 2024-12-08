package handlers

import (
        "encoding/json"
        "fmt"
        "log"
        "net/http"

        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/database"
        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/models"
        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/servers"
        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/settings"
        "github.com/phillipshreves/battle-of-the-bandwidth/backend/internal/speedtest"
)

type DefaultJsonResponse struct {
        Data  string `json:"data"`
        Error string `json:"error"`
}

func SpeedTestHandler(w http.ResponseWriter, r *http.Request) {
        speedtest.SpeedTestHandler(w, r)
}

func ServerNamesHandler(w http.ResponseWriter, r *http.Request) {
        servers.ServerNamesHandler(w, r)
}

func SettingsHandler(w http.ResponseWriter, r *http.Request) {
        settings.SettingsHandler(w, r)
}