package model

import (
	"encoding/json"
	"io"
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
