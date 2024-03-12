package model

import (
	"encoding/json"
	"io"
	"regexp"
)

type CreateMattermostWorkspaceRequest struct {
	License                    string `json:"enterpriseLicense"` // For the license file contents
	InstallationName           string `json:"installationName"`
	Size                       string `json:"size"` // Size for the Mattermost instance
	FullDomainName             string `json:"domainName"`
	Version                    string `json:"version"`
	CreateDatabase             bool   `json:"createDBForMe"`
	DBConnectionString         string `json:"dbConnectionString"`
	DBReplicasConnectionString string `json:"dbReplicasConnectionString"`
	CreateS3Bucket             bool   `json:"createS3ForMe"`
	S3BucketURL                string `json:"url"`
	S3BucketName               string `json:"bucketName"`
	S3AccessKey                string `json:"accessKeyId"`
	S3SecretKey                string `json:"accessKeySecret"`
}

// PatchMattermostWorkspaceRequest represents the request body for patching Mattermost workspace.
type PatchMattermostWorkspaceRequest struct {
	Version  string `json:"version"`
	Name     string `json:"name"`
	Image    string `json:"image"`
	Replicas int    `json:"replicas"`
	License  string `json:"license"`
	Endpoint string `json:"endpoint"`
}

// NewMattermostWorkspacePatchRequestFromReader creates a new PatchMattermostWorkspaceRequest from the provided io.Reader.
func NewMattermostWorkspacePatchRequestFromReader(body io.Reader) (*PatchMattermostWorkspaceRequest, error) {
	var req PatchMattermostWorkspaceRequest
	err := json.NewDecoder(body).Decode(&req)
	if err != nil {
		return nil, err
	}
	return &req, nil
}

// IsValid checks if the PatchMattermostWorkspaceRequest is valid.
func (req *PatchMattermostWorkspaceRequest) IsValid() bool {
	// Check if the version is a valid semantic version
	if !isValidSemanticVersion(req.Version) {
		return false
	}

	// Add additional validation rules here as needed

	return true
}

// isValidSemanticVersion checks if the provided string is a valid semantic version.
func isValidSemanticVersion(version string) bool {
	// Regular expression pattern for semantic versioning (e.g., 1.0.0)
	pattern := `^\d+\.\d+\.\d+$`
	match, err := regexp.MatchString(pattern, version)
	return err == nil && match
}

func (c *CreateMattermostWorkspaceRequest) IsValid() bool {

	if c.InstallationName == "" {
		return false
	}

	// if c.Size == "" {
	// 	return false
	// }

	if c.FullDomainName == "" {
		return false
	}

	// if c.Version == "" {
	// 	return false
	// }

	if !c.CreateDatabase && c.DBConnectionString == "" {
		return false
	}

	if !c.CreateDatabase && c.DBReplicasConnectionString == "" {
		return false
	}

	if !c.CreateS3Bucket && c.S3AccessKey == "" {
		return false
	}

	if !c.CreateS3Bucket && c.S3SecretKey == "" {
		return false
	}

	return true
}

func NewCreateMattermostWorkspaceRequestFromReader(reader io.Reader) (*CreateMattermostWorkspaceRequest, error) {
	var createMattermostWorkspaceRequest CreateMattermostWorkspaceRequest
	err := json.NewDecoder(reader).Decode(&createMattermostWorkspaceRequest)
	if err != nil {
		return nil, err
	}
	return &createMattermostWorkspaceRequest, nil
}
