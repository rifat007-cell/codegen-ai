package main

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/tanvir-rifat007/codegen-ai-react/internal/data"
	"github.com/tanvir-rifat007/codegen-ai-react/internal/token"
	"github.com/tanvir-rifat007/codegen-ai-react/internal/validator"
)

func (app *application) createUserHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	err := app.readJSON(w, r, &input)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := data.User{
		Name:      input.Name,
		Email:     input.Email,
		Activated: false,
	}

	err = user.Password.Set(input.Password)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidateUser(v, &user); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Users.Insert(&user)

	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateEmail):
			v.AddError("email", "a user with this email address already exists")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// After the user record has been created in the database, generate a new activation
	// token for the user.
	id, _ := strconv.Atoi(user.ID)

	token, err := app.models.Tokens.New(id, 3*24*time.Hour, data.ScopeActivation)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	app.background(func() {
		// As there are now multiple pieces of data that we want to pass to our email
		// templates, we create a map to act as a 'holding structure' for the data. This
		// contains the plaintext version of the activation token for the user, along
		// with their ID.
		data := map[string]any{
			"activationToken": token.PlainText,
			"userID":          user.ID,
		}

		// Send the welcome email, passing in the map above as dynamic data.
		err := app.mailer.Send(user.Email, "user_welcome.tmpl.html", data)
		if err != nil {
			app.logger.Error(err.Error())
		}
	})

	err = app.writeJSON(w, http.StatusCreated, envelope{"user": user}, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return

	}
}

func (app *application) activateUserHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		token string
	}

	qs := r.URL.Query()

	input.token = app.readString(qs, "token", "")

	// Validate the plaintext token provided by the client.
	v := validator.New()

	if data.ValidateTokenPlaintext(v, input.token); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user, err := app.models.Users.GetForToken(data.ScopeActivation, input.token)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			v.AddError("token", "invalid or expired activation token")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Update the user's activation status.
	user.Activated = true

	// Save the updated user record in our database, checking for any edit conflicts in
	// the same way that we did for our movie records.
	err = app.models.Users.Update(user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	id, _ := strconv.Atoi(user.ID)

	// If everything went successfully, then we delete all activation tokens for the
	// user.
	err = app.models.Tokens.DeleteAllForUser(data.ScopeActivation, id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

}

func (app *application) loginUserHandler(w http.ResponseWriter, r *http.Request) {

	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	err := app.readJSON(w, r, &input)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return

	}

	user := &data.User{
		Email: input.Email,
		Password: data.Password{
			Plaintext: &input.Password,
		},
	}
	user, err = app.models.Users.Login(user.Email, *user.Password.Plaintext)

	if err != nil {
		switch {
		case errors.Is(err, data.ErrInvalidCredentials):
			v := validator.New()
			v.AddError("email", "invalid credentials")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// after login user send a jwt token to the client:
	user.JWT = token.CreateJWT(*user, app.logger)
	token.SetAuthCookie(w, user.JWT)
	err = app.writeJSON(w, http.StatusOK, envelope{"user": user}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

}

func (app *application) meHandler(w http.ResponseWriter, r *http.Request) {

	jwtStr, err := token.GetAuthCookie(r)

	if err != nil {
		app.logger.Error(err.Error())
		return
	}

	parsed, err := token.ValidateJWT(jwtStr, app.logger)

	if err != nil {
		app.logger.Error(err.Error())
		return
	}

	claims, ok := parsed.Claims.(jwt.MapClaims)

	if !ok {
		http.Error(w, "Invalid Claims", http.StatusUnauthorized)
		return
	}

	user := data.User{
		ID:        claims["id"].(string),
		Email:     claims["email"].(string),
		Name:      claims["name"].(string),
		Activated: claims["activated"].(bool),
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"user": user}, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return

	}

}

func (app *application) logoutHandler(w http.ResponseWriter, r *http.Request) {

	token.ClearAuthCookie(w)

	err := app.writeJSON(w, 204, envelope{"user": ""}, nil)

	if err != nil {

		app.serverErrorResponse(w, r, err)
		return
	}

}

// Verify the password reset token and set a new password for the user.
func (app *application) updateUserPasswordHandler(w http.ResponseWriter, r *http.Request) {
	// Parse and validate the user's new password and password reset token.
	var input struct {
		Password string `json:"password"`
		Token    string `json:"token"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	data.ValidatePasswordPlaintext(v, input.Password)
	data.ValidateTokenPlaintext(v, input.Token)

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	// Retrieve the details of the user associated with the password reset token,
	// returning an error message if no matching record was found.
	user, err := app.models.Users.GetForToken(data.ScopePasswordReset, input.Token)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			v.AddError("token", "invalid or expired password reset token")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Set the new password for the user.
	err = user.Password.Set(input.Password)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Save the updated user record in our database, checking for any edit conflicts as
	// normal.
	err = app.models.Users.Update(user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// If everything was successful, then delete all password reset tokens for the user.

	intId, err := strconv.Atoi(user.ID)

	if err != nil {
		app.logger.Error(err.Error())
		return
	}

	err = app.models.Tokens.DeleteAllForUser(data.ScopePasswordReset, intId)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Send the user a confirmation message.
	env := envelope{"message": "your password was successfully reset"}

	err = app.writeJSON(w, http.StatusOK, env, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
