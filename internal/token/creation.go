package token

import (
	"log/slog"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/tanvir-rifat007/codegen-ai-react/internal/data"
)

func CreateJWT(user data.User, logger *slog.Logger) string {
	jwtSecret := GetJWTSecret(logger)

	// Create a JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":        user.ID,
		"email":     user.Email,
		"name":      user.Name,
		"exp":       time.Now().Add(time.Hour * 72).Unix(), // Token expires in 72 hours
		"activated": user.Activated,
	})

	// Sign the token with the secret
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		logger.Error("Failed to sign JWT", err)
		return ""
	}

	return tokenString
}
