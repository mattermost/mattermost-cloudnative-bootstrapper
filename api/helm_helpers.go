package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/mattermost/mattermost-cloudnative-bootstrapper/helm"
	"gopkg.in/yaml.v3"
)

// CustomValuesRequest represents the request body for custom values
type CustomValuesRequest struct {
	CustomValues string `json:"customValues"`
}

// parseCustomValues parses custom values from request body
func parseCustomValues(r *http.Request) (string, error) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return "", err
	}

	if len(body) == 0 {
		return "", nil // No custom values provided
	}

	var req CustomValuesRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return "", err
	}

	return req.CustomValues, nil
}

// validateCustomValues validates that custom values are valid YAML
func validateCustomValues(customValues string) error {
	if customValues == "" {
		return nil
	}

	var values map[string]interface{}
	return yaml.Unmarshal([]byte(customValues), &values)
}

// DefaultValuesResponse represents the response for default values
type DefaultValuesResponse struct {
	Values string `json:"values"`
}

// handleGetMattermostOperatorDefaultValues returns the default values for Mattermost Operator
func handleGetMattermostOperatorDefaultValues(c *Context, w http.ResponseWriter, r *http.Request) {
	response := DefaultValuesResponse{
		Values: helm.MattermostOperatorValues,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleGetNginxOperatorDefaultValues returns the default values for Nginx Operator
func handleGetNginxOperatorDefaultValues(c *Context, w http.ResponseWriter, r *http.Request) {
	response := DefaultValuesResponse{
		Values: helm.NginxOperatorValues,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleGetCNPGOperatorDefaultValues returns the default values for CloudNative PG Operator
func handleGetCNPGOperatorDefaultValues(c *Context, w http.ResponseWriter, r *http.Request) {
	response := DefaultValuesResponse{
		Values: helm.CNPGOperatorValues,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleGetRTCDServiceDefaultValues returns the default values for RTCD Service
func handleGetRTCDServiceDefaultValues(c *Context, w http.ResponseWriter, r *http.Request) {
	response := DefaultValuesResponse{
		Values: helm.RTCDServiceValues,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleGetCallsOffloaderDefaultValues returns the default values for Calls Offloader
func handleGetCallsOffloaderDefaultValues(c *Context, w http.ResponseWriter, r *http.Request) {
	response := DefaultValuesResponse{
		Values: helm.CallsOffloaderValues,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
