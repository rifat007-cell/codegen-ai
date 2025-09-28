package mailer

import (
	"bytes"
	"context"
	"embed"
	"fmt"
	"html/template"
	"os"
	"time"

	"github.com/mailgun/mailgun-go/v4"
)

//go:embed "templates"
var templateFS embed.FS

type Mailer struct {
	client mailgun.Mailgun
	sender string
	domain string
}

// New creates a new mailer instance using Mailgun
// The host, port, username, password parameters are kept for compatibility but ignored
// Mailgun uses API key and domain from environment variables
func New(host string, port int, username, password, sender string) (*Mailer, error) {
	apiKey := os.Getenv("MAILGUN_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("MAILGUN_API_KEY environment variable is required")
	}

	domain := os.Getenv("MAILGUN_DOMAIN")
	if domain == "" {
		return nil, fmt.Errorf("MAILGUN_DOMAIN environment variable is required")
	}

	// Create Mailgun client
	mg := mailgun.NewMailgun(domain, apiKey)

	// Set EU endpoint if needed (uncomment if using EU servers)
	// mg.SetAPIBase(mailgun.APIBaseEU)

	mailer := &Mailer{
		client: mg,
		sender: sender,
		domain: domain,
	}

	return mailer, nil
}

// Send sends an email using Mailgun API with template support
func (m *Mailer) Send(recipient string, templateFile string, data any) error {
	// Parse templates
	tmpl, err := template.New("").ParseFS(templateFS, fmt.Sprintf("templates/%s", templateFile))
	if err != nil {
		return fmt.Errorf("failed to parse template: %w", err)
	}

	// Execute subject template
	subject := new(bytes.Buffer)
	err = tmpl.ExecuteTemplate(subject, "subject", data)
	if err != nil {
		return fmt.Errorf("failed to execute subject template: %w", err)
	}

	// Execute plain body template
	plainBody := new(bytes.Buffer)
	err = tmpl.ExecuteTemplate(plainBody, "plainBody", data)
	if err != nil {
		return fmt.Errorf("failed to execute plain body template: %w", err)
	}

	// Execute HTML body template
	htmlBody := new(bytes.Buffer)
	err = tmpl.ExecuteTemplate(htmlBody, "htmlBody", data)
	if err != nil {
		return fmt.Errorf("failed to execute HTML body template: %w", err)
	}

	// Create Mailgun message
	message := m.client.NewMessage(
		m.sender,
		subject.String(),
		plainBody.String(),
		recipient,
	)

	// Set HTML version
	message.SetHtml(htmlBody.String())

	// Send the email with timeout
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
	defer cancel()

	resp, id, err := m.client.Send(ctx, message)
	if err != nil {
		return fmt.Errorf("failed to send email via Mailgun: %w", err)
	}

	// Log success (optional - you can remove this)
	fmt.Printf("Mailgun email sent successfully. Message ID: %s, Response: %s\n", id, resp)

	return nil
}
