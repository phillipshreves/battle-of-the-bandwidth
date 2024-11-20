package main

import (
	"log"
	"net/http"
)

func main() {
	setupRoutes() // Set up the routes
	log.Println("Starting server on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
