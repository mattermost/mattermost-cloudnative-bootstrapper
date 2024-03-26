package providers

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"os"
	"sync"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/eks"
	"github.com/aws/aws-sdk-go/service/iam"
	"github.com/aws/aws-sdk-go/service/sts"
	"github.com/mattermost/mattermost-cloud-dash/internal/logger"
	"github.com/mattermost/mattermost-cloud-dash/model"
	mmclientv1alpha1 "github.com/mattermost/mattermost-operator/pkg/client/clientset/versioned"
	mmclientv1beta1 "github.com/mattermost/mattermost-operator/pkg/client/v1beta1/clientset/versioned"
	helmclient "github.com/mittwald/go-helm-client"
	apixclient "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"sigs.k8s.io/aws-iam-authenticator/pkg/token"
)

type AWSProvider struct {
	Credentials     *model.Credentials
	credentialsLock *sync.Mutex
	EKSClient       *EKSClient
}

type EKSClient struct {
	Client *eks.EKS
	lock   *sync.Mutex
	once   *sync.Once
}

var awsProviderInstance *AWSProvider
var awsClientOnce sync.Once

func GetAWSProvider() *AWSProvider {
	awsClientOnce.Do(func() {
		credentials := &model.Credentials{
			AccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
			SecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
		}
		awsProviderInstance = &AWSProvider{
			Credentials:     credentials,
			credentialsLock: &sync.Mutex{},
		}
	})
	return awsProviderInstance
}

func (a *AWSProvider) GetAWSCredentials() model.Credentials {
	a.credentialsLock.Lock()
	defer a.credentialsLock.Unlock()
	if a.Credentials.AccessKeyID == "" || a.Credentials.SecretAccessKey == "" {
		return model.Credentials{
			AccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
			SecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
		}
	}
	return *a.Credentials
}

func (a *AWSProvider) NewEKSClient() *EKSClient {
	var eksClient *eks.EKS
	once := &sync.Once{}
	lock := &sync.Mutex{}

	if a.EKSClient != nil {
		once = a.EKSClient.once
		lock = a.EKSClient.lock
	}

	once.Do(func() {
		awsCredentials := a.GetAWSCredentials()
		sess, err := session.NewSession(&aws.Config{
			Credentials: credentials.NewStaticCredentials(awsCredentials.AccessKeyID, awsCredentials.SecretAccessKey, ""),
			Region:      aws.String("us-east-1"), // Specify the appropriate AWS region
		})
		if err != nil {
			panic(fmt.Errorf("failed to create session: %v", err))
		}
		eksClient = eks.New(sess)
		a.EKSClient = &EKSClient{
			Client: eksClient,
			once:   once,
			lock:   lock,
		}
	})

	return a.EKSClient
}

func (a *AWSProvider) SetCredentials(c context.Context, credentials *model.Credentials) error {
	a.credentialsLock.Lock()
	a.Credentials = credentials
	a.credentialsLock.Unlock()
	a.NewEKSClient()

	return nil
}

