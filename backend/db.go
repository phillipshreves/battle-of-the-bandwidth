package main

import (
        "context"
        "fmt"
        "log"
        "os"
        "time"

        "github.com/jackc/pgx/v5/pgxpool"
)

var db *pgxpool.Pool

func initDB() error {
        dbHost := os.Getenv("DB_HOST")
        dbPort := os.Getenv("DB_PORT")
        dbUser := os.Getenv("DB_USER")
        dbPassword := os.Getenv("DB_PASSWORD")
        dbName := os.Getenv("DB_NAME")

        connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?pool_max_conns=10", 
                dbUser, dbPassword, dbHost, dbPort, dbName)

        var err error
        for retries := 5; retries > 0; retries-- {
                config, err := pgxpool.ParseConfig(connStr)
                if err != nil {
                        return fmt.Errorf("unable to parse connection string: %w", err)
                }

                // Set reasonable timeouts
                config.MaxConnLifetime = time.Hour
                config.MaxConnIdleTime = 30 * time.Minute
                config.HealthCheckPeriod = 1 * time.Minute

                db, err = pgxpool.NewWithConfig(context.Background(), config)
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
                db.Close()
        }
}