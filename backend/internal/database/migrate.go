package database

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"time"
)

type migration struct {
	version int
	path    string
	name    string
}

var (
	ErrNoMigrationsDir    = errors.New("migrations directory not found")
	ErrInvalidMigration   = errors.New("invalid migration file")
	ErrMigrationFailed    = errors.New("migration failed")
	migrationFilePattern  = regexp.MustCompile(`^(\d+).*\.sql$`)
	createVersionTableSQL = `
		CREATE TABLE IF NOT EXISTS database_metadata (
			version INTEGER NOT NULL DEFAULT 0,
			last_migration_at TIMESTAMP WITH TIME ZONE,
			CONSTRAINT database_metadata_single_row CHECK (version >= 0)
		);
		INSERT INTO database_metadata (version)
		SELECT 0
		WHERE NOT EXISTS (SELECT 1 FROM database_metadata);
	`
)

func ensureVersionTable(ctx context.Context) error {
	_, err := DB.Exec(ctx, createVersionTableSQL)
	if err != nil {
		return fmt.Errorf("failed to create version table: %w", err)
	}
	return nil
}

func getCurrentVersion(ctx context.Context) (int, error) {
	var version int
	err := DB.QueryRow(ctx, "SELECT version FROM database_metadata").Scan(&version)
	if err != nil {
		return 0, fmt.Errorf("failed to get database version: %w", err)
	}
	return version, nil
}

func loadMigrations(migrationsPath string) ([]migration, error) {
	entries, err := os.ReadDir(migrationsPath)
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

		version, err := strconv.Atoi(matches[1])
		if err != nil {
			return nil, fmt.Errorf("%w: invalid version number in %s", ErrInvalidMigration, entry.Name())
		}

		migrations = append(migrations, migration{
			version: version,
			path:    filepath.Join(migrationsPath, entry.Name()),
			name:    entry.Name(),
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
	sqlContent, err := os.ReadFile(m.path)
	if err != nil {
		return fmt.Errorf("failed to read migration file %s: %w", m.name, err)
	}

	tx, err := DB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx, string(sqlContent)); err != nil {
		return fmt.Errorf("%w: %v", ErrMigrationFailed, err)
	}

	if _, err = tx.Exec(ctx, `
		UPDATE database_metadata 
		SET version = $1, last_migration_at = $2
	`, m.version, time.Now().UTC()); err != nil {
		return fmt.Errorf("failed to update database version: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func MigrateDB() error {
	ctx := context.Background()

	if err := ensureVersionTable(ctx); err != nil {
		return err
	}

	currentVersion, err := getCurrentVersion(ctx)
	if err != nil {
		return err
	}

	migrations, err := loadMigrations("migrations")
	if err != nil {
		return err
	}

	if err := validateMigrations(migrations); err != nil {
		return err
	}

	for _, m := range migrations {
		if m.version <= currentVersion {
			continue
		}

		if err := executeMigration(ctx, m); err != nil {
			return fmt.Errorf("migration %d failed: %w", m.version, err)
		}

		fmt.Printf("Successfully applied migration %s (version %d)\n", m.name, m.version)
	}

	return nil
}