func (a *AWSProvider) ValidateCredentials(creds *model.Credentials) (bool, error) {
	// Create a new session with the provided credentials
	sess, err := session.NewSession(&aws.Config{
		Credentials: credentials.NewStaticCredentials(creds.AccessKeyID, creds.SecretAccessKey, ""),
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

func (a *AWSProvider) ListRoles(c context.Context) ([]*model.SupportedRolesResponse, error) {
	awsCredentials := a.GetAWSCredentials()

	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String("us-east-1"), // Specify the appropriate AWS region
		Credentials: credentials.NewStaticCredentials(awsCredentials.AccessKeyID, awsCredentials.SecretAccessKey, ""),
	})

	if err != nil {
		return nil, err
	}

	svc := iam.New(sess)

	eksSupportedRoles := []*iam.Role{}
	// List IAM roles
	input := &iam.ListRolesInput{}
	err = svc.ListRolesPages(input, func(page *iam.ListRolesOutput, lastPage bool) bool {
		for _, role := range page.Roles {
			// TODO Filter down to only those roles that have permission?

			eksSupportedRoles = append(eksSupportedRoles, role)
		}
		return !lastPage
	})
	if err != nil {
		log.Fatalf("Error listing roles: %v", err)
	}

	return eksSupportedRolesToSupportedRoleResponse(eksSupportedRoles), nil
}

func (a *AWSProvider) ListClusters(c context.Context) ([]*string, error) {
	eksClient := a.NewEKSClient().Client
	result, err := eksClient.ListClusters(&eks.ListClustersInput{})
	if err != nil {
		return nil, err
	}

	return result.Clusters, nil
}

func (a *AWSProvider) CreateCluster(c context.Context, create *model.CreateClusterRequest) (*model.Cluster, error) {
	eksClient := a.NewEKSClient().Client

	input := &eks.CreateClusterInput{
		ClientRequestToken: aws.String("1d2129a1-3d38-460a-9756-e5b91fddb951"),
		Name:               create.ClusterName,
		ResourcesVpcConfig: &eks.VpcConfigRequest{
			SecurityGroupIds:      create.SecurityGroupIDs,
			SubnetIds:             create.SubnetIDs,
			EndpointPublicAccess:  aws.Bool(false),
			EndpointPrivateAccess: aws.Bool(true),
		},
		RoleArn: create.RoleARN,
		Version: create.KubernetesVersion,
	}

	result, err := eksClient.CreateCluster(input)
	if err != nil {
		if aerr, ok := err.(awserr.Error); ok {
			switch aerr.Code() {
			case eks.ErrCodeResourceInUseException:
				logger.FromContext(c).Error(eks.ErrCodeResourceInUseException, aerr.Error())
			case eks.ErrCodeResourceLimitExceededException:
				logger.FromContext(c).Error(eks.ErrCodeResourceLimitExceededException, aerr.Error())
			case eks.ErrCodeInvalidParameterException:
				logger.FromContext(c).Error(eks.ErrCodeInvalidParameterException, aerr.Error())
			case eks.ErrCodeClientException:
				logger.FromContext(c).Error(eks.ErrCodeClientException, aerr.Error())
			case eks.ErrCodeServerException:
				logger.FromContext(c).Error(eks.ErrCodeServerException, aerr.Error())
			case eks.ErrCodeServiceUnavailableException:
				logger.FromContext(c).Error(eks.ErrCodeServiceUnavailableException, aerr.Error())
			case eks.ErrCodeUnsupportedAvailabilityZoneException:
				logger.FromContext(c).Error(eks.ErrCodeUnsupportedAvailabilityZoneException, aerr.Error())
			default:
				logger.FromContext(c).Error(aerr.Error())
			}
		} else {
			// Print the error, cast err to awserr.Error to get the Code and
			// Message from an error.
			logger.FromContext(c).Error(err.Error())
		}
		return nil, errors.New("received an unknown error while creating cluster")
	}
	return aWSClusterToCluster(result.Cluster), nil
}

func (a *AWSProvider) GetCluster(c context.Context, name string) (*model.Cluster, error) {
	eksClient := a.NewEKSClient().Client

	result, err := eksClient.DescribeCluster(&eks.DescribeClusterInput{
		Name: aws.String(name),
	})
	if err != nil {
		return nil, err
	}

	return aWSClusterToCluster(result.Cluster), nil
}

func (a *AWSProvider) GetNodegroups(c context.Context, clusterName string) ([]*model.ClusterNodegroup, error) {
	eksClient := a.NewEKSClient().Client

	result, err := eksClient.ListNodegroups(&eks.ListNodegroupsInput{
		ClusterName: aws.String(clusterName),
	})

	if err != nil {
		return nil, err
	}

	nodegroups := []*model.ClusterNodegroup{}

	for _, nodeGroupName := range result.Nodegroups {
		describeNodeGroupInput := &eks.DescribeNodegroupInput{
			ClusterName:   aws.String(clusterName),
			NodegroupName: nodeGroupName,
		}

		nodeGroupResult, err := eksClient.DescribeNodegroup(describeNodeGroupInput)
		if err != nil {
			logger.FromContext(c).WithError(err).Error("Failed to describe EKS node group")
			continue
		}

		nodegroups = append(nodegroups, awsNodegroupToNodegroup(nodeGroupResult.Nodegroup))
	}

	return nodegroups, nil
}

func (a *AWSProvider) CreateNodegroup(c context.Context, name string, create *model.CreateNodegroupRequest) (*model.ClusterNodegroup, error) {
	eksClient := a.NewEKSClient().Client

	instanceTypes := []*string{&create.InstanceType}

	input := &eks.CreateNodegroupInput{
		ClusterName:   aws.String(name),
		NodegroupName: aws.String(create.NodegroupName),
		InstanceTypes: instanceTypes,
		ScalingConfig: &eks.NodegroupScalingConfig{
			MaxSize:     aws.Int64(create.ScalingConfig.MaxSize),
			MinSize:     aws.Int64(create.ScalingConfig.MinSize),
			DesiredSize: aws.Int64(2),
		},
		NodeRole: aws.String(create.RoleARN),
		Subnets:  aws.StringSlice(create.SubnetIDs),
	}

	result, err := eksClient.CreateNodegroup(input)
	if err != nil {
		if aerr, ok := err.(awserr.Error); ok {
			switch aerr.Code() {
			case eks.ErrCodeResourceInUseException:
				logger.FromContext(c).Error(eks.ErrCodeResourceInUseException, aerr.Error())
			case eks.ErrCodeResourceLimitExceededException:
				logger.FromContext(c).Error(eks.ErrCodeResourceLimitExceededException, aerr.Error())
			case eks.ErrCodeInvalidParameterException:
				logger.FromContext(c).Error(eks.ErrCodeInvalidParameterException, aerr.Error())
			case eks.ErrCodeClientException:
				logger.FromContext(c).Error(eks.ErrCodeClientException, aerr.Error())
			case eks.ErrCodeServerException:
				logger.FromContext(c).Error(eks.ErrCodeServerException, aerr.Error())
			case eks.ErrCodeServiceUnavailableException:
				logger.FromContext(c).Error(eks.ErrCodeServiceUnavailableException, aerr.Error())
			case eks.ErrCodeUnsupportedAvailabilityZoneException:
				logger.FromContext(c).Error(eks.ErrCodeUnsupportedAvailabilityZoneException, aerr.Error())
			default:
				logger.FromContext(c).Error(aerr.Error())
			}
		} else {
			// Print the error, cast err to awserr.Error to get
			logger.FromContext(c).Error(err.Error())
		}
		return nil, errors.New("error while creating nodegroup")
	}

	return awsNodegroupToNodegroup(result.Nodegroup), nil
}

func (a *AWSProvider) GetKubeRestConfig(c context.Context, clusterName string) (*rest.Config, error) {
	eksClient := a.NewEKSClient().Client

	result, err := eksClient.DescribeCluster(&eks.DescribeClusterInput{
		Name: aws.String(clusterName),
	})
	if err != nil {
		return nil, err
	}

	cluster := result.Cluster

	gen, err := token.NewGenerator(true, false)
	if err != nil {
		return nil, err
	}
	opts := &token.GetTokenOptions{
		ClusterID: aws.StringValue(cluster.Name),
	}
	tok, err := gen.GetWithOptions(opts)
	if err != nil {
		return nil, err
	}
	ca, err := base64.StdEncoding.DecodeString(aws.StringValue(cluster.CertificateAuthority.Data))
	if err != nil {
		return nil, err
	}

	config := &rest.Config{
		Host:        aws.StringValue(cluster.Endpoint),
		BearerToken: tok.Token,
		TLSClientConfig: rest.TLSClientConfig{
			CAData: ca,
		},
	}

	return config, nil
}

func (a *AWSProvider) GetKubeConfig(c context.Context, clusterName string) (clientcmd.ClientConfig, error) {
	eksClient := a.NewEKSClient().Client
	logger.FromContext(c).Errorf("eksClient: %s", clusterName)
	result, err := eksClient.DescribeCluster(&eks.DescribeClusterInput{
		Name: aws.String(clusterName),
	})
	if err != nil {
		return nil, err
	}

	cluster := result.Cluster

	gen, err := token.NewGenerator(true, false)
	if err != nil {
		return nil, err
	}
	opts := &token.GetTokenOptions{
		ClusterID: aws.StringValue(cluster.Name),
	}
	tok, err := gen.GetWithOptions(opts)
	if err != nil {
		return nil, err
	}
	ca, err := base64.StdEncoding.DecodeString(aws.StringValue(cluster.CertificateAuthority.Data))
	if err != nil {
		return nil, err
	}

	config := api.NewConfig()
	config.Clusters[aws.StringValue(cluster.Name)] = &api.Cluster{
		Server:                   aws.StringValue(cluster.Endpoint),
		CertificateAuthorityData: ca,
	}

	config.AuthInfos[aws.StringValue(cluster.Name)] = &api.AuthInfo{
		Token: tok.Token,
	}

	config.Contexts[aws.StringValue(cluster.Name)] = &api.Context{
		Cluster:  aws.StringValue(cluster.Name),
		AuthInfo: aws.StringValue(cluster.Name),
	}

	config.CurrentContext = aws.StringValue(cluster.Name)

	clientConfig := clientcmd.NewDefaultClientConfig(*config, &clientcmd.ConfigOverrides{})

	if err != nil {
		return nil, err
	}

	return clientConfig, nil
}

func (a *AWSProvider) KubeClient(c context.Context, clusterName string) (*model.KubeClient, error) {

	config, err := a.GetKubeRestConfig(c, clusterName)
	if err != nil {
		return nil, err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	mattermostV1AlphaClientset, err := mmclientv1alpha1.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	mattermostV1BetaClientset, err := mmclientv1beta1.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	return &model.KubeClient{
		Config:                     config,
		Clientset:                  clientset,
		ApixClientset:              apixclient.NewForConfigOrDie(config),
		MattermostClientsetV1Alpha: mattermostV1AlphaClientset,
		MattermostClientsetV1Beta:  mattermostV1BetaClientset,
		DynamicClient:              dynamicClient,
	}, nil
}

func (a *AWSProvider) HelmClient(c context.Context, clusterName string, namespace string) (helmclient.Client, error) {
	k8sClient, err := a.KubeClient(c, clusterName)
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
		RestConfig: k8sClient.Config,
	}

	helmClient, err := helmclient.NewClientFromRestConf(opt)
	if err != nil {
		return nil, err
	}

	return helmClient, nil
}

func eksSupportedRolesToSupportedRoleResponse(roles []*iam.Role) []*model.SupportedRolesResponse {
	var supportedRoles []*model.SupportedRolesResponse
	for _, role := range roles {
		supportedRoles = append(supportedRoles, &model.SupportedRolesResponse{
			RoleName: *role.RoleName,
			Arn:      *role.Arn,
		})
	}
	return supportedRoles
}

func aWSClusterToCluster(awsCluster *eks.Cluster) *model.Cluster {
	cluster := &model.Cluster{
		Arn:                awsCluster.Arn,
		ClientRequestToken: awsCluster.ClientRequestToken,
		CreatedAt:          awsCluster.CreatedAt,
		Endpoint:           awsCluster.Endpoint,
		Id:                 awsCluster.Id,
		Name:               awsCluster.Name,
		PlatformVersion:    awsCluster.PlatformVersion,
		RoleArn:            awsCluster.RoleArn,
		Tags:               awsCluster.Tags,
		Version:            awsCluster.Version,
	}

	if awsCluster.Status != nil {
		cluster.Status = model.ClusterStatus(*awsCluster.Status)
	}

	return cluster
}

func awsNodegroupToNodegroup(awsNodegroup *eks.Nodegroup) *model.ClusterNodegroup {
	nodegroup := &model.ClusterNodegroup{
		AmiType:        awsNodegroup.AmiType,
		ClusterName:    awsNodegroup.ClusterName,
		InstanceTypes:  awsNodegroup.InstanceTypes,
		Labels:         awsNodegroup.Labels,
		NodegroupName:  awsNodegroup.NodegroupName,
		ReleaseVersion: awsNodegroup.ReleaseVersion,
		Tags:           awsNodegroup.Tags,
		SubnetIds:      awsNodegroup.Subnets,
		NodeRole:       awsNodegroup.NodeRole,
	}

	if awsNodegroup.Status != nil {
		nodegroup.Status = model.ClusterStatus(*awsNodegroup.Status)
	}

	return nodegroup
}
