package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/tanvir-rifat007/codegen-ai-react/internal/agents"
)

func main() {

	openaiKey := flag.String("OPENAI_API_KEY", os.Getenv("OPENAI_API_KEY"), "openai api key")
	outputDir := flag.String("output-dir", "./output", "Output directory for generated code")
	basePackage := flag.String("base-package", "github.com/user/app", "Base Package for generated files")
	workerCount := flag.Int("worker-count", 4, "Number of workers to use the file genration")

	model := flag.String("model", "gpt-4o-mini", "Model name of the openai api")

	templateName := flag.String("template", "go-default", "Project template to use")
	language := flag.String("language", "go", "Programming language to use")
	timeOut := flag.Int("timeout", 120, "Timeout for openai api response")
	listTemplates := flag.Bool("list-templates", false, "List available templates and exit")
	listLanguages := flag.Bool("list-languages", false, "List supported programming languages and exit")

	flag.Parse()

	client := agents.NewOpenAI(context.Background(), *openaiKey, *model, &http.Client{
		Timeout: time.Duration(*timeOut) * time.Second,
	})

	agents, err := agents.NewAgent(context.Background(), client, *outputDir, *basePackage, *templateName, *language, *workerCount)

	if err != nil {
		fmt.Printf("%s\n", err.Error())

	}

	if *listTemplates {
		fmt.Println("Available templates:")
		for _, tmpl := range agents.ListTemplates() {
			fmt.Printf("- %s: %s (Language: %s)\n", tmpl.Name, tmpl.Description, tmpl.Language)
		}
		return
	}

	// list languages
	if *listLanguages {
		fmt.Println("Supported languages:")
		for _, lang := range agents.ListLanguages() {
			fmt.Printf("- %s\n", lang)
		}
		return
	}

	args := flag.Args()

	if len(args) == 0 {
		log.Println("You have to passing args(ex: ./codegen \"Give me a simple todo app\")")
		os.Exit(1)

	}

	agents.Start()

	prompt := strings.Join(args, " ")

	if err = agents.GenerateCode(prompt); err != nil {

		log.Printf("Error writing code : %v\n", err)
		agents.Stop()
		os.Exit(1)

	}

	time.Sleep(1 * time.Second)

	agents.Stop()

}
