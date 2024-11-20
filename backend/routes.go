package main

import "net/http"

func setupRoutes() {
	http.HandleFunc("/api/speedtest", apiHandler)
	http.HandleFunc("/api/server-names", getServerNamesHandler)
	http.HandleFunc("/api/settings", handleSettings)
}
