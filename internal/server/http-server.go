package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/tanvir-rifat007/codegen-ai-react/internal/agents"
)

// Add this new HTTP handler to your existing server.go file

func (s *Server) HandleGenerateHTTP(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Set headers for JSON response
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight requests
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req ProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid JSON request"}`, http.StatusBadRequest)
		return
	}

	projectName := req.ProjectName
	if projectName == "" {
		projectName = fmt.Sprintf("%s-project", req.Language)
	}

	sessionID := uuid.New().String()
	sessionDir := filepath.Join(s.outputBase, sessionID)
	if err := os.MkdirAll(sessionDir, 0755); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Failed to create session directory: %s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	projectDir := filepath.Join(sessionDir, projectName)
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Failed to create project directory: %s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	ctx := context.Background()
	httpClient := &http.Client{
		Timeout: 1000 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:          100,
			ResponseHeaderTimeout: 1000 * time.Second,
			MaxIdleConnsPerHost:   100,
			IdleConnTimeout:       90 * time.Second,
			TLSHandshakeTimeout:   10 * time.Second,
			DisableCompression:    false,
			ExpectContinueTimeout: 5 * time.Second,
			DialContext: (&net.Dialer{
				Timeout:   1000 * time.Second,
				KeepAlive: 1000 * time.Second,
			}).DialContext,
		},
	}

	client := agents.NewOpenAI(ctx, s.openAIKey, req.Model, httpClient)

	// For HTTP, we'll collect all progress messages and return them at the end
	var progressMessages []string
	progressCallback := func(eventType, message, file string) {
		logMsg := fmt.Sprintf("[%s] %s", eventType, message)
		if file != "" {
			logMsg += fmt.Sprintf(" (file: %s)", file)
		}
		progressMessages = append(progressMessages, logMsg)
		log.Println(logMsg)
	}

	agent, err := agents.NewAgentWithCallback(
		ctx, client, projectDir, req.BasePackage,
		req.Template, req.Language, req.WorkerCount,
		progressCallback,
	)

	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Failed to initialize agent: %s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	agent.Start()

	// Generate code
	if err := agent.GenerateCode(req.Prompt); err != nil {
		agent.Stop()
		http.Error(w, fmt.Sprintf(`{"error": "Code generation failed: %s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	time.Sleep(1 * time.Second)
	agent.Stop()

	// Create zip file
	zipName := fmt.Sprintf("%s.zip", projectName)
	zipPath := filepath.Join(sessionDir, zipName)

	if err := createZip(projectDir, zipPath); err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Failed to create zip file: %s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	zipURL := fmt.Sprintf("/download/%s", sessionID)

	// Return success response
	response := map[string]interface{}{
		"status":           "success",
		"message":          "Code generation complete!",
		"projectName":      projectName,
		"sessionId":        sessionID,
		"zipUrl":           zipURL,
		"progressMessages": progressMessages,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// Add this to your main function or router setup:
// http.HandleFunc("/api/generate-http", server.HandleGenerateHTTP)
