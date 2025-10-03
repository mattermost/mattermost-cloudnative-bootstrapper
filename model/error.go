package model

import (
	"encoding/json"
	"net/http"
)

// ErrorResponse represents a structured error response for the API
type ErrorResponse struct {
	// Message is a user-friendly error message
	Message string `json:"message"`
	// Details contains technical details for debugging
	Details interface{} `json:"details,omitempty"`
	// Code is an optional error code for categorization
	Code string `json:"code,omitempty"`
	// Operation describes what operation was being performed when the error occurred
	Operation string `json:"operation,omitempty"`
}

// WriteErrorResponse writes a structured error response to the HTTP response writer
func WriteErrorResponse(w http.ResponseWriter, statusCode int, message, operation, code string, details interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	errorResponse := ErrorResponse{
		Message:   message,
		Details:   details,
		Code:      code,
		Operation: operation,
	}

	json.NewEncoder(w).Encode(errorResponse)
}

// WriteInternalServerError is a convenience function for 500 errors
func WriteInternalServerError(w http.ResponseWriter, message, operation string, details interface{}) {
	WriteErrorResponse(w, http.StatusInternalServerError, message, operation, "INTERNAL_ERROR", details)
}

// WriteBadRequestError is a convenience function for 400 errors
func WriteBadRequestError(w http.ResponseWriter, message, operation string, details interface{}) {
	WriteErrorResponse(w, http.StatusBadRequest, message, operation, "BAD_REQUEST", details)
}

// WriteNotFoundError is a convenience function for 404 errors
func WriteNotFoundError(w http.ResponseWriter, message, operation string, details interface{}) {
	WriteErrorResponse(w, http.StatusNotFound, message, operation, "NOT_FOUND", details)
}

// WriteDeploymentError is a convenience function for deployment errors (599 status code)
func WriteDeploymentError(w http.ResponseWriter, message, operation string, details interface{}) {
	WriteErrorResponse(w, 599, message, operation, "DEPLOYMENT_ERROR", details)
}
