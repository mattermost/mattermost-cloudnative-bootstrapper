package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/eks"
	"github.com/aws/aws-sdk-go/service/iam"
	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-cloud-dash/internal/logger"
	"github.com/mattermost/mattermost-cloud-dash/model"
	mmv1beta1 "github.com/mattermost/mattermost-operator/apis/mattermost/v1beta1"
	"helm.sh/helm/v3/pkg/chart/loader"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/clientcmd"
)

func initAWS(apiRouter *mux.Router, context *Context) {
	addContext := func(handler contextHandlerFunc) *contextHandler {
		return newContextHandler(context, handler)
	}

	awsRouter := apiRouter.PathPrefix("/aws").Subrouter()
	awsRouter.Handle("/set_credentials", addContext(handleSetAWSCredentials)).Methods(http.MethodPost)
	awsRouter.Handle("/eks_roles", addContext(handleListEKSRoles)).Methods(http.MethodGet)
	awsRouter.Handle("/eks_clusters", addContext(handleListEKSClusters)).Methods(http.MethodGet)
	awsRouter.Handle("/eks_create", addContext(handleCreateEKS)).Methods(http.MethodPost)

	clusterNameRouter := awsRouter.PathPrefix("/cluster/{name:[A-Za-z0-9_-]+}").Subrouter()
	clusterNameRouter.Handle("", addContext(handleGetEKS)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/nodegroups", addContext(handleGetEKSNodeGroups)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/nodegroups", addContext(handleCreateNodeGroup)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/kubeconfig", addContext(handleGetEKSKubeConfig)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/deploy_mattermost_operator", addContext(handleDeployMattermostOperator)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/deploy_nginx_operator", addContext(handleDeployNginxOperator)).Methods(http.MethodPost)
	clusterNameRouter.Handle("/namespaces", addContext(handleGetClusterNamespaces)).Methods(http.MethodGet)
	clusterNameRouter.Handle("/new_mm_workspace", addContext(handleCreateMattermostWorkspace)).Methods(http.MethodPost)
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
	awsCredentials := model.GetAWSCredentials()

	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String("us-east-1"), // Change to your preferred region
		Credentials: credentials.NewStaticCredentials(awsCredentials.AccessKeyID, awsCredentials.SecretAccessKey, ""),
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

// TODO: Support looking in different regions based on query param
func handleListEKSClusters(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	logger.FromContext(c.Ctx).Info("Listing EKS clusters")

	result, err := eksClient.ListClusters(&eks.ListClustersInput{})

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list EKS clusters")
		w.WriteHeader(http.StatusInternalServerError)
	}

	json.NewEncoder(w).Encode(result.Clusters)
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
		return
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

func handleDeployNginxOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	c.Ctx = logger.WithField(c.Ctx, "action", "deploy-ingress-nginx")
	c.Ctx = logger.WithNamespace(c.Ctx, "ingress-nginx")

	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	c.Ctx = logger.WithClusterName(c.Ctx, clusterName)

	installClient, settings, err := model.AuthenticatedHelmClient(c.Ctx, clusterName)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	installClient.Namespace = "ingress-nginx"
	installClient.ReleaseName = "ingress-nginx"
	installClient.CreateNamespace = true

	installClient.ChartPathOptions.RepoURL = "https://kubernetes.github.io/ingress-nginx"
	cp, err := installClient.ChartPathOptions.LocateChart("ingress-nginx", settings)
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
	} else {
		logger.FromContext(c.Ctx).Error("An unknown error has occurred")
		w.WriteHeader(http.StatusInternalServerError)
	}
}

func handleGetClusterNamespaces(c *Context, w http.ResponseWriter, r *http.Request) {
	eksClientStruct := model.NewEKSClient()
	eksClient := eksClientStruct.EKSClient
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" || clusterName == "undefined" {
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
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to list namespaces")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(namespaces.Items)

}

