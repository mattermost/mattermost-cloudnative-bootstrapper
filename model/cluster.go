package model

import (
	"encoding/json"
	"io"
	"time"
)

type ClusterStatus string

const (
	ClusterStatusCreating ClusterStatus = "CREATING"
	ClusterStatusActive   ClusterStatus = "ACTIVE"
	ClusterStatusDeleting ClusterStatus = "DELETING"
	ClusterStatusFailed   ClusterStatus = "FAILED"
	ClusterStatusUpdating ClusterStatus = "UPDATING"
)

// TODO: Add conversion methods to go from aws/gcp/azure structs to this struct
// TODO: Add fields to Cluster struct, ensure it's used for returns in ListClusters, GetCluster, CreateCluster, etc.
type Cluster struct {
	Arn                *string            `json:"Arn,omitempty"`
	ClientRequestToken *string            `json:"ClientRequestToken,omitempty"`
	CreatedAt          *time.Time         `json:"CreatedAt,omitempty"`
	Endpoint           *string            `json:"Endpoint,omitempty"`
	Id                 *string            `json:"Id,omitempty"`
	Name               *string            `json:"Name,omitempty"`
	PlatformVersion    *string            `json:"PlatformVersion,omitempty"`
	RoleArn            *string            `json:"RoleArn,omitempty"`
	Status             ClusterStatus      `json:"Status,omitempty"`
	Tags               map[string]*string `json:"Tags,omitempty"`
	Version            *string            `json:"Version,omitempty"`
}

// TODO: Add conversion methods to go from aws/gcp/azure structs to this struct
// TODO: Add fields to ClusterNodeGroup struct, ensure it's used for returns in GetNodegroups
type ClusterNodegroup struct {
	AmiType         *string            `json:"AmiType,omitempty"`
	ClusterName     *string            `json:"ClusterName,omitempty"`
	CreationRoleArn *string            `json:"CreationRoleArn,omitempty"`
	InstanceTypes   []*string          `json:"InstanceTypes,omitempty"`
	Labels          map[string]*string `json:"Labels,omitempty"`
	NodegroupName   *string            `json:"NodegroupName,omitempty"`
	ReleaseVersion  *string            `json:"ReleaseVersion,omitempty"`
	RemoteAccess    map[string]*string `json:"RemoteAccess,omitempty"`
	ScalingConfig   map[string]*string `json:"ScalingConfig,omitempty"`
	Status          ClusterStatus      `json:"Status,omitempty"`
	Tags            map[string]*string `json:"Tags,omitempty"`
	UpdatedAt       *time.Time         `json:"UpdatedAt,omitempty"`
	SubnetIds       []*string          `json:"subnetIds"`
	NodeRole        *string            `json:"NodeRole"`
}

// TODO: Change AWSCredentials to Credentials
type Credentials struct {
	AccessKeyID     string `json:"accessKeyID"`
	SecretAccessKey string `json:"accessKeySecret"`
	Kubecfg         string `json:"kubecfg"`
}

// TODO: Change AWSCredentialsResponse to CredentialsResponse
type CredentialsResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// TODO: Change CreateEKSClusterRequest to CreateClusterRequest
type CreateClusterRequest struct {
	ClusterName       *string   `json:"clusterName"`
	RoleARN           *string   `json:"roleArn"`
	KubernetesVersion *string   `json:"kubernetesVersion"`
	SecurityGroupIDs  []*string `json:"securityGroupIds"`
	SubnetIDs         []*string `json:"subnetIds"`
}

type PolicyDocument struct {
	Statement []StatementEntry
}

type StatementEntry struct {
	Effect    string
	Action    string
	Principal map[string]string
}

// TODO: Change EKSSupportedRolesResponse to SupportedRolesResponse
type SupportedRolesResponse struct {
	RoleName string `json:"roleName"`
	Arn      string `json:"arn"`
}

type CreateNodegroupRequest struct {
	ClusterName    string            `json:"clusterName"`
	NodegroupName  string            `json:"nodeGroupName"`
	InstanceType   string            `json:"instanceType"`
	ScalingConfig  ScalingConfig     `json:"scalingConfig"`
	AMIType        string            `json:"amiType"`
	ReleaseVersion string            `json:"releaseVersion"`
	Labels         map[string]string `json:"labels"`
	Tags           map[string]string `json:"tags"`
	SubnetIDs      []string          `json:"subnetIds"`
	RoleARN        string            `json:"nodeRole"`
}

// Nested type for scaling configuration
type ScalingConfig struct {
	MinSize int64 `json:"minSize"`
	MaxSize int64 `json:"maxSize"`
}

type InstalledReleases struct {
	Name      string
	Version   string
	Namespace string
	Status    string
}

func NewCreateNodeGroupRequestFromReader(reader io.Reader) (*CreateNodegroupRequest, error) {
	var createNodeGroupRequest CreateNodegroupRequest
	err := json.NewDecoder(reader).Decode(&createNodeGroupRequest)
	if err != nil {
		return nil, err
	}
	return &createNodeGroupRequest, nil
}

func NewCreateClusterRequestFromReader(reader io.Reader) (*CreateClusterRequest, error) {
	var createClusterRequest CreateClusterRequest
	err := json.NewDecoder(reader).Decode(&createClusterRequest)
	if err != nil {
		return nil, err
	}
	return &createClusterRequest, nil
}
