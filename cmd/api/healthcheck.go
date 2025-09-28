package main

import (
	"net/http"
)

func (app *application) healthcheckHandler(w http.ResponseWriter, r *http.Request) {

	err := app.writeJSON(w, http.StatusOK, envelope{
		"status": "available",
		"sys_info": map[string]string{
			"environment": app.config.env,
			"version":     version,
		},
	}, nil)

	if err != nil {

		app.serverErrorResponse(w, r, err)
	}

}
