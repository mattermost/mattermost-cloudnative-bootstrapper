package model

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
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

const (
	DatabaseOptionCreateForMe = "CreateForMeCNPG"
	DatabaseOptionExisting    = "Existing"
)

const (
	SecretNameFilestore         = "filestore"
	SecretNameDatabase          = "database"
	SecretNameMattermostLicense = "mattermost-license"
)

const (
	MMENVLicense = "MM_LICENSE"
)

type CreateMattermostWorkspaceRequest struct {
	License                string                  `json:"enterpriseLicense"` // For the license file contents
	InstallationName       string                  `json:"installationName"`
	Size                   string                  `json:"size"` // Size for the Mattermost instance
	FullDomainName         string                  `json:"domainName"`
	Version                string                  `json:"version"`
	DBConnectionOption     string                  `json:"dbConnectionOption"`
	ExistingDBConnection   *ExistingDBConnection   `json:"existingDatabaseConfig"`
	ExistingDBSecretName   string                  `json:"existingDatabaseSecretName"`
	FilestoreOption        string                  `json:"filestoreOption"`
	S3Filestore            *S3Filestore            `json:"s3FilestoreConfig"`
	FilestoreSecretName    string                  `json:"filestoreSecretName"`
	LocalFileStore         *LocalFileStore         `json:"localFilestoreConfig"`
	LocalExternalFileStore *LocalExternalFileStore `json:"localExternalFilestoreConfig"`
}

type ExistingDBConnection struct {
	ConnectionString        string `json:"dbConnectionString"`
	ReplicaConnectionString string `json:"dbReplicasConnectionString"`
}

type LocalFileStore struct {
	StorageSize string `json:"storageSize"`
}

type S3Filestore struct {
	BucketURL  string `json:"url"`
	BucketName string `json:"bucket"`
	AccessKey  string `json:"accessKeyId"`
	SecretKey  string `json:"accessKeySecret"`
}

type LocalExternalFileStore struct {
	VolumeClaimName string `json:"volumeClaimName,omitempty"`
}

type InstallationSecrets struct {
	DatabaseSecret  *v1.Secret `json:"databaseSecret"`
	FilestoreSecret *v1.Secret `json:"filestoreSecret"`
	LicenseSecret   *v1.Secret `json:"licenseSecret"`
}

type InstallationSecretsResponse struct {
	DatabaseSecret  InstallationSecretData `json:"databaseSecret"`
	FilestoreSecret InstallationSecretData `json:"filestoreSecret"`
	LicenseSecret   InstallationSecretData `json:"licenseSecret"`
}

type InstallationSecretData struct {
	Data map[string]string `json:"data,omitempty" protobuf:"bytes,2,rep,name=data"`
}

func KubeS3FilestoreSecretToS3Filestore(secret *v1.Secret, filestore *mmv1beta1.FileStore) *S3Filestore {
	return &S3Filestore{
		BucketURL:  filestore.External.URL,
		BucketName: filestore.External.Bucket,
		AccessKey:  string(secret.Data["accesskey"]),
		SecretKey:  string(secret.Data["secretkey"]),
	}
}

func (is *InstallationSecrets) ToInstallationSecretsResponse() (*InstallationSecretsResponse, error) {
	installationSecretsResponse := &InstallationSecretsResponse{
		DatabaseSecret: InstallationSecretData{
			Data: map[string]string{},
		},
		FilestoreSecret: InstallationSecretData{
			Data: map[string]string{},
		},
		LicenseSecret: InstallationSecretData{
			Data: map[string]string{},
		},
	}
	for k, secret := range is.DatabaseSecret.Data {
		installationSecretsResponse.DatabaseSecret.Data[k] = string(secret)
	}

	for k, secret := range is.FilestoreSecret.Data {
		installationSecretsResponse.FilestoreSecret.Data[k] = string(secret)
	}

	for k, secret := range is.LicenseSecret.Data {
		installationSecretsResponse.LicenseSecret.Data[k] = string(secret)
	}

	return installationSecretsResponse, nil

}

func (le *LocalExternalFileStore) IsValid() bool {
	return le.VolumeClaimName != ""
}

func (l *LocalFileStore) IsValid() bool {
	return l.StorageSize != ""
}

