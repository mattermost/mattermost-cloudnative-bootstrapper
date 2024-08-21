package api

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/internal/logger"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/telemetry"
)

func initTelemetry(apiRouter *mux.Router, context *Context) {
	addContext := func(handler contextHandlerFunc) *contextHandler {
		return newContextHandler(context, handler)
	}

	telemetryRouter := apiRouter.PathPrefix("/telemetry").Subrouter()
	telemetryRouter.Handle("/track", addContext(handleTrack)).Methods("POST")
	telemetryRouter.Handle("/identify", addContext(handleIdentify)).Methods("POST")
	telemetryRouter.Handle("/page", addContext(handlePage)).Methods("POST")
}

func handleTrack(c *Context, w http.ResponseWriter, r *http.Request) {
	var track telemetry.Track

	err := json.NewDecoder(r.Body).Decode(&track)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to decode telemetry track")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	err = c.TelemetryProvider.Track(&track)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to track telemetry track")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func handleIdentify(c *Context, w http.ResponseWriter, r *http.Request) {
	var identify telemetry.Identify

	err := json.NewDecoder(r.Body).Decode(&identify)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to decode telemetry identify")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	err = c.TelemetryProvider.Identify(&identify)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to identify telemetry user")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func handlePage(c *Context, w http.ResponseWriter, r *http.Request) {
	var page telemetry.Page

	err := json.NewDecoder(r.Body).Decode(&page)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to decode telemetry page")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	err = c.TelemetryProvider.Page(&page)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to track telemetry page")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
