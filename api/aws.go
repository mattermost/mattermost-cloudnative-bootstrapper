package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/eks"
	"github.com/aws/aws-sdk-go/service/iam"
	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-cloud-dash/internal/logger"
	"github.com/mattermost/mattermost-cloud-dash/model"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/cli"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/clientcmd"
)

func initAWS(apiRouter *mux.Router, context *Context) {
	addContext := func(handler contextHandlerFunc) *contextHandler {
		return newContextHandler(context, handler)
	}

	awsRouter := apiRouter.PathPrefix("/aws").Subrouter()
	// awsRouter.Handle("/list", addContext(handleListAWS)).Methods(http.MethodGet)
	awsRouter.Handle("/set_credentials", addContext(handleSetAWSCredentials)).Methods(http.MethodPost)
	awsRouter.Handle("/eks_roles", addContext(handleListEKSRoles)).Methods(http.MethodGet)
	awsRouter.Handle("/eks_create", addContext(handleCreateEKS)).Methods(http.MethodPost)
	awsRouter.Handle("/eks_cluster/{name:[A-Za-z0-9_-]+}", addContext(handleGetEKS)).Methods(http.MethodGet)
	awsRouter.Handle("/eks_cluster/{name:[A-Za-z0-9_-]+}/nodegroups", addContext(handleGetEKSNodeGroups)).Methods(http.MethodGet)
	awsRouter.Handle("/eks_cluster/{name:[A-Za-z0-9_-]+}/nodegroups", addContext(handleCreateNodeGroup)).Methods(http.MethodPost)
	awsRouter.Handle("/eks_cluster/{name:[A-Za-z0-9_-]+}/kubeconfig", addContext(handleGetEKSKubeConfig)).Methods(http.MethodGet)
	awsRouter.Handle("/eks_cluster/{name:[A-Za-z0-9_-]+}/deploy_mattermost_operator", addContext(handleDeployMattermostOperator)).Methods(http.MethodPost)
	awsRouter.Handle("/eks_cluster/{name:[A-Za-z0-9_-]+}/namespaces", addContext(handleGetClusterNamespaces)).Methods(http.MethodGet)
}

func handleSetAWSCredentials(c *Context, w http.ResponseWriter, r *http.Request) {
	var awsCredentials model.AWSCredentials
	json.NewDecoder(r.Body).Decode(&awsCredentials)
	response := model.AWSCredentialsResponse{}
	model.SetAWSCredentials(awsCredentials.AccessKeyID, awsCredentials.SecretAccessKey)
	success, err := model.ValidateAWSCredentials(awsCredentials.AccessKeyID, awsCredentials.SecretAccessKey)
	response.Success = success
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to validate AWS credentials")
		response.Message = err.Error()
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(response)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func handleListEKSRoles(c *Context, w http.ResponseWriter, r *http.Request) {

	sess, err := session.NewSession(&aws.Config{
		Region: aws.String("us-east-1"), // Change to your preferred region
	})
	if err != nil {
		log.Fatalf("Error creating session: %v", err)
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

	roles := model.ToEKSSupportedRoleResponse(eksSupportedRoles)

	json.NewEncoder(w).Encode(roles)
}

func handleCreateEKS(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Creating EKS cluster")

	create, err := model.NewCreateEKSClusterRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse create EKS cluster request")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	input := &eks.CreateClusterInput{
		ClientRequestToken: aws.String("1d2129a1-3d38-460a-9756-e5b91fddb951"),
		Name:               create.ClusterName,
		ResourcesVpcConfig: &eks.VpcConfigRequest{
			SecurityGroupIds: create.SecurityGroupIDs,
			SubnetIds:        create.SubnetIDs,
		},
		RoleArn: create.RoleARN,
		Version: create.KubernetesVersion,
	}

	result, err := eksClient.CreateCluster(input)
	if err != nil {
		if aerr, ok := err.(awserr.Error); ok {
			switch aerr.Code() {
			case eks.ErrCodeResourceInUseException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeResourceInUseException, aerr.Error())
			case eks.ErrCodeResourceLimitExceededException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeResourceLimitExceededException, aerr.Error())
			case eks.ErrCodeInvalidParameterException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeInvalidParameterException, aerr.Error())
			case eks.ErrCodeClientException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeClientException, aerr.Error())
			case eks.ErrCodeServerException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeServerException, aerr.Error())
			case eks.ErrCodeServiceUnavailableException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeServiceUnavailableException, aerr.Error())
			case eks.ErrCodeUnsupportedAvailabilityZoneException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeUnsupportedAvailabilityZoneException, aerr.Error())
			default:
				logger.FromContext(c.Ctx).Error(aerr.Error())
			}
		} else {
			// Print the error, cast err to awserr.Error to get the Code and
			// Message from an error.
			logger.FromContext(c.Ctx).Error(err.Error())
		}
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(result.Cluster)
}