func (e *ExistingDBConnection) IsValid() bool {
	if e.ConnectionString == "" {
		return false
	}

	if e.ReplicaConnectionString == "" {
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
	if c.FilestoreSecretName != "" {
		return nil
	}
	if c.FilestoreOption == FilestoreOptionExistingS3 {
		return &v1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      SecretNameFilestore,
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
		filestore.External = &mmv1beta1.ExternalFileStore{}
		if c.S3Filestore != nil {
			filestore.External.URL = c.S3Filestore.BucketURL
			filestore.External.Bucket = c.S3Filestore.BucketName
		}
		if secret != nil {
			filestore.External.Secret = secret.Name
		} else if c.FilestoreSecretName != "" {
			filestore.External.Secret = c.FilestoreSecretName
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
	Version        string                           `json:"version"`
	Name           string                           `json:"name"`
	Image          string                           `json:"image"`
	Replicas       int                              `json:"replicas"`
	License        *string                          `json:"license"`
	Endpoint       string                           `json:"endpoint"`
	FilestorePatch *PatchMattermostFilestoreRequest `json:"fileStorePatch"`
	DatabasePatch  *PatchMattermostDatabaseRequest  `json:"databasePatch"`
	MattermostEnv  []v1.EnvVar                      `json:"mattermostEnv"`
}

type PatchMattermostFilestoreRequest struct {
	FilestoreOption        string                  `json:"filestoreOption"`
	S3Filestore            *S3Filestore            `json:"s3FilestoreConfig"`
	LocalFileStore         *LocalFileStore         `json:"localFilestoreConfig"`
	LocalExternalFileStore *LocalExternalFileStore `json:"localExternalFilestoreConfig"`
}

type PatchMattermostDatabaseRequest struct {
	ExistingDBConnection
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
	if !isValidSemanticVersion(req.Version) && !isValidReleaseBranchTag(req.Version) {
		return false
	}

	// Add additional validation rules here as needed

	return true
}

func (req *PatchMattermostWorkspaceRequest) HasFilestoreChanges() bool {
	return req.FilestorePatch != nil && (req.FilestorePatch.FilestoreOption != "" && (req.FilestorePatch.S3Filestore != nil || req.FilestorePatch.LocalFileStore != nil || req.FilestorePatch.LocalExternalFileStore != nil))
}

func isValidReleaseBranchTag(tag string) bool {
	// Regular expression pattern for release branch tag (e.g., release-5.0)
	pattern := `^release-\d+\.\d+$`
	match, err := regexp.MatchString(pattern, tag)
	return err == nil && match
}

// isValidSemanticVersion checks if the provided string is a valid semantic version.
func isValidSemanticVersion(version string) bool {
	// Regular expression pattern for semantic versioning (e.g., 1.0.0 or 10.12)
	// Supports both X.Y.Z and X.Y formats
	pattern := `^\d+\.\d+(\.\d+)?$`
	match, err := regexp.MatchString(pattern, version)
	return err == nil && match
}

func (c *CreateMattermostWorkspaceRequest) IsValid() bool {

	if c.InstallationName == "" {
		return false
	}

	if c.FullDomainName == "" {
		return false
	}

	if c.FilestoreOption == "" {
		return false
	}

	if c.FilestoreOption == FilestoreOptionExistingS3 && c.FilestoreSecretName == "" && (c.S3Filestore == nil || !c.S3Filestore.IsValid()) {
		return false
	}

	if c.FilestoreOption == FilestoreOptionInClusterLocal && !c.LocalFileStore.IsValid() {
		return false
	}

	if c.FilestoreOption == FilestoreOptionInClusterExternal && !c.LocalExternalFileStore.IsValid() {
		return false
	}

	if c.DBConnectionOption != DatabaseOptionCreateForMe && c.DBConnectionOption != DatabaseOptionExisting {
		return false
	}

	if c.DBConnectionOption == DatabaseOptionExisting && c.ExistingDBSecretName == "" && (c.ExistingDBConnection == nil || !c.ExistingDBConnection.IsValid()) {
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

func GetLicenseSecretName(installation *mmv1beta1.Mattermost) string {
	for _, envVar := range installation.Spec.MattermostEnv {
		if envVar.Name == MMENVLicense {
			return envVar.ValueFrom.SecretKeyRef.LocalObjectReference.Name
		}
	}

	return ""
}

// generateCILicenseName generates a unique license secret name by using a short
// sha256 hash.
func generateLicenseSecretName(license string) string {
	return fmt.Sprintf("%s-%s",
		SecretNameMattermostLicense,
		fmt.Sprintf("%x", sha256.Sum256([]byte(license)))[0:6],
	)
}

func NewMattermostLicenseSecret(namespaceName string, license string) *v1.Secret {
	return &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      generateLicenseSecretName(license),
			Namespace: namespaceName,
		},
		Type: v1.SecretTypeOpaque,
		StringData: map[string]string{
			"license": license,
		},
	}
}
