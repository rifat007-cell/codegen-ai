package data

import (
	"database/sql"
	"fmt"
	"strconv"
)

type CodenGen struct {
	ID          int    `json:"id"`
	UserID      int    `json:"user_id"`
	Language    string `json:"language"`
	Template    string `json:"template"`
	BasePackage string `json:"basePackage"`
	Workers     int    `json:"workers"`
	Model       string `json:"model"`
	ProjectName string `json:"projectName"`
	Prompt      string `json:"prompt"`
}

type CodeGenModel struct {
	DB *sql.DB
}

// Create inserts a new CodenGen record into the database
func (m *CodeGenModel) Create(cg *CodenGen) error {
	query := `
		INSERT INTO codegen (user_id, language, template, basepackage, workers, model, projectname, prompt)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id`

	err := m.DB.QueryRow(query,
		cg.UserID,
		cg.Language,
		cg.Template,
		cg.BasePackage,
		cg.Workers,
		cg.Model,
		cg.ProjectName,
		cg.Prompt,
	).Scan(&cg.ID)

	if err != nil {
		return fmt.Errorf("failed to create codegen record: %w", err)
	}

	return nil
}

// GetAll retrieves all CodenGen records from the database

func (m *CodeGenModel) GetAllByUserID(userID int) ([]*CodenGen, error) {
	query := `
		SELECT id, user_id, language, template, basepackage, workers, model, projectname, prompt
		FROM codegen
		WHERE user_id = $1
		ORDER BY id`

	rows, err := m.DB.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query codegen records for user %d: %w", userID, err)
	}
	defer rows.Close()

	var codegens []*CodenGen

	for rows.Next() {
		cg := &CodenGen{}
		err := rows.Scan(
			&cg.ID,
			&cg.UserID,
			&cg.Language,
			&cg.Template,
			&cg.BasePackage,
			&cg.Workers,
			&cg.Model,
			&cg.ProjectName,
			&cg.Prompt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan codegen record: %w", err)
		}
		codegens = append(codegens, cg)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error occurred during row iteration: %w", err)
	}

	return codegens, nil
}

// Helper function to convert string UserID to int
func (m *CodeGenModel) CreateWithStringUserID(cg *CodenGen, userIDStr string) error {
	if userIDStr == "" {
		return fmt.Errorf("user_id cannot be empty")
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return fmt.Errorf("invalid user_id format: %w", err)
	}

	cg.UserID = userID
	return m.Create(cg)
}