func handleCreateMattermostWorkspace(c *Context, w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clusterName := vars["name"]
	if clusterName == "" || clusterName == "undefined" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	create, err := model.NewCreateMattermostWorkspaceRequestFromReader(r.Body)
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to parse create mattermost workspace request")
		w.WriteHeader(http.StatusBadRequest)
		return

	}

	if !create.IsValid() {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	kubeClient, err := model.NewK8sClientClusterName(clusterName)
	// TODO: this logic starts in the AWS API because it needs to hit EKS to authenticate the kubeclient
	// Once we have the kubeClient, it's just kubernetes, so this should be refactored into its own package for re-use by other kubernetes flavours
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create clientset")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	namespace := &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:      create.InstallationName,
			Namespace: create.InstallationName,
		},
	}

	_, err = kubeClient.Clientset.CoreV1().Namespaces().Create(context.TODO(), namespace, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to create namespace")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// License Secret
	licenseSecret := &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "mattermost-license",
			Namespace: create.InstallationName, // Create the namespace if needed
		},
		Type: v1.SecretTypeOpaque,
		StringData: map[string]string{
			"license": create.License, // To be filled from request
		},
	}

	// Create the secret
	_, err = kubeClient.Clientset.CoreV1().Secrets(create.InstallationName).Create(context.TODO(), licenseSecret, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).Errorf("Error creating license secret:", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// TODO: Have the bootstrapper create the database and filestore secrets so the user can't shoot themselves in the foot with incorrect config

	databaseSecret := &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "database",
			Namespace: create.InstallationName,
		},
		Type: v1.SecretTypeOpaque,
		StringData: map[string]string{
			"DB_CONNECTION_CHECK_URL":           create.DBConnectionString,
			"DB_CONNECTION_STRING":              create.DBConnectionString,
			"MM_SQLSETTINGS_DATASOURCEREPLICAS": create.DBReplicasConnectionString, // Assuming read replicas for now
		},
	}

	// Create the database secret
	_, err = kubeClient.Clientset.CoreV1().Secrets(create.InstallationName).Create(context.TODO(), databaseSecret, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).Errorf("Error creating database secret:", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	filestoreSecret := &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "mattermost-s3",
			Namespace: create.InstallationName,
		},
		Type: v1.SecretTypeOpaque,
		StringData: map[string]string{
			"accesskey": create.S3AccessKey,
			"secretkey": create.S3SecretKey,
		},
	}

	// Create the filestore secret
	_, err = kubeClient.Clientset.CoreV1().Secrets(create.InstallationName).Create(context.TODO(), filestoreSecret, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).Errorf("Error creating filestore secret:", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	mattermostCRD := &mmv1beta1.Mattermost{
		ObjectMeta: metav1.ObjectMeta{
			Name:      create.InstallationName,
			Namespace: create.InstallationName,
		},
		Spec: mmv1beta1.MattermostSpec{
			Size:    create.Size,
			Version: create.Version,
			Ingress: &mmv1beta1.Ingress{
				Enabled: true,
				Host:    create.FullDomainName,
				Annotations: map[string]string{
					"kubernetes.io/ingress.class": "nginx",
				},
			},
			Database: mmv1beta1.Database{
				External: &mmv1beta1.ExternalDatabase{
					Secret: "database",
				},
			},
			FileStore: mmv1beta1.FileStore{
				External: &mmv1beta1.ExternalFileStore{
					URL:    "s3.amazonaws.com",
					Secret: "mattermost-s3",
					Bucket: create.InstallationName + "-bucket",
				},
			},
			LicenseSecret: "mattermost-license",
			MattermostEnv: []v1.EnvVar{
				{Name: "MM_FILESETTINGS_AMAZONS3SSE", Value: "true"},
				{Name: "MM_FILESETTINGS_AMAZONS3SSL", Value: "true"},
			},
		},
	}

	// Create the Mattermost CRD
	_, err = kubeClient.MattermostClientsetV1Beta.MattermostV1beta1().Mattermosts(create.InstallationName).Create(context.TODO(), mattermostCRD, metav1.CreateOptions{})
	if err != nil {
		logger.FromContext(c.Ctx).Errorf("Error creating Mattermost CRD:", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Write some response back to the client
	w.WriteHeader(http.StatusCreated)

}

func handleDeployMattermostOperator(c *Context, w http.ResponseWriter, r *http.Request) {
	logger.FromContext(c.Ctx).Info("Getting EKS kubeconfig")
	vars := mux.Vars(r)
	clusterName := vars["name"]

	if clusterName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	installClient, settings, err := model.AuthenticatedHelmClient(c.Ctx, clusterName)

	if err != nil {
		logger.FromContext(c.Ctx).WithError(err).Error("Failed to authenticate helm client")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

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
	} else {
		w.WriteHeader(http.StatusInternalServerError)
		logger.FromContext(c.Ctx).Error("An unknown error has occurred")
	}

}
