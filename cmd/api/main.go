package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"sync"
	"time"

	_ "github.com/lib/pq"

	"github.com/tanvir-rifat007/codegen-ai-react/internal/data"
	"github.com/tanvir-rifat007/codegen-ai-react/internal/mailer"
	"github.com/tanvir-rifat007/codegen-ai-react/internal/server"
)

var (
	htmlShell string
	appCode   string
)

type config struct {
	port      int
	env       string
	openAiKey string
	outputDir string
	db        struct {
		dsn string
	}
	smtp struct {
		host     string
		port     int
		username string
		password string
		sender   string
	}
}

type application struct {
	config config
	logger *slog.Logger
	wg     sync.WaitGroup
	models data.Models
	mailer *mailer.Mailer
}

const version = "1.0.0"

func main() {

	var cfg config

	flag.StringVar(&cfg.env, "env", "development", "Environment (development | staging | production)")
	flag.IntVar(&cfg.port, "port", 3000, "Api server port")

	flag.StringVar(&cfg.openAiKey, "openAiKey", os.Getenv("OPENAI_API_KEY"), "OpenAI API key")
	flag.StringVar(&cfg.outputDir, "output-dir", "./output", "Base directory for generated projects")

	flag.StringVar(&cfg.db.dsn, "db-url", os.Getenv("DB_URL"), "Database url")

	flag.StringVar(&cfg.smtp.host, "smtp-host", os.Getenv("FROM_EMAIL_SMTP"), "SMTP host")
	flag.IntVar(&cfg.smtp.port, "smtp-port", 587, "SMTP port")
	flag.StringVar(&cfg.smtp.username, "smtp-username", os.Getenv("FROM_EMAIL"), "SMTP username")
	flag.StringVar(&cfg.smtp.password, "smtp-password", os.Getenv("FROM_EMAIL_PASSWORD"), "SMTP password")
	flag.StringVar(&cfg.smtp.sender, "smtp-sender", os.Getenv("FROM_EMAIL"), "SMTP sender")

	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	db, err := openDB(cfg)

	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}

	defer db.Close()

	logger.Info("Database connection pool established!")

	// web socket server
	srv := server.NewServer(cfg.openAiKey, cfg.outputDir, &data.CodeGenModel{
		DB: db,
	})

	mailer, err := mailer.New(cfg.smtp.host, cfg.smtp.port, cfg.smtp.username, cfg.smtp.password, cfg.smtp.sender)
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}

	app := &application{
		config: cfg,
		logger: logger,
		models: data.NewModels(db),
		mailer: mailer,
	}

	err = app.initializeApp()
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}

	http.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("dist/assets/"))))
	// Setup HTTP routes
	http.HandleFunc("/", app.handleSSR)

	http.Handle("/api/health", app.AuthMiddleware(http.HandlerFunc(app.healthcheckHandler)))

	http.HandleFunc("/api/users", app.createUserHandler)

	http.HandleFunc("/api/users/authenticate", app.loginUserHandler)

	http.HandleFunc("/api/users/me", app.meHandler)

	http.HandleFunc("/api/users/logout", app.logoutHandler)
	http.Handle("/api/generate", app.AuthMiddleware(http.HandlerFunc(srv.HandleGenerate)))
	http.HandleFunc("/download/", srv.HandleDownload)

	http.HandleFunc("/api/generate-http", srv.HandleGenerateHTTP)
	http.HandleFunc("/api/activate", app.activateUserHandler)

	// password reset and update handler
	http.HandleFunc("/api/tokens/password-reset", app.createPasswordResetTokenHandler)
	http.HandleFunc("/api/users/password", app.updateUserPasswordHandler)

	http.HandleFunc("/api/history", srv.HandleGetUserHistory)

	fmt.Println("SSR Server starting on http://localhost:3000")
	fmt.Println("Static files served from /assets/")
	fmt.Println("React SSR on every request!")

	log.Fatal(http.ListenAndServe(":3000", nil))

}

func openDB(cfg config) (*sql.DB, error) {
	db, err := sql.Open("postgres", cfg.db.dsn)

	if err != nil {
		return nil, err

	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)

	defer cancel()

	err = db.PingContext(ctx)

	if err != nil {
		db.Close()
		return nil, err

	}

	return db, nil

}
