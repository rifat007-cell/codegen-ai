package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

type MCPgreenlightServer struct {
	apiBaseUrl string
	client     *http.Client
	jar        *cookiejar.Jar // Keep reference to jar for debugging
}

// APIResponse represents a generic API response
type ApiResponse struct {
	Status  int                    `json:"status"`
	Data    interface{}            `json:"data,omitempty"`
	Error   string                 `json:"error,omitempty"`
	Headers map[string]interface{} `json:"headers,omitempty"`
}

// LoginRequest represents the login payload
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// GenerateRequest represents the code generation payload
type GenerateRequest struct {
	Language    string `json:"language"`
	Template    string `json:"template"`
	BasePackage string `json:"base_package"`
	ProjectName string `json:"project_name"`
	Model       string `json:"model"`
	Prompt      string `json:"prompt"`
}

func NewMCPgreenlightServer() *MCPgreenlightServer {
	url := os.Getenv("API_BASE_URL")
	if url == "" {
		url = "http://localhost:3000/api"
	}

	// Create cookie jar to handle cookies automatically
	jar, _ := cookiejar.New(nil)

	return &MCPgreenlightServer{
		apiBaseUrl: url,
		jar:        jar,
		client: &http.Client{
			Timeout: 30 * time.Second,
			Jar:     jar,
		},
	}
}

func (s *MCPgreenlightServer) debugCookies(endpoint string, isRequest bool) {
	baseURL, err := url.Parse(s.apiBaseUrl)
	if err != nil {
		fmt.Printf("Error parsing base URL: %v\n", err)
		return
	}

	fullURL, err := url.Parse(s.apiBaseUrl + endpoint)
	if err != nil {
		fmt.Printf("Error parsing full URL: %v\n", err)
		return
	}

	cookies := s.jar.Cookies(fullURL)

	if isRequest {
		fmt.Printf("=== MAKING REQUEST TO: %s ===\n", s.apiBaseUrl+endpoint)
		fmt.Printf("Base URL: %s\n", baseURL.String())
		fmt.Printf("Full URL: %s\n", fullURL.String())
		fmt.Printf("Cookies being sent (%d):\n", len(cookies))
	} else {
		fmt.Printf("=== COOKIES AFTER RESPONSE ===\n")
		fmt.Printf("Cookies now stored (%d):\n", len(cookies))
	}

	for i, cookie := range cookies {
		fmt.Printf("  [%d] %s = %s\n", i, cookie.Name, cookie.Value)
		fmt.Printf("      Domain: %s, Path: %s, Secure: %v, HttpOnly: %v\n",
			cookie.Domain, cookie.Path, cookie.Secure, cookie.HttpOnly)
		fmt.Printf("      Expires: %v\n", cookie.Expires)
	}
	fmt.Printf("========================\n")
}

func (s *MCPgreenlightServer) makeRequest(method, endpoint string, data interface{}, headers map[string]string) (*ApiResponse, error) {
	// Debug cookies before request
	s.debugCookies(endpoint, true)

	var body io.Reader
	if data != nil {
		jsonData, err := json.Marshal(data)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request data: %w", err)
		}
		body = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, s.apiBaseUrl+endpoint, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set default headers
	req.Header.Set("Content-Type", "application/json")

	// Add custom headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	// Show what cookies the jar will send
	fmt.Printf("Request URL: %s\n", req.URL.String())
	fmt.Printf("Request cookies from jar: %v\n", s.jar.Cookies(req.URL))

	resp, err := s.client.Do(req)
	if err != nil {
		return &ApiResponse{
			Status: 0,
			Error:  err.Error(),
		}, nil
	}
	defer resp.Body.Close()

	// Debug response cookies
	fmt.Printf("Response cookies received: %d\n", len(resp.Cookies()))
	for i, cookie := range resp.Cookies() {
		fmt.Printf("  Response cookie [%d]: %s = %s\n", i, cookie.Name, cookie.Value)
		fmt.Printf("    Domain: %s, Path: %s, Secure: %v, HttpOnly: %v\n",
			cookie.Domain, cookie.Path, cookie.Secure, cookie.HttpOnly)
	}

	// Debug cookies after response (jar should have stored them automatically)
	s.debugCookies(endpoint, false)

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return &ApiResponse{
			Status: resp.StatusCode,
			Error:  "failed to read response body",
		}, nil
	}

	var jsonResult interface{}
	if err := json.Unmarshal(respBody, &jsonResult); err != nil {
		// If JSON parsing fails, use raw text
		jsonResult = string(respBody)
	}

	// Convert headers to map
	headerMap := make(map[string]interface{})
	for key, values := range resp.Header {
		if len(values) > 0 {
			headerMap[key] = values[0]
		}
	}

	return &ApiResponse{
		Status:  resp.StatusCode,
		Data:    jsonResult,
		Headers: headerMap,
	}, nil
}

