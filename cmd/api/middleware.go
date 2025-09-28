package main

import (
	"net/http"

	"github.com/tanvir-rifat007/codegen-ai-react/internal/token"
)

func (app *application) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		jwtString, err := token.GetAuthCookie(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		parsedToken, err := token.ValidateJWT(jwtString, app.logger)
		if err != nil || !parsedToken.Valid {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		//Token valid, continue
		next.ServeHTTP(w, r)
	})
}
