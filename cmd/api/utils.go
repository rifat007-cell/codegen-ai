package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"rogchap.com/v8go"
)

type envelope map[string]any

func (app *application) writeJSON(w http.ResponseWriter, status int, data envelope, headers http.Header) error {

	js, err := json.MarshalIndent(data, "", "\t")

	if err != nil {
		return err

	}

	js = append(js, '\n')

	for key, value := range headers {
		w.Header()[key] = value

	}

	w.Header().Set("Content-Type", "application/json")

	w.WriteHeader(status)

	w.Write(js)

	return nil

}

// parsing json request from client and then check the specific errors:

func (app *application) readJSON(w http.ResponseWriter, r *http.Request, dst any) error {

	r.Body = http.MaxBytesReader(w, r.Body, 1_048_576)
	dec := json.NewDecoder(r.Body)

	dec.DisallowUnknownFields()

	err := dec.Decode(dst)
	if err != nil {

		var syntaxError *json.SyntaxError
		var unmarshalTypeError *json.UnmarshalTypeError
		var invalidUnmarshalError *json.InvalidUnmarshalError
		var maxBytesError *http.MaxBytesError
		switch {

		case errors.As(err, &syntaxError):
			return fmt.Errorf("body contains badly-formed JSON (at character %d)", syntaxError.Offset)

		case errors.Is(err, io.ErrUnexpectedEOF):
			return errors.New("body contains badly-formed JSON")

		case errors.As(err, &unmarshalTypeError):
			if unmarshalTypeError.Field != "" {
				return fmt.Errorf("body contains incorrect JSON type for field %q", unmarshalTypeError.Field)
			}
			return fmt.Errorf("body contains incorrect JSON type (at character %d)", unmarshalTypeError.Offset)

		case errors.Is(err, io.EOF):
			return errors.New("body must not be empty")

		case errors.As(err, &invalidUnmarshalError):
			panic(err)
		case strings.HasPrefix(err.Error(), "json: unknown field "):
			fieldName := strings.TrimPrefix(err.Error(), "json: unknown field ")
			return fmt.Errorf("body contains unknown key %s", fieldName)

		case errors.As(err, &maxBytesError):
			return fmt.Errorf("body must not be larger than %d bytes", maxBytesError.Limit)

		default:
			return err

		}

	}

	err = dec.Decode(&struct{}{})
	if !errors.Is(err, io.EOF) {
		return errors.New("body must only contain a single JSON value")
	}

	return nil

}

func (app *application) initializeApp() error {
	// Read the HTML shell once at startup
	shell, err := os.ReadFile("dist/index.html")
	if err != nil {
		return fmt.Errorf("error reading index.html: %w", err)
	}
	htmlShell = string(shell)

	// Read and transform App.js once at startup
	code, err := os.ReadFile("app.js")
	if err != nil {
		return fmt.Errorf("error reading app.js: %w", err)
	}
	appCode = string(code)

	fmt.Println("App initialized successfully")
	return nil
}

func (app *application) handleSSR(w http.ResponseWriter, r *http.Request) {
	// Skip assets
	if strings.HasPrefix(r.URL.Path, "/assets/") {
		return
	}

	fmt.Printf("Handling SSR request for: %s\n", r.URL.Path)

	iso := v8go.NewIsolate()
	defer iso.Dispose()
	ctx := v8go.NewContext(iso)
	defer ctx.Close()

	setupReactInV8(ctx)

	// Execute the App component
	_, err := ctx.RunScript(appCode, "App.js")
	if err != nil {
		fmt.Printf("Error executing App.js: %v\n", err)
		http.Error(w, fmt.Sprintf("Error executing App.js: %v", err), http.StatusInternalServerError)
		return
	}

	// Render with current pathname for SSR

	renderScript := fmt.Sprintf(`
		const { renderToString } = ReactDOMServer;
		const appElement = React.createElement(globalThis.App, { 
			ssrPathname: '%s' 
		});
		renderToString(appElement);
	`, r.URL.Path)

	result, err := ctx.RunScript(renderScript, "render.js")
	if err != nil {
		fmt.Printf("Error rendering React component: %v\n", err)
		http.Error(w, fmt.Sprintf("Error rendering React component: %v", err), http.StatusInternalServerError)
		return
	}

	renderedHTML := result.String()

	// Replace the placeholder with the rendered content
	htmlContent := strings.Replace(htmlShell, "<!--ROOT-->", renderedHTML, 1)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	// Write the response
	fmt.Fprint(w, htmlContent)
}

func setupReactInV8(ctx *v8go.Context) {
	reactSetup := `
        // Add console.log for debugging
        const console = {
            log: function(...args) {
                // This will be visible in Go logs if needed
            }
        };

        const React = {
            createElement: function(type, props, ...children) {
                if (typeof type === 'function') {
                    return type(props || {});
                }
                
                const element = {
                    type: type,
                    props: props || {},
                    children: children.filter(child => child != null)
                };
                
                return element;
            },
            useState: function(initialState) {
                return [initialState, function() {}];
            },
            useEffect: function(effect, deps) {
                // SSR mock - effects don't run
                return;
            },
	 useRef: function(initialValue) {
                return { current: initialValue };
            }
        };

        const ReactDOMServer = {
            renderToStaticMarkup: function(element) {
                return renderElement(element);
            },
            renderToString: function(element) {
                return renderElement(element);
            }
        };

        function renderElement(element) {
            if (typeof element === 'string' || typeof element === 'number') {
                return String(element);
            }
            
            if (!element || !element.type) {
                return '';
            }
            
            const { type, props, children } = element;
            const attrs = renderAttributes(props);
            const childrenStr = (children || []).map(renderElement).join('');
            
            const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
            if (voidElements.includes(type)) {
                return '<' + type + attrs + ' />';
            }
            
            return '<' + type + attrs + '>' + childrenStr + '</' + type + '>';
        }
    
        function renderAttributes(props) {
            if (!props) return '';
            
            return Object.keys(props)
                .filter(key => key !== 'children' && props[key] != null)
                .filter(key => !key.startsWith('on'))
                .map(key => {
                    const value = props[key];
                    if (typeof value === 'boolean') {
                        return value ? ' ' + key : '';
                    }
                    
                    // Handle style objects
                    if (key === 'style' && typeof value === 'object') {
                        const styleStr = Object.keys(value)
                            .map(styleKey => {
                                const styleProp = styleKey.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
                                return styleProp + ': ' + value[styleKey];
                            })
                            .join('; ');
                        return ' style="' + styleStr + '"';
                    }
                    
                    const attrName = key === 'className' ? 'class' : key;
                    return ' ' + attrName + '="' + String(value).replace(/"/g, '&quot;') + '"';
                })
                .join('');
        }
    `

	_, err := ctx.RunScript(reactSetup, "react-setup.js")
	if err != nil {
		log.Fatal("Error setting up React in V8:", err)
	}
}

func (app *application) background(fn func()) {

	// if we terminating the application then
	// we give the background goroutine time to finish that work
	// so that's why we use this waitgroup

	app.wg.Add(1)

	go func() {

		defer app.wg.Done()

		// if email sending has an error then print
		// this error on the defer block

		defer func() {

			if err := recover(); err != nil {
				app.logger.Error(fmt.Sprintf("%v", err))

			}

		}()

		// email sending function
		fn()

	}()

}

func (app *application) readString(qs url.Values, key string, defaultValue string) string {

	s := qs.Get(key)

	if s == "" {
		return defaultValue

	}

	return s

}