func (s *MCPgreenlightServer) RegisterTools() {
	srv := server.NewMCPServer("greenlight-api-client 🚀",
		"1.0.0",
		server.WithToolCapabilities(true))

	// Health check tool
	healthTool := mcp.NewTool("health_tool",
		mcp.WithDescription("get the health status of this server"),
	)

	// Login tool
	loginTool := mcp.NewTool("user-login",
		mcp.WithDescription("Login user and get JWT token"),
		mcp.WithString("email", mcp.Required(), mcp.Description("User email")),
		mcp.WithString("password", mcp.Required(), mcp.Description("User password")),
	)

	// Me tool (check current user)
	meTool := mcp.NewTool("user-me",
		mcp.WithDescription("Get current logged-in user info"),
	)

	// Logout tool
	logoutTool := mcp.NewTool("user-logout",
		mcp.WithDescription("Logout current user"),
	)
	// Generate code tool
	generateTool := mcp.NewTool("code-generate",
		mcp.WithDescription("Generate code using AI (requires login)"),
		mcp.WithString("language", mcp.Required(), mcp.Description("Programming language")),
		mcp.WithString("template", mcp.Required(), mcp.Description("Project template")),
		mcp.WithString("base_package", mcp.Required(), mcp.Description("Base package name")),
		mcp.WithString("project_name", mcp.Required(), mcp.Description("Project name")),
		mcp.WithString("model", mcp.Required(), mcp.Description("AI model to use")),
		mcp.WithString("prompt", mcp.Required(), mcp.Description("Generation prompt")),
	)

	// Register all tools
	srv.AddTool(healthTool, s.healthToolHandler)
	srv.AddTool(loginTool, s.handleLogin)
	srv.AddTool(meTool, s.handleMe)
	srv.AddTool(logoutTool, s.handleLogout)
	srv.AddTool(generateTool, s.handleGenerate)

	// Start MCP stdio server
	if err := server.ServeStdio(srv); err != nil {
		fmt.Printf("Server error: %v\n", err)
	}
}

func (s *MCPgreenlightServer) handleGenerate(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var args struct {
		Language    string `json:"language"`
		Template    string `json:"template"`
		BasePackage string `json:"base_package"`
		ProjectName string `json:"project_name"`
		Model       string `json:"model"`
		Prompt      string `json:"prompt"`
	}

	argsBytes, err := json.Marshal(request.Params.Arguments)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				mcp.TextContent{
					Type: "text",
					Text: fmt.Sprintf("Failed to marshal arguments: %v", err),
				},
			},
		}, nil
	}

	if err := json.Unmarshal(argsBytes, &args); err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				mcp.TextContent{
					Type: "text",
					Text: fmt.Sprintf("Invalid arguments: %v", err),
				},
			},
		}, nil
	}

	generateData := GenerateRequest{
		Language:    args.Language,
		Template:    args.Template,
		BasePackage: args.BasePackage,
		ProjectName: args.ProjectName,
		Model:       args.Model,
		Prompt:      args.Prompt,
	}

	result, err := s.makeRequest("POST", "/generate-http", generateData, nil)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				mcp.TextContent{
					Type: "text",
					Text: fmt.Sprintf("Generate request failed: %v", err),
				},
			},
		}, nil
	}

	response, _ := json.MarshalIndent(result, "", "  ")
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: string(response),
			},
		},
	}, nil
}

func (s *MCPgreenlightServer) handleLogin(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var args struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	argsBytes, err := json.Marshal(request.Params.Arguments)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				mcp.TextContent{
					Type: "text",
					Text: fmt.Sprintf("Failed to marshal arguments: %v", err),
				},
			},
		}, nil
	}

	if err := json.Unmarshal(argsBytes, &args); err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				mcp.TextContent{
					Type: "text",
					Text: fmt.Sprintf("Invalid arguments: %v", err),
				},
			},
		}, nil
	}

	loginData := LoginRequest{
		Email:    args.Email,
		Password: args.Password,
	}

	fmt.Printf("\n🔑 ATTEMPTING LOGIN...\n")
	result, err := s.makeRequest("POST", "/users/authenticate", loginData, nil)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				mcp.TextContent{
					Type: "text",
					Text: fmt.Sprintf("Login request failed: %v", err),
				},
			},
		}, nil
	}

	response, _ := json.MarshalIndent(result, "", "  ")
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: string(response),
			},
		},
	}, nil
}

func (s *MCPgreenlightServer) handleMe(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	fmt.Printf("\n👤 CHECKING USER STATUS...\n")
	result, err := s.makeRequest("GET", "/users/me", nil, nil)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				mcp.TextContent{
					Type: "text",
					Text: fmt.Sprintf("Me request failed: %v", err),
				},
			},
		}, nil
	}

	response, _ := json.MarshalIndent(result, "", "  ")
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: string(response),
			},
		},
	}, nil
}

func (s *MCPgreenlightServer) handleLogout(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	fmt.Printf("\n🚪 LOGGING OUT...\n")
	result, err := s.makeRequest("POST", "/users/logout", nil, nil)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				mcp.TextContent{
					Type: "text",
					Text: fmt.Sprintf("Logout request failed: %v", err),
				},
			},
		}, nil
	}

	response, _ := json.MarshalIndent(result, "", "  ")
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: string(response),
			},
		},
	}, nil
}

func (s *MCPgreenlightServer) healthToolHandler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	healthURL := s.apiBaseUrl + "/healthcheck"

	resp, err := s.client.Get(healthURL)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				mcp.TextContent{
					Type: "text",
					Text: fmt.Sprintf("Health check failed: %v", err),
				},
			},
		}, nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{
				mcp.TextContent{
					Type: "text",
					Text: fmt.Sprintf("Failed to read response: %v", err),
				},
			},
		}, nil
	}

	result := &ApiResponse{
		Status: resp.StatusCode,
		Data:   string(body),
	}

	response, _ := json.MarshalIndent(result, "", "  ")
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: string(response),
			},
		},
	}, nil
}

func main() {
	srv := NewMCPgreenlightServer()
	srv.RegisterTools()
}
