package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-cloudnative-bootstrapper/model"
)

func initState(apiRouter *mux.Router, context *Context) {
	addContext := func(handler contextHandlerFunc) *contextHandler {
		return newContextHandler(context, handler)
	}

	stateRouter := apiRouter.PathPrefix("/state").Subrouter()
	stateRouter.Handle("/hydrate", addContext(handleHydrateState)).Methods("GET")
	stateRouter.Handle("", addContext(handlePatchState)).Methods("PATCH")
}

func handleHydrateState(c *Context, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	state := c.BootstrapperState
	json.NewEncoder(w).Encode(state)
}

func handlePatchState(c *Context, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	var newState BootstrapperState
	err := json.NewDecoder(r.Body).Decode(&newState)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	state := c.BootstrapperState

	state = state.Merge(newState)

	err = SetState("", state)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(state)
}

const stateFileName = "state.json"
const stateFileDir = ".mcnb" // Mattermost CloudNative Bootstrapper

func DefaultStateFilePath() string {
	homeDir, _ := os.UserHomeDir()
	return filepath.Join(homeDir, stateFileDir, stateFileName)
}

func CheckStateExists(stateFilePath string) (bool, error) {
	if stateFilePath == "" {
		stateFilePath = DefaultStateFilePath()
	}

	_, err := os.Stat(stateFilePath)
	if err == nil {
		return true, nil
	}

	if os.IsNotExist(err) {
		return false, nil
	}

	return false, err
}

func InitState(stateFilePath string) error {
	if stateFilePath == "" {
		stateFilePath = DefaultStateFilePath()
	}

	homeDir, _ := os.UserHomeDir()
	err := os.MkdirAll(filepath.Join(homeDir, stateFileDir), 0700)
	if err != nil {
		return err
	}

	blankState := BootstrapperState{}
	// Set a telemetry ID to start
	blankState.Telemetry.TelemetryID = model.NewTelemetryID()

	data, err := json.Marshal(blankState)
	if err != nil {
		return err
	}

	err = os.WriteFile(stateFilePath, data, 0600)
	if err != nil {
		return err
	}

	return nil
}

func GetState(stateFilePath string) (BootstrapperState, error) {
	if stateFilePath == "" {
		stateFilePath = DefaultStateFilePath()
	}

	var state BootstrapperState
	data, err := os.ReadFile(stateFilePath)
	if err != nil {
		return state, err
	}

	err = json.Unmarshal(data, &state)
	if err != nil {
		return state, err
	}

	return state, nil
}

func SetState(stateFilePath string, state BootstrapperState) error {
	if stateFilePath == "" {
		stateFilePath = DefaultStateFilePath()
	}

	data, err := json.Marshal(state)
	if err != nil {
		return err
	}

	err = os.WriteFile(stateFilePath, data, 0600)
	if err != nil {
		return err
	}

	return nil
}

func UpdateStateCredentials(existingState BootstrapperState, credentials *model.Credentials) error {
	state, err := GetState(existingState.StateFilePath)
	if err != nil {
		return err
	}

	state.Credentials = credentials

	err = SetState(existingState.StateFilePath, state)
	if err != nil {
		return err
	}

	return nil
}
