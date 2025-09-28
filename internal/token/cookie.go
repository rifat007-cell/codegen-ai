package token

import (
	"net/http"
	"time"
)

// Cookie name
const CookieName = "auth_token"

// SetAuthCookie sets a JWT in an HttpOnly cookie
func SetAuthCookie(w http.ResponseWriter, jwt string) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    jwt,
		Path:     "/",
		HttpOnly: true,
		Secure:   true, // set false if testing locally without HTTPS
		SameSite: http.SameSiteStrictMode,
		Expires:  time.Now().Add(72 * time.Hour),
	})
}

// GetAuthCookie extracts the JWT from the request cookie
func GetAuthCookie(r *http.Request) (string, error) {
	cookie, err := r.Cookie(CookieName)
	if err != nil {
		return "", err
	}
	return cookie.Value, nil
}

// ClearAuthCookie removes the cookie (logout)
func ClearAuthCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})
}
