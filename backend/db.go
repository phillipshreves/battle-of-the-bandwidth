package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
)

var db *pgx.Conn

func initDB() error {
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s", dbUser, dbPassword, dbHost, dbPort, dbName)

	var err error
	for retries := 5; retries > 0; retries-- {
		db, err = pgx.Connect(context.Background(), connStr)
		if err == nil {
			if pingErr := db.Ping(context.Background()); pingErr == nil {
				log.Println("Connected to the database.")
				return nil
			} else {
				err = fmt.Errorf("failed to ping database: %w", pingErr)
			}
		}
		log.Printf("Database connection failed: %v. Retrying in 5 seconds...", err)
		time.Sleep(5 * time.Second)
	}
	return fmt.Errorf("could not connect to database after retries: %w", err)
}

func closeDB() {
	if db != nil {
		if err := db.Close(context.Background()); err != nil {
			log.Printf("Error closing database connection: %v", err)
		}
	}
}

// Add other database-related functions here, such as fetchFilteredResults, storeResult, etc.
