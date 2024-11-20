package main

import "net/http"

func setupRoutes() {
	http.HandleFunc("/api/speedtest", getSpeedtests)
	http.HandleFunc("/api/server-names", getServerNamesHandler)
	http.HandleFunc("/api/settings", handleSettings)
}
