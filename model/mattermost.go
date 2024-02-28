package model

import (
	"encoding/json"
	"io"
)

type CreateMattermostWorkspaceRequest struct {
	License                    string `json:"license"` // For the license file contents
	InstallationName           string `json:"installationName"`
	Size                       string `json:"size"` // Size for the Mattermost instance
	FullDomainName             string `json:"fullDomainName"`
	Version                    string `json:"version"`
	DBConnectionString         string `json:"dbConnectionString"`
	DBReplicasConnectionString string `json:"dbReplicasConnectionString"`
	S3AccessKey                string `json:"s3AccessKey"`
	S3SecretKey                string `json:"s3SecretKey"`
}

func (c *CreateMattermostWorkspaceRequest) IsValid() bool {
	if c.License == "" {
		return false
	}

	if c.InstallationName == "" {
		return false
	}

	if c.Size == "" {
		return false
	}

	if c.FullDomainName == "" {
		return false
	}

	if c.Version == "" {
		return false
	}

	if c.DBConnectionString == "" {
		return false
	}

	if c.DBReplicasConnectionString == "" {
		return false
	}

	if c.S3AccessKey == "" {
		return false
	}

	if c.S3SecretKey == "" {
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