func handleGetEKS(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Refreshing EKS cluster")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	result, err := eksClient.DescribeCluster(&eks.DescribeClusterInput{
		Name: aws.String(clusterName),
	})

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to describe EKS cluster")
		w.WriteHeader(http.StatusInternalServerError)
	}

	json.NewEncoder(w).Encode(result.Cluster)
}

func handleGetEKSNodeGroups(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Refreshing EKS node groups")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	result, err := eksClient.ListNodegroups(&eks.ListNodegroupsInput{
		ClusterName: aws.String(clusterName),
	})

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list EKS node groups")
		w.WriteHeader(http.StatusInternalServerError)
	}

	var nodes []*eks.Nodegroup
	for _, nodeGroupName := range result.Nodegroups {
		describeNodeGroupInput := &eks.DescribeNodegroupInput{
			ClusterName:   aws.String(clusterName),
			NodegroupName: nodeGroupName,
		}

		nodeGroupResult, err := eksClient.DescribeNodegroup(describeNodeGroupInput)
		if err != nil {
			logger.FromContext(c.Ctx).WithError(err).Error("Failed to describe EKS node group")
			continue
		}

		nodes = append(nodes, nodeGroupResult.Nodegroup)
	}

	json.NewEncoder(w).Encode(nodes)
}

func handleCreateNodeGroup(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Creating EKS node group")

	vars := mux.Vars(r)
	clusterName := vars["name"]

	create, err := model.NewCreateNodeGroupRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse create EKS node group request")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	instanceTypes := []*string{&create.InstanceType}

	input := &eks.CreateNodegroupInput{
		ClusterName:   aws.String(clusterName),
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
				logger.FromContext(c.Ctx).Error(eks.ErrCodeResourceInUseException, aerr.Error())
			case eks.ErrCodeResourceLimitExceededException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeResourceLimitExceededException, aerr.Error())
			case eks.ErrCodeInvalidParameterException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeInvalidParameterException, aerr.Error())
			case eks.ErrCodeClientException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeClientException, aerr.Error())
			case eks.ErrCodeServerException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeServerException, aerr.Error())
			case eks.ErrCodeServiceUnavailableException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeServiceUnavailableException, aerr.Error())
			case eks.ErrCodeUnsupportedAvailabilityZoneException:
				logger.FromContext(c.Ctx).Error(eks.ErrCodeUnsupportedAvailabilityZoneException, aerr.Error())
			default:
				logger.FromContext(c.Ctx).Error(aerr.Error())
			}
		} else {
			// Print the error, cast err to awserr.Error to get
			logger.FromContext(c.Ctx).Error(err.Error())
		}
		w.WriteHeader(http.StatusInternalServerError)
	}

	json.NewEncoder(w).Encode(result.Nodegroup)
}

func handleGetEKSKubeConfig(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Getting EKS kubeconfig")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	result, err := eksClient.DescribeCluster(&eks.DescribeClusterInput{
		Name: aws.String(clusterName),
	})

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to describe EKS cluster")
		w.WriteHeader(http.StatusInternalServerError)
	}

	config, err := model.BuildHelmConfig(result.Cluster)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rawConfig, err := config.RawConfig()
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to get raw config")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	kubeconfigBytes, err := clientcmd.Write(rawConfig)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to write kubeconfig")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain") // Or appropriate content type

	w.Write(kubeconfigBytes)
}

func handleGetClusterNamespaces(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Getting EKS kubeconfig")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	result, err := eksClient.DescribeCluster(&eks.DescribeClusterInput{
		Name: aws.String(clusterName),
	})

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to describe EKS cluster")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	clientset, err := model.NewClientset(result.Cluster)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create clientset")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	namespaces, err := clientset.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list nodes")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(namespaces)

}

func handleDeployMattermostOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Getting EKS kubeconfig")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	result, err := eksClient.DescribeCluster(&eks.DescribeClusterInput{
		Name: aws.String(clusterName),
	})

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to describe EKS cluster")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	clientConfig, err := model.BuildHelmConfig(result.Cluster)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to build helm config")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	rawConfig, err := clientConfig.RawConfig()
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to get raw config")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	kubeconfigBytes, err := clientcmd.Write(rawConfig)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to write kubeconfig")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	restClientGetter, err := model.NewRESTClientGetter(string(kubeconfigBytes), "mattermost-operator")
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create rest client getter")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	settings := cli.New()
	actionConfig := new(action.Configuration)

	err = actionConfig.Init(restClientGetter, settings.Namespace(), "memory", log.Printf)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to init action config")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	installClient := action.NewInstall(actionConfig)

	installClient.Namespace = "mattermost-operator"
	installClient.ReleaseName = "mattermost-operator"
	installClient.CreateNamespace = true

	installClient.ChartPathOptions.RepoURL = "https://helm.mattermost.com"
	cp, err := installClient.ChartPathOptions.LocateChart("mattermost-operator", settings)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to locate chart")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	chartReq, err := loader.Load(cp)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to load chart")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	rel, err := installClient.Run(chartReq, nil)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to install mattermost operator")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if rel != nil {
		json.NewEncoder(w).Encode(rel)
	}

}
