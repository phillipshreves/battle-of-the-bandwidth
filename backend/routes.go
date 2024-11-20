package main

import "net/http"

func setupRoutes() {
	http.HandleFunc("/api/speedtest", speedTestHandler)
	http.HandleFunc("/api/server-names", getServerNamesHandler)
	http.HandleFunc("/api/settings", handleSettings)
}
