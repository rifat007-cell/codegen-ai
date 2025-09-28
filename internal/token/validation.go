package token

import (
	"log/slog"

	"github.com/golang-jwt/jwt/v5"
)

func ValidateJWT(tokenString string, logger *slog.Logger) (*jwt.Token, error) {
	jwtSecret := GetJWTSecret(logger)

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			logger.Error("Unexpected signing method")
			return nil, jwt.ErrTokenSignatureInvalid
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		logger.Error("Failed to validate JWT", "err", err)
		return nil, err
	}

	if !token.Valid {
		logger.Error("Invalid JWT token")
		return nil, jwt.ErrTokenInvalidId
	}

	return token, nil
}
