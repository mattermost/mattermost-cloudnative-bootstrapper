package model

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"sync"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/eks"
	"github.com/aws/aws-sdk-go/service/iam"
	"github.com/aws/aws-sdk-go/service/rds"
	"github.com/aws/aws-sdk-go/service/sts"
	"github.com/mattermost/mattermost-cloud-dash/internal/logger"
	helmclient "github.com/mittwald/go-helm-client"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/cli"
	"k8s.io/client-go/tools/clientcmd"
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

type CreateRDSDatabaseRequest struct {
	DBInstanceIdentifier string `json:"dbInstanceIdentifier"`
	DBName               string `json:"dbName"`
	DBEngine             string `json:"dbEngine"`
	DBEngineVersion      string `json:"dbEngineVersion"`
	DBInstanceClass      string `json:"dbInstanceClass"`
	MasterUsername       string `json:"masterUsername"`
	MasterPassword       string `json:"masterPassword"`
	AllocatedStorage     int64  `json:"allocatedStorage"`
	SubnetGroup          string `json:"subnetGroup"`
}

func (c *CreateRDSDatabaseRequest) ToCreateDBInstanceInput() *rds.CreateDBInstanceInput {
	return &rds.CreateDBInstanceInput{
		DBInstanceIdentifier: aws.String(c.DBInstanceIdentifier),
		DBName:               aws.String(c.DBName),
		Engine:               aws.String(c.DBEngine),
		EngineVersion:        aws.String(c.DBEngineVersion),
		DBInstanceClass:      aws.String(c.DBInstanceClass),
		MasterUsername:       aws.String(c.MasterUsername),
		MasterUserPassword:   aws.String(c.MasterPassword),
		AllocatedStorage:     &c.AllocatedStorage,
		DBSubnetGroupName:    aws.String(c.SubnetGroup),
	}
}

func (c *CreateRDSDatabaseRequest) SetDefaults() {
	c.DBEngine = "postgres"
	c.DBEngineVersion = "13.14"
}

func (c *CreateRDSDatabaseRequest) IsValid() bool {
	if c.DBInstanceIdentifier == "" {
		return false
	}

	if c.DBName == "" {
		return false
	}

	// PGSQL only
	if c.DBEngine != "" {
		return false
	}

	// WE SET THE TERMS FOR THE DB ENGINE VERSION
	if c.DBEngineVersion != "" {
		return false
	}

	if c.DBInstanceClass == "" {
		return false
	}

	if c.MasterUsername == "" {
		return false
	}

	if c.MasterPassword == "" {
		return false
	}

	if c.AllocatedStorage == 0 {
		return false
	}

	if c.SubnetGroup == "" {
		return false
	}

	return true
}

func NewCreateRDSDatabaseRequestFromReader(reader io.Reader) (*CreateRDSDatabaseRequest, error) {
	var createRDSDatabaseRequest CreateRDSDatabaseRequest
	err := json.NewDecoder(reader).Decode(&createRDSDatabaseRequest)
	if err != nil {
		return nil, err
	}
	return &createRDSDatabaseRequest, nil
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

type RDSClient struct {
	RDSClient *rds.RDS
	lock      *sync.Mutex
}

var rdsClient *RDSClient

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
	if awsCreds.AccessKeyID == "" || awsCreds.SecretAccessKey == "" {
		awsCreds = AWSCredentials{
			AccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
			SecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
		}
	}
	return awsCreds
}

func NewRDSClient() *RDSClient {
	if rdsClient == nil {
		awsCredentials := GetAWSCredentials()
		sess, err := session.NewSession(&aws.Config{
			Credentials: credentials.NewStaticCredentials(awsCredentials.AccessKeyID, awsCredentials.SecretAccessKey, ""),
			Region:      aws.String("us-east-1"), // Specify the appropriate AWS region
		})
		if err != nil {
			panic(fmt.Errorf("failed to create session: %v", err))
		}
		rdsClient = &RDSClient{
			RDSClient: rds.New(sess),
			lock:      &sync.Mutex{},
		}
	}

	rdsClient.lock.Lock()
	defer rdsClient.lock.Unlock()
	return rdsClient
}

func NewEKSClient() *EKSClient {
	if eksClient == nil {
		awsCredentials := GetAWSCredentials()
		sess, err := session.NewSession(&aws.Config{
			Credentials: credentials.NewStaticCredentials(awsCredentials.AccessKeyID, awsCredentials.SecretAccessKey, ""),
			Region:      aws.String("us-east-1"), // Specify the appropriate AWS region
		})
		if err != nil {
			panic(fmt.Errorf("failed to create session: %v", err))
		}
		eksClient = &EKSClient{
			EKSClient: eks.New(sess),
			lock:      &sync.Mutex{},
		}
	}

	eksClient.lock.Lock()
	defer eksClient.lock.Unlock()
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

func AuthenticatedHelmClient(c context.Context, clusterName string) (*action.Install, *action.Configuration, *cli.EnvSettings, error) {
	eksClient := NewEKSClient().EKSClient
	result, err := eksClient.DescribeCluster(&eks.DescribeClusterInput{
		Name: aws.String(clusterName),
	})

	if err != nil {
		logger.FromContext(c).WithError(err).Error("Failed to describe EKS cluster")
		return nil, nil, nil, err
	}

	clientConfig, err := BuildHelmConfig(result.Cluster)
	if err != nil {
		logger.FromContext(c).WithError(err).Error("Failed to build helm config")
		return nil, nil, nil, err
	}

	rawConfig, err := clientConfig.RawConfig()
	if err != nil {
		logger.FromContext(c).WithError(err).Error("Failed to get raw config")
		return nil, nil, nil, err
	}

	kubeconfigBytes, err := clientcmd.Write(rawConfig)
	if err != nil {
		logger.FromContext(c).WithError(err).Error("Failed to write kubeconfig")
		return nil, nil, nil, err
	}

	restClientGetter, err := NewRESTClientGetter(string(kubeconfigBytes), "mattermost-operator")
	if err != nil {
		logger.FromContext(c).WithError(err).Error("Failed to create rest client getter")
		return nil, nil, nil, err
	}

	settings := cli.New()
	actionConfig := new(action.Configuration)

	err = actionConfig.Init(restClientGetter, settings.Namespace(), "memory", log.Printf)
	if err != nil {
		logger.FromContext(c).WithError(err).Error("Failed to init action config")
		return nil, nil, nil, err
	}

	installClient := action.NewInstall(actionConfig)
	return installClient, actionConfig, settings, nil
}

func AuthenticatedHelmGoClient(c context.Context, clusterName string, namespace string) (helmclient.Client, error) {
	k8sClient, err := NewK8sClientClusterName(clusterName)

	if err != nil {
		return nil, err
	}

	opt := &helmclient.RestConfClientOptions{
		Options: &helmclient.Options{
			Namespace:        namespace,
			RepositoryCache:  "/tmp/.helmcache",
			RepositoryConfig: "/tmp/.helmrepo",
			Debug:            true,
			Linting:          true, // Change this to false if you don't want linting.
			DebugLog: func(format string, v ...interface{}) {
				logger.FromContext(c).Debug(fmt.Sprintf(format, v...))
			},
		},
		RestConfig: k8sClient.config,
	}

	helmClient, err := helmclient.NewClientFromRestConf(opt)
	if err != nil {
		return nil, err
	}

	return helmClient, nil
}
