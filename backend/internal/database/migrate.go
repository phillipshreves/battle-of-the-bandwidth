package database

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
)

type migration struct {
	version int
	name    string
	content string
}

var (
	ErrNoMigrationsDir   = errors.New("migrations directory not found")
	ErrInvalidMigration  = errors.New("invalid migration file")
	ErrMigrationFailed   = errors.New("migration failed")
	migrationFilePattern = regexp.MustCompile(`^(\d+).*\.sql$`)
)

//go:embed migrations
var migrationsDir embed.FS

func getCurrentVersion(ctx context.Context) (int, error) {
	var version int
	err := DB.QueryRow(ctx, "SELECT version FROM database_metadata").Scan(&version)
	if err != nil {
		return 0, fmt.Errorf("failed to get database version: %w", err)
	}
	return version, nil
}

func loadMigrations() ([]migration, error) {
	entries, err := fs.ReadDir(migrationsDir, "migrations")
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrNoMigrationsDir
		}
		return nil, fmt.Errorf("failed to read migrations directory: %w", err)
	}

	var migrations []migration
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		matches := migrationFilePattern.FindStringSubmatch(entry.Name())
		if matches == nil {
			continue
		}

		name := entry.Name()

		version, err := strconv.Atoi(matches[1])
		if err != nil {
			return nil, fmt.Errorf("%w: invalid version number in %s", ErrInvalidMigration, name)
		}

		content, err := fs.ReadFile(migrationsDir, filepath.Join("migrations", name))
		if err != nil {
			return nil, fmt.Errorf("%v: unable to read file ", name)
		}

		migrations = append(migrations, migration{
			version: version,
			name:    name,
			content: string(content),
		})
	}

	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].version < migrations[j].version
	})

	return migrations, nil
}

func validateMigrations(migrations []migration) error {
	if len(migrations) == 0 {
		return nil
	}

	seen := make(map[int]string)
	for _, m := range migrations {
		if existing, exists := seen[m.version]; exists {
			return fmt.Errorf("%w: duplicate version %d in files %s and %s",
				ErrInvalidMigration, m.version, existing, m.name)
		}
		seen[m.version] = m.name

		if m.version <= 0 {
			return fmt.Errorf("%w: non-positive version number in %s",
				ErrInvalidMigration, m.name)
		}
	}

	for i := 1; i <= len(migrations); i++ {
		if _, exists := seen[i]; !exists {
			return fmt.Errorf("%w: missing version %d in sequence",
				ErrInvalidMigration, i)
		}
	}

	return nil
}

func executeMigration(ctx context.Context, m migration) error {
	tx, err := DB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx, m.content); err != nil {
		return fmt.Errorf("%w: %v", ErrMigrationFailed, err)
	}

	if _, err = tx.Exec(ctx, `
		UPDATE database_metadata 
		SET version = $1
	`, m.version+1); err != nil {
		return fmt.Errorf("failed to update database version: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func MigrateDB() error {
	ctx := context.Background()

	currentVersion, err := getCurrentVersion(ctx)
	if err != nil {
		return err
	}
	fmt.Println("Current schema version:", currentVersion)

	migrations, err := loadMigrations()
	if err != nil {
		return err
	}

	if err := validateMigrations(migrations); err != nil {
		return err
	}

	migrationApplied := false
	for _, m := range migrations {
		if m.version < currentVersion {
			continue
		}

		if err := executeMigration(ctx, m); err != nil {
			return fmt.Errorf("migration %d failed: %w", m.version, err)
		}

		fmt.Printf("Successfully applied migration %s (version %d)\n", m.name, m.version)
		migrationApplied = true
	}

	if migrationApplied {
		newVersion, _ := getCurrentVersion(ctx)
		fmt.Println("New schema version:", newVersion)
	}

	return nil
}
