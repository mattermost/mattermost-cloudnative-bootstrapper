package model

import (
	"encoding/json"
	"fmt"
	"io"
	"sync"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/eks"
	"github.com/aws/aws-sdk-go/service/iam"
	"github.com/aws/aws-sdk-go/service/sts"
)

// Define a struct to hold AWS credentials
type AWSCredentials struct {
	AccessKeyID     string `json:"accessKeyID"`
	SecretAccessKey string `json:"accessKeySecret"`
}

type AWSCredentialsResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type CreateEKSClusterRequest struct {
	ClusterName       *string   `json:"clusterName"`
	RoleARN           *string   `json:"roleArn"`
	KubernetesVersion *string   `json:"kubernetesVersion"`
	SecurityGroupIDs  []*string `json:"securityGroupIds"`
	SubnetIDs         []*string `json:"subnetIds"`
}

func NewCreateEKSClusterRequestFromReader(reader io.Reader) (*CreateEKSClusterRequest, error) {
	var createEKSClusterRequest CreateEKSClusterRequest
	err := json.NewDecoder(reader).Decode(&createEKSClusterRequest)
	if err != nil {
		return nil, err
	}
	return &createEKSClusterRequest, nil
}

// Global variable to store AWS credentials
var awsCreds AWSCredentials
var lock = &sync.Mutex{}

type EKSClient struct {
	EKSClient *eks.EKS
	lock      *sync.Mutex
}

var eksClient *EKSClient

// Function to set AWS credentials
func SetAWSCredentials(accessKeyID, secretAccessKey string) {
	lock.Lock()
	defer lock.Unlock()
	awsCreds = AWSCredentials{
		AccessKeyID:     accessKeyID,
		SecretAccessKey: secretAccessKey,
	}
}

// Function to get AWS credentials
func GetAWSCredentials() AWSCredentials {
	lock.Lock()
	defer lock.Unlock()
	return awsCreds
}

func NewEKSClient() *EKSClient {
	lock.Lock()
	defer lock.Unlock()
	// if eksClient == nil {
	// awsCredentials := GetAWSCredentials()
	// fmt.Println(awsCredentials)
	sess, err := session.NewSession(&aws.Config{
		// Credentials: credentials.NewStaticCredentials(awsCredentials.AccessKeyID, awsCredentials.SecretAccessKey, ""),
		Region: aws.String("us-east-1"), // Specify the appropriate AWS region
	})
	if err != nil {
		panic(fmt.Errorf("failed to create session: %v", err))
	}
	eksClient = &EKSClient{
		EKSClient: eks.New(sess),
		lock:      &sync.Mutex{},
	}
	// }
	return eksClient
}

func GetEKSClient() *EKSClient {
	lock.Lock()
	defer lock.Unlock()
	return eksClient
}

// Validates AWS credentials and checks for EKS permissions
func ValidateAWSCredentials(accessKeyID, secretAccessKey string) (bool, error) {
	// Create a new session with the provided credentials
	sess, err := session.NewSession(&aws.Config{
		Credentials: credentials.NewStaticCredentials(accessKeyID, secretAccessKey, ""),
		Region:      aws.String("us-east-1"), // Specify the appropriate AWS region
		// LogLevel:    aws.LogLevel(aws.LogDebugWithHTTPBody),
	})
	if err != nil {
		return false, fmt.Errorf("failed to create session: %v", err)
	}

	// Create an STS client to verify credentials
	stsClient := sts.New(sess)
	_, err = stsClient.GetCallerIdentity(&sts.GetCallerIdentityInput{})
	if err != nil {
		return false, fmt.Errorf("failed to validate credentials: %v", err)
	}

	// Create an EKS client to check for EKS-specific permissions
	eksClient := eks.New(sess)
	_, err = eksClient.ListClusters(&eks.ListClustersInput{})
	if err != nil {
		// If the credentials are valid but do not have EKS permissions, handle accordingly
		return false, fmt.Errorf("credentials valid but lack EKS permissions: %v", err)
	}

	// If no errors, credentials are valid and have EKS permissions
	return true, nil
}

type PolicyDocument struct {
	Statement []StatementEntry
}

type StatementEntry struct {
	Effect    string
	Action    string
	Principal map[string]string
}

type EKSSupportedRoleResponse struct {
	RoleName string `json:"roleName"`
	Arn      string `json:"arn"`
}

func ToEKSSupportedRoleResponse(roles []*iam.Role) []*EKSSupportedRoleResponse {
	var supportedRoles []*EKSSupportedRoleResponse
	for _, role := range roles {
		supportedRoles = append(supportedRoles, &EKSSupportedRoleResponse{
			RoleName: *role.RoleName,
			Arn:      *role.Arn,
		})
	}
	return supportedRoles
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

func NewCreateNodeGroupRequestFromReader(reader io.Reader) (*CreateNodegroupRequest, error) {
	var createNodeGroupRequest CreateNodegroupRequest
	err := json.NewDecoder(reader).Decode(&createNodeGroupRequest)
	if err != nil {
		return nil, err
	}
	return &createNodeGroupRequest, nil
}
