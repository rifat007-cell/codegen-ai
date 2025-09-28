package token

import (
	"log/slog"
	"os"
)

func GetJWTSecret(logger *slog.Logger) string {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "default-secret-for-dev"
		logger.Info("JWT_SECRET not set, using default development secret")
	} else {
		logger.Info("Using JWT_SECRET from environment")
	}
	return jwtSecret
}
