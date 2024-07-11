package model

import (
	"encoding/json"
	"io"
	"regexp"

	mmv1beta1 "github.com/mattermost/mattermost-operator/apis/mattermost/v1beta1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	FilestoreOptionInClusterLocal    = "InClusterLocal"
	FilestoreOptionExistingS3        = "ExistingS3"
	FilestoreOptionAWSS3             = "AWSS3"
	FilestoreOptionInClusterExternal = "InClusterExternal"
)

type CreateMattermostWorkspaceRequest struct {
	License                    string                  `json:"enterpriseLicense"` // For the license file contents
	InstallationName           string                  `json:"installationName"`
	Size                       string                  `json:"size"` // Size for the Mattermost instance
	FullDomainName             string                  `json:"domainName"`
	Version                    string                  `json:"version"`
	CreateDatabase             bool                    `json:"createDBForMe"`
	DBConnectionString         string                  `json:"dbConnectionString"`
	DBReplicasConnectionString string                  `json:"dbReplicasConnectionString"`
	FilestoreOption            string                  `json:"filestoreOption"`
	S3Filestore                *S3Filestore            `json:"s3FilestoreConfig"`
	LocalFileStore             *LocalFileStore         `json:"localFilestoreConfig"`
	LocalExternalFileStore     *LocalExternalFileStore `json:"localExternalFilestoreConfig"`
}

type LocalFileStore struct {
	StorageSize string `json:"storageSize"`
}

type S3Filestore struct {
	BucketURL  string `json:"url"`
	BucketName string `json:"bucketName"`
	AccessKey  string `json:"accessKeyId"`
	SecretKey  string `json:"accessKeySecret"`
}

type LocalExternalFileStore struct {
	VolumeClaimName string `json:"volumeClaimName,omitempty"`
}

func (le *LocalExternalFileStore) IsValid() bool {
	if le.VolumeClaimName == "" {
		return false
	}

	return true
}

func (l *LocalFileStore) IsValid() bool {
	if l.StorageSize == "" {
		return false
	}

	return true
}

func (s *S3Filestore) IsValid() bool {
	if s.AccessKey == "" {
		return false
	}

	if s.SecretKey == "" {
		return false
	}

	if s.BucketName == "" {
		return false
	}

	if s.BucketURL == "" {
		return false
	}

	return true
}

func (c *CreateMattermostWorkspaceRequest) GetMMOperatorFilestoreSecret(namespaceName string) *v1.Secret {
	if c.FilestoreOption == FilestoreOptionExistingS3 {
		return &v1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "mattermost-s3",
				Namespace: namespaceName,
			},
			Type: v1.SecretTypeOpaque,
			StringData: map[string]string{
				"accesskey": c.S3Filestore.AccessKey,
				"secretkey": c.S3Filestore.SecretKey,
			},
		}
	}
	// TODO - Add support for other non-local options

	return nil
}

func (c *CreateMattermostWorkspaceRequest) GetMMOperatorFilestore(namespaceName string, secret *v1.Secret) mmv1beta1.FileStore {
	filestore := mmv1beta1.FileStore{}
	if c.FilestoreOption == FilestoreOptionExistingS3 {
		filestore.External = &mmv1beta1.ExternalFileStore{
			URL:    c.S3Filestore.BucketURL,
			Secret: secret.Name,
			Bucket: c.S3Filestore.BucketName,
		}
	} else if c.FilestoreOption == FilestoreOptionInClusterLocal {
		filestore.Local = &mmv1beta1.LocalFileStore{
			StorageSize: c.LocalFileStore.StorageSize,
			Enabled:     true,
		}
	} else if c.FilestoreOption == FilestoreOptionInClusterExternal {
		filestore.ExternalVolume = &mmv1beta1.ExternalVolumeFileStore{
			VolumeClaimName: c.LocalExternalFileStore.VolumeClaimName,
		}
	}

	// TODO - Add support for other non-local options

	return filestore
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

	if c.FilestoreOption == "" {
		return false
	}

	if c.FilestoreOption == FilestoreOptionExistingS3 && !c.S3Filestore.IsValid() {
		return false
	}

	if c.FilestoreOption == FilestoreOptionInClusterLocal && !c.LocalFileStore.IsValid() {
		return false
	}

	if c.FilestoreOption == FilestoreOptionInClusterExternal && !c.LocalExternalFileStore.IsValid() {
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
